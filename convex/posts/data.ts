import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export async function listByVoteCount(
  ctx: ReadCtx,
  limit: number,
): Promise<Doc<"posts">[]> {
  return ctx.db
    .query("posts")
    .withIndex("by_voteCount")
    .order("desc")
    .take(limit);
}

export async function listByCreatedAt(
  ctx: ReadCtx,
  limit: number,
): Promise<Doc<"posts">[]> {
  return ctx.db
    .query("posts")
    .withIndex("by_createdAt")
    .order("desc")
    .take(limit);
}

export function normalizePostId(ctx: ReadCtx, value: string) {
  return ctx.db.normalizeId("posts", value);
}

export async function getPost(
  ctx: ReadCtx,
  postId: Id<"posts">,
): Promise<Doc<"posts"> | null> {
  return ctx.db.get(postId);
}

export async function findByNormalizedKey(
  ctx: ReadCtx,
  normalizedKey: string,
): Promise<Doc<"posts"> | null> {
  return ctx.db
    .query("posts")
    .withIndex("by_normalizedKey", (q) => q.eq("normalizedKey", normalizedKey))
    .unique();
}

export async function listTokenRows(
  ctx: ReadCtx,
  token: string,
  limit: number,
) {
  return ctx.db
    .query("postTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .take(limit);
}

export async function insertPost(
  ctx: MutationCtx,
  post: {
    title: string;
    description: string;
    normalizedKey: string;
    voteCount: number;
    createdAt: number;
    authorId?: Id<"users">;
    ingestedStatus?: "pending" | "approved" | "rejected";
  },
): Promise<Id<"posts">> {
  return ctx.db.insert("posts", post);
}

export async function insertToken(
  ctx: MutationCtx,
  postId: Id<"posts">,
  token: string,
) {
  await ctx.db.insert("postTokens", { postId, token });
}

export async function findVote(
  ctx: ReadCtx,
  postId: Id<"posts">,
  userId: Id<"users">,
) {
  return ctx.db
    .query("votes")
    .withIndex("by_post_and_user", (q) =>
      q.eq("postId", postId).eq("userId", userId),
    )
    .unique();
}

export async function insertVote(
  ctx: MutationCtx,
  postId: Id<"posts">,
  userId: Id<"users">,
) {
  await ctx.db.insert("votes", { postId, userId });
}

export async function deleteVote(ctx: MutationCtx, voteId: Id<"votes">) {
  await ctx.db.delete(voteId);
}

export async function setVoteCount(
  ctx: MutationCtx,
  postId: Id<"posts">,
  voteCount: number,
) {
  await ctx.db.patch(postId, { voteCount });
}

export async function patchPostDetails(
  ctx: MutationCtx,
  postId: Id<"posts">,
  fields: {
    normalizedTitle?: string;
    category?: string;
    shippedIn?: string;
    shippedUrl?: string;
    shippedKind?: "auto" | "confirmed";
    shippedSourceId?: string;
    shippedSuppressed?: boolean;
    ingestedStatus?: "pending" | "approved" | "rejected";
  },
) {
  await ctx.db.patch(postId, fields);
}

export async function listMergeRows(ctx: ReadCtx, postId: Id<"posts">) {
  return ctx.db
    .query("mergeSuggestions")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .take(8);
}

export async function getMerge(
  ctx: ReadCtx,
  suggestionId: Id<"mergeSuggestions">,
) {
  return ctx.db.get(suggestionId);
}

export async function insertMerge(
  ctx: MutationCtx,
  postId: Id<"posts">,
  otherPostId: Id<"posts">,
  createdAt: number,
) {
  await ctx.db.insert("mergeSuggestions", {
    postId,
    otherPostId,
    status: "pending",
    createdAt,
  });
}

export async function listPendingIngested(ctx: ReadCtx, limit: number) {
  return ctx.db
    .query("posts")
    .withIndex("by_ingestedStatus", (q) => q.eq("ingestedStatus", "pending"))
    .take(limit);
}

export async function findPostSource(ctx: ReadCtx, sourceKey: string) {
  return ctx.db
    .query("postSources")
    .withIndex("by_sourceKey", (q) => q.eq("sourceKey", sourceKey))
    .unique();
}

export async function listPostSources(ctx: ReadCtx, postId: Id<"posts">) {
  return ctx.db
    .query("postSources")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .take(5);
}

export async function insertPostSource(
  ctx: MutationCtx,
  source: {
    sourceKey: string;
    kind: "github-issue" | "github-discussion" | "x";
    url: string;
    status: "linked" | "created" | "ignored";
    postId?: Id<"posts">;
    createdAt: number;
  },
) {
  await ctx.db.insert("postSources", source);
}

export async function setMergeStatus(
  ctx: MutationCtx,
  suggestionId: Id<"mergeSuggestions">,
  status: "confirmed" | "dismissed",
) {
  await ctx.db.patch(suggestionId, { status });
}
