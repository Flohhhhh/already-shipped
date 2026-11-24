import { getAuthUserId } from "@convex-dev/auth/server";

import {
  isAdminAccount,
  reopenAutoClose,
  resolveAutoCloseThreshold,
  shipmentOutcome,
  suggestPair,
} from "../../src/jobs/review";
import type { ShippedFeature } from "../../src/jobs/shipped";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  applyEnrichment,
  applyIngestedSource,
  markShipped,
  openPosts,
  pendingIngestedPosts,
  queueDuplicateSuggestions,
  setIngestedStatus,
  suppressShipped,
  topPosts,
} from "../posts/service";
import {
  findShipment,
  getShipment,
  insertDigest,
  insertReviewEvent,
  insertShipment,
  listCatalogNotes,
  listDigests,
  listShipmentsByStatus,
  readCursor,
  readUser,
  setShipmentStatus,
  upsertCatalogNote,
  writeCursor,
} from "./data";

export async function saveEnrichment(
  ctx: MutationCtx,
  postId: Id<"posts">,
  fields: { normalizedTitle: string; category: string },
  duplicateIds: readonly string[],
) {
  await applyEnrichment(ctx, postId, fields);
  await queueDuplicateSuggestions(ctx, postId, duplicateIds);
}

export async function postsAwaitingShip(ctx: QueryCtx) {
  return openPosts(ctx, 40);
}

export async function catalogOrEmpty(ctx: QueryCtx): Promise<ShippedFeature[]> {
  const notes = await listCatalogNotes(ctx, 200);
  return notes.map((note) => ({
    id: note.sourceId,
    title: note.title ?? note.summary,
    summary: note.summary,
    version: note.version,
    url: note.url ?? "",
  }));
}

export async function saveCatalogNotes(
  ctx: MutationCtx,
  notes: readonly {
    sourceId: string;
    summary: string;
    version: string;
    url?: string;
    title?: string;
    embedding?: number[];
  }[],
) {
  for (const note of notes) await upsertCatalogNote(ctx, note);
}

export async function themesFromPosts(ctx: QueryCtx) {
  return topPosts(ctx, 20);
}

export async function saveWeeklyDigest(
  ctx: MutationCtx,
  draft: { summary: string; themes: string[] },
) {
  await insertDigest(ctx, {
    createdAt: Date.now(),
    summary: draft.summary,
    themes: draft.themes,
  });
}

const CURSOR_NAME = "t3code-releases";

export async function changelogCursor(ctx: QueryCtx) {
  const row = await readCursor(ctx, CURSOR_NAME);
  return row?.releaseId ?? null;
}

export async function saveChangelogCursor(ctx: MutationCtx, releaseId: string) {
  await writeCursor(ctx, CURSOR_NAME, releaseId);
}

export async function namedCursor(ctx: QueryCtx, name: string) {
  const row = await readCursor(ctx, name);
  return row?.releaseId ?? null;
}

export async function saveNamedCursor(
  ctx: MutationCtx,
  name: string,
  value: string,
) {
  await writeCursor(ctx, name, value);
}

export async function applyShipment(
  ctx: MutationCtx,
  args: {
    postId: Id<"posts">;
    sourceId: string;
    url: string;
    version: string;
    title: string;
    summary: string;
    confidence: number;
    rationale: string;
    embeddingPassed: boolean;
  },
) {
  const existing = await findShipment(ctx, args.postId, args.sourceId);
  if (suggestPair(existing?.status ?? null) === "skip")
    return "skipped" as const;
  const outcome = shipmentOutcome(
    args.confidence,
    args.embeddingPassed,
    resolveAutoCloseThreshold(process.env.SHIPPED_AUTO_CLOSE_THRESHOLD),
  );
  if (outcome === "ignore") return "skipped" as const;
  if (outcome === "auto") {
    const shipped = await markShipped(ctx, args.postId, {
      version: args.version,
      url: args.url,
      kind: "auto",
      sourceId: args.sourceId,
    });
    if (!shipped) return "skipped" as const;
  }
  const suggestionId = await insertShipment(ctx, {
    postId: args.postId,
    sourceId: args.sourceId,
    url: args.url,
    version: args.version,
    title: args.title,
    summary: args.summary,
    confidence: args.confidence,
    rationale: args.rationale,
    status: outcome === "auto" ? "auto" : "pending",
    createdAt: Date.now(),
  });
  await insertReviewEvent(ctx, {
    suggestionId,
    postId: args.postId,
    sourceId: args.sourceId,
    action: outcome === "auto" ? "auto-closed" : "suggested",
    detail: args.rationale,
    createdAt: Date.now(),
  });
  return outcome;
}

export async function callerIsAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await readUser(ctx, userId);
  if (!user) return false;
  return isAdminAccount(user, {
    githubIds: process.env.ADMIN_GITHUB_IDS,
    discordIds: process.env.ADMIN_DISCORD_IDS,
    emails: process.env.ADMIN_EMAILS,
  });
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId || !(await callerIsAdmin(ctx)))
    throw new Error("That queue is limited to admins.");
  return userId;
}

function shipmentItem(row: {
  _id: Id<"shippedSuggestions">;
  postId: Id<"posts">;
  sourceId: string;
  url: string;
  version: string;
  title: string;
  summary: string;
  confidence: number;
  rationale: string;
  createdAt: number;
}) {
  return {
    id: row._id,
    postId: row.postId,
    sourceId: row.sourceId,
    url: row.url,
    version: row.version,
    title: row.title,
    summary: row.summary,
    confidence: row.confidence,
    rationale: row.rationale,
    createdAt: row.createdAt,
  };
}

export async function reviewQueue(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return {
      access: "signed-out" as const,
      pending: [],
      autoClosed: [],
      ingested: [],
    };
  }
  if (!(await callerIsAdmin(ctx))) {
    return {
      access: "forbidden" as const,
      pending: [],
      autoClosed: [],
      ingested: [],
    };
  }
  const pending = await listShipmentsByStatus(ctx, "pending", 30);
  const autoClosed = await listShipmentsByStatus(ctx, "auto", 20);
  return {
    access: "ok" as const,
    pending: pending.map(shipmentItem),
    autoClosed: autoClosed.map(shipmentItem),
    ingested: await pendingIngestedPosts(ctx),
  };
}

export async function confirmShipment(
  ctx: MutationCtx,
  suggestionId: Id<"shippedSuggestions">,
) {
  const actorId = await requireAdmin(ctx);
  const row = await getShipment(ctx, suggestionId);
  if (!row || row.status !== "pending")
    throw new Error("That suggestion is already reviewed.");
  await setShipmentStatus(ctx, row._id, "confirmed");
  await markShipped(ctx, row.postId, {
    version: row.version,
    url: row.url,
    kind: "confirmed",
    sourceId: row.sourceId,
  });
  await insertReviewEvent(ctx, {
    suggestionId: row._id,
    postId: row.postId,
    sourceId: row.sourceId,
    action: "confirmed",
    actorId,
    detail: row.rationale,
    createdAt: Date.now(),
  });
}

export async function dismissShipment(
  ctx: MutationCtx,
  suggestionId: Id<"shippedSuggestions">,
) {
  const actorId = await requireAdmin(ctx);
  const row = await getShipment(ctx, suggestionId);
  if (!row || row.status !== "pending")
    throw new Error("That suggestion is already reviewed.");
  await setShipmentStatus(ctx, row._id, "dismissed");
  await insertReviewEvent(ctx, {
    suggestionId: row._id,
    postId: row.postId,
    sourceId: row.sourceId,
    action: "dismissed",
    actorId,
    detail: "Dismissed",
    createdAt: Date.now(),
  });
}

export async function reopenShipment(
  ctx: MutationCtx,
  suggestionId: Id<"shippedSuggestions">,
) {
  const actorId = await requireAdmin(ctx);
  const row = await getShipment(ctx, suggestionId);
  if (!row) throw new Error("That suggestion is gone.");
  const decision = reopenAutoClose(row.status);
  if ("error" in decision) throw new Error(decision.error);
  await setShipmentStatus(ctx, row._id, "reopened");
  await suppressShipped(ctx, row.postId, row.sourceId);
  await insertReviewEvent(ctx, {
    suggestionId: row._id,
    postId: row.postId,
    sourceId: row.sourceId,
    action: "reopened",
    actorId,
    detail: "Reopened",
    createdAt: Date.now(),
  });
}

export async function recordIngest(
  ctx: MutationCtx,
  args: {
    sourceKey: string;
    kind: "github-issue" | "github-discussion" | "x";
    url: string;
    featureRequest: boolean;
    title: string;
    description: string;
  },
) {
  return applyIngestedSource(ctx, args);
}

export async function reviewIngested(
  ctx: MutationCtx,
  postId: Id<"posts">,
  status: "approved" | "rejected",
) {
  await requireAdmin(ctx);
  await setIngestedStatus(ctx, postId, status);
}

export async function recentDigests(ctx: QueryCtx) {
  const rows = await listDigests(ctx, 12);
  return rows.map((row) => ({
    id: row._id,
    createdAt: row.createdAt,
    summary: row.summary,
    themes: row.themes,
  }));
}
