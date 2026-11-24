import { ingestPlan } from "../../src/jobs/ingest";
import type { IngestKind } from "../../src/jobs/ingest";
import { findNearDuplicate } from "../../src/proposals/fingerprint";
import { cleanPostText, draftPost } from "../../src/posts/draft";
import { rankPosts } from "../../src/posts/rank";
import { tokenize } from "../../src/text/tokens";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { pendingShipmentForPost } from "../jobs/data";
import {
  deleteVote,
  findByNormalizedKey,
  findPostSource,
  findVote,
  getMerge,
  getPost,
  insertMerge,
  insertPost,
  insertPostSource,
  insertToken,
  insertVote,
  listPendingIngested,
  listPostSources,
  listByCreatedAt,
  listByVoteCount,
  listMergeRows,
  listTokenRows,
  normalizePostId,
  patchPostDetails,
  setMergeStatus,
  setVoteCount,
} from "./data";

const LIST_LIMIT = 50;

export type PostListItem = {
  id: Id<"posts">;
  title: string;
  description: string;
  normalizedTitle: string | null;
  category: string | null;
  shippedIn: string | null;
  shippedUrl: string | null;
  shippedKind: "auto" | "confirmed" | null;
  shippedSuppressed: boolean;
  pendingShipment: { version: string; url: string; title: string } | null;
  sources: { kind: IngestKind; url: string }[];
  voteCount: number;
  createdAt: number;
  voted: boolean;
};

function toListItem(
  row: {
    _id: Id<"posts">;
    title: string;
    description: string;
    normalizedTitle?: string;
    category?: string;
    shippedIn?: string;
    shippedUrl?: string;
    shippedKind?: "auto" | "confirmed";
    shippedSuppressed?: boolean;
    voteCount: number;
    createdAt: number;
  },
  voted: boolean,
  pending: { version: string; url: string; title: string } | null,
  sources: { kind: IngestKind; url: string }[],
): PostListItem {
  return {
    id: row._id,
    title: row.title,
    description: row.description,
    normalizedTitle: row.normalizedTitle ?? null,
    category: row.category ?? null,
    shippedIn: row.shippedIn ?? null,
    shippedUrl: row.shippedUrl ?? null,
    shippedKind: row.shippedKind ?? null,
    shippedSuppressed: row.shippedSuppressed === true,
    pendingShipment: pending,
    sources,
    voteCount: row.voteCount,
    createdAt: row.createdAt,
    voted,
  };
}

function isListed(post: {
  ingestedStatus?: "pending" | "approved" | "rejected";
}) {
  return (
    post.ingestedStatus !== "pending" && post.ingestedStatus !== "rejected"
  );
}

async function sourceLinks(ctx: QueryCtx | MutationCtx, postId: Id<"posts">) {
  const rows = await listPostSources(ctx, postId);
  return rows
    .filter((row) => row.status !== "ignored" && row.url.length > 0)
    .map((row) => ({ kind: row.kind, url: row.url }));
}

function requireUser(userId: Id<"users"> | null): Id<"users"> {
  if (!userId) throw new Error("Sign in to do that.");
  return userId;
}

export async function listPosts(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  order: "top" | "new",
): Promise<PostListItem[]> {
  const rows =
    order === "new"
      ? await listByCreatedAt(ctx, LIST_LIMIT + 30)
      : await listByVoteCount(ctx, LIST_LIMIT + 30);
  const items: PostListItem[] = [];
  for (const row of rows) {
    if (!isListed(row)) continue;
    const vote = userId ? await findVote(ctx, row._id, userId) : null;
    const pending = await pendingShipmentForPost(ctx, row._id);
    items.push(
      toListItem(
        row,
        vote !== null,
        pending
          ? { version: pending.version, url: pending.url, title: pending.title }
          : null,
        await sourceLinks(ctx, row._id),
      ),
    );
    if (items.length >= LIST_LIMIT) break;
  }
  return items;
}

export async function readPost(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  postId: string,
): Promise<PostListItem | null> {
  const id = normalizePostId(ctx, postId);
  if (!id) return null;
  const row = await getPost(ctx, id);
  if (!row || !isListed(row)) return null;
  const vote = userId ? await findVote(ctx, row._id, userId) : null;
  const pending = await pendingShipmentForPost(ctx, row._id);
  return toListItem(
    row,
    vote !== null,
    pending
      ? { version: pending.version, url: pending.url, title: pending.title }
      : null,
    await sourceLinks(ctx, row._id),
  );
}

async function loadCandidates(
  ctx: QueryCtx | MutationCtx,
  tokens: readonly string[],
  normalizedKey: string,
  includeUnlisted = false,
) {
  const ids = new Set<Id<"posts">>();
  const exact = await findByNormalizedKey(ctx, normalizedKey);
  if (exact) ids.add(exact._id);
  for (const token of tokens.slice(0, 8)) {
    const rows = await listTokenRows(ctx, token, 20);
    for (const row of rows) ids.add(row.postId);
    if (ids.size >= 40) break;
  }
  const candidates = [];
  for (const id of ids) {
    const post = await getPost(ctx, id);
    if (!post || (!includeUnlisted && !isListed(post))) continue;
    candidates.push({
      id: post._id,
      title: post.title,
      description: post.description,
      tokens: post.normalizedKey.split(" ").filter(Boolean),
      post,
    });
  }
  return candidates;
}

export async function similarPosts(
  ctx: QueryCtx,
  title: string,
  description: string,
) {
  const tokens = tokenize(
    `${cleanPostText(title)} ${cleanPostText(description)}`,
  ).sort();
  if (tokens.length < 2) return [];
  const draft = draftPost(title, description);
  const candidates = await loadCandidates(
    ctx,
    tokens,
    draft.ok ? draft.normalizedKey : tokens.join(" "),
  );
  return rankPosts(
    `${title} ${description}`,
    candidates.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      description: candidate.description,
    })),
  ).map((match) => {
    const source = candidates.find((candidate) => candidate.id === match.id);
    return {
      id: match.id,
      title: match.title,
      description: match.description,
      voteCount: source?.post.voteCount ?? 0,
    };
  });
}

async function supportExisting(
  ctx: MutationCtx,
  postId: Id<"posts">,
  userId: Id<"users">,
  voteCount: number,
) {
  const existingVote = await findVote(ctx, postId, userId);
  if (!existingVote) {
    await insertVote(ctx, postId, userId);
    await setVoteCount(ctx, postId, voteCount + 1);
  }
  return { id: postId, created: false as const, duplicate: true };
}

export async function createPost(
  ctx: MutationCtx,
  args: { title: string; description: string; userId: Id<"users"> | null },
) {
  const userId = requireUser(args.userId);
  const draft = draftPost(args.title, args.description);
  if (!draft.ok) throw new Error(draft.error);
  const candidates = await loadCandidates(
    ctx,
    draft.tokens,
    draft.normalizedKey,
  );
  const duplicate = findNearDuplicate(draft.tokens, candidates);
  if (duplicate)
    return supportExisting(ctx, duplicate.id, userId, duplicate.post.voteCount);
  const id = await insertPost(ctx, {
    title: draft.title,
    description: draft.description,
    normalizedKey: draft.normalizedKey,
    voteCount: 1,
    createdAt: Date.now(),
    authorId: userId,
  });
  for (const token of draft.tokens) await insertToken(ctx, id, token);
  await insertVote(ctx, id, userId);
  return { id, created: true as const, duplicate: false };
}

export async function toggleVote(
  ctx: MutationCtx,
  args: { postId: Id<"posts">; userId: Id<"users"> | null; next: boolean },
) {
  const userId = requireUser(args.userId);
  const post = await getPost(ctx, args.postId);
  if (!post) throw new Error("That suggestion is gone.");
  const existing = await findVote(ctx, post._id, userId);
  if (args.next && !existing) {
    await insertVote(ctx, post._id, userId);
    const voteCount = post.voteCount + 1;
    await setVoteCount(ctx, post._id, voteCount);
    return { voteCount, voted: true };
  }
  if (!args.next && existing) {
    await deleteVote(ctx, existing._id);
    const voteCount = Math.max(0, post.voteCount - 1);
    await setVoteCount(ctx, post._id, voteCount);
    return { voteCount, voted: false };
  }
  return { voteCount: post.voteCount, voted: existing !== null };
}

export async function listMerges(ctx: QueryCtx, postId: string) {
  const id = normalizePostId(ctx, postId);
  if (!id) return [];
  const rows = await listMergeRows(ctx, id);
  const items = [];
  for (const row of rows) {
    const other = await getPost(ctx, row.otherPostId);
    if (!other) continue;
    items.push({
      id: row._id,
      otherPostId: other._id,
      otherTitle: other.normalizedTitle ?? other.title,
      status: row.status,
    });
  }
  return items;
}

export async function respondToMerge(
  ctx: MutationCtx,
  args: {
    suggestionId: Id<"mergeSuggestions">;
    status: "confirmed" | "dismissed";
    userId: Id<"users"> | null;
  },
) {
  requireUser(args.userId);
  const row = await getMerge(ctx, args.suggestionId);
  if (!row || row.status !== "pending")
    throw new Error("That suggestion is gone.");
  await setMergeStatus(ctx, row._id, args.status);
  return { status: args.status };
}

export async function applyEnrichment(
  ctx: MutationCtx,
  postId: Id<"posts">,
  fields: { normalizedTitle: string; category: string },
) {
  const post = await getPost(ctx, postId);
  if (!post) return;
  await patchPostDetails(ctx, postId, fields);
}

export async function queueDuplicateSuggestions(
  ctx: MutationCtx,
  postId: Id<"posts">,
  otherIds: readonly string[],
) {
  const existing = await listMergeRows(ctx, postId);
  const known = new Set(existing.map((row) => row.otherPostId));
  for (const raw of otherIds) {
    if (raw === postId) continue;
    const otherId = normalizePostId(ctx, raw);
    if (!otherId || otherId === postId || known.has(otherId)) continue;
    const other = await getPost(ctx, otherId);
    if (!other) continue;
    await insertMerge(ctx, postId, otherId, Date.now());
    known.add(otherId);
  }
}

export async function applyIngestedSource(
  ctx: MutationCtx,
  args: {
    sourceKey: string;
    kind: IngestKind;
    url: string;
    featureRequest: boolean;
    title: string;
    description: string;
  },
) {
  const seen = await findPostSource(ctx, args.sourceKey);
  if (!args.featureRequest) {
    const plan = ingestPlan(seen !== null, null);
    if (plan === "skip") return "skip" as const;
    await insertPostSource(ctx, {
      sourceKey: args.sourceKey,
      kind: args.kind,
      url: args.url,
      status: "ignored",
      createdAt: Date.now(),
    });
    return "ignored" as const;
  }
  const draft = draftPost(args.title, args.description);
  if (!draft.ok) return "invalid" as const;
  const candidates = await loadCandidates(
    ctx,
    draft.tokens,
    draft.normalizedKey,
    true,
  );
  const duplicate = findNearDuplicate(draft.tokens, candidates);
  const plan = ingestPlan(
    seen !== null,
    duplicate ? String(duplicate.id) : null,
  );
  if (plan === "skip") return "skip" as const;
  if (plan === "link" && duplicate) {
    await insertPostSource(ctx, {
      sourceKey: args.sourceKey,
      kind: args.kind,
      url: args.url,
      status: "linked",
      postId: duplicate.id,
      createdAt: Date.now(),
    });
    await setVoteCount(ctx, duplicate.id, duplicate.post.voteCount + 1);
    return "link" as const;
  }
  const id = await insertPost(ctx, {
    title: draft.title,
    description: draft.description,
    normalizedKey: draft.normalizedKey,
    voteCount: 1,
    createdAt: Date.now(),
    ingestedStatus: "pending",
  });
  for (const token of draft.tokens) await insertToken(ctx, id, token);
  await insertPostSource(ctx, {
    sourceKey: args.sourceKey,
    kind: args.kind,
    url: args.url,
    status: "created",
    postId: id,
    createdAt: Date.now(),
  });
  return "create" as const;
}

export async function setIngestedStatus(
  ctx: MutationCtx,
  postId: Id<"posts">,
  status: "approved" | "rejected",
) {
  const post = await getPost(ctx, postId);
  if (!post || post.ingestedStatus !== "pending") {
    throw new Error("That request is already reviewed.");
  }
  await patchPostDetails(ctx, postId, { ingestedStatus: status });
}

export async function pendingIngestedPosts(ctx: QueryCtx) {
  const rows = await listPendingIngested(ctx, 30);
  const items = [];
  for (const row of rows) {
    const sources = await sourceLinks(ctx, row._id);
    items.push({
      id: row._id,
      title: row.title,
      description: row.description,
      url: sources[0]?.url ?? "",
      kind: sources[0]?.kind ?? ("github-issue" as const),
    });
  }
  return items;
}

export async function markShipped(
  ctx: MutationCtx,
  postId: Id<"posts">,
  fields: {
    version: string;
    url: string;
    kind: "auto" | "confirmed";
    sourceId: string;
  },
) {
  const post = await getPost(ctx, postId);
  if (!post) return false;
  if (post.shippedIn && !post.shippedSuppressed) return false;
  await patchPostDetails(ctx, postId, {
    shippedIn: fields.version,
    shippedUrl: fields.url,
    shippedKind: fields.kind,
    shippedSourceId: fields.sourceId,
    shippedSuppressed: false,
  });
  return true;
}

export async function suppressShipped(
  ctx: MutationCtx,
  postId: Id<"posts">,
  sourceId: string,
) {
  const post = await getPost(ctx, postId);
  if (!post || post.shippedSourceId !== sourceId) return;
  await patchPostDetails(ctx, postId, { shippedSuppressed: true });
}

export async function openPosts(ctx: QueryCtx, limit: number) {
  const rows = await listByCreatedAt(ctx, limit);
  return rows
    .filter(
      (row) =>
        isListed(row) &&
        (row.shippedIn === undefined || row.shippedSuppressed === true),
    )
    .map((row) => ({
      id: row._id,
      title: row.title,
      description: row.description,
    }));
}

export async function topPosts(ctx: QueryCtx, limit: number) {
  const rows = await listByVoteCount(ctx, limit);
  return rows
    .filter((row) => isListed(row))
    .map((row) => ({
      id: row._id,
      title: row.normalizedTitle ?? row.title,
      description: row.description,
      voteCount: row.voteCount,
      category: row.category ?? null,
    }));
}
