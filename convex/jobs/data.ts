import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export async function listCatalogNotes(ctx: ReadCtx, limit: number) {
  return ctx.db.query("catalogNotes").take(limit);
}

export async function upsertCatalogNote(
  ctx: MutationCtx,
  note: {
    sourceId: string;
    summary: string;
    version: string;
    url?: string;
    title?: string;
    embedding?: number[];
  },
) {
  const existing = await ctx.db
    .query("catalogNotes")
    .withIndex("by_source", (q) => q.eq("sourceId", note.sourceId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      summary: note.summary,
      version: note.version,
      ...(note.url ? { url: note.url } : {}),
      ...(note.title ? { title: note.title } : {}),
      ...(note.embedding ? { embedding: note.embedding } : {}),
    });
    return;
  }
  await ctx.db.insert("catalogNotes", note);
}

export async function readCursor(ctx: ReadCtx, name: string) {
  return ctx.db
    .query("syncCursors")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
}

export async function writeCursor(
  ctx: MutationCtx,
  name: string,
  releaseId: string,
) {
  const existing = await readCursor(ctx, name);
  if (existing) {
    await ctx.db.patch(existing._id, { releaseId, updatedAt: Date.now() });
    return;
  }
  await ctx.db.insert("syncCursors", {
    name,
    releaseId,
    updatedAt: Date.now(),
  });
}

export async function getShipment(
  ctx: ReadCtx,
  suggestionId: Id<"shippedSuggestions">,
) {
  return ctx.db.get(suggestionId);
}

export async function findShipment(
  ctx: ReadCtx,
  postId: Id<"posts">,
  sourceId: string,
) {
  return ctx.db
    .query("shippedSuggestions")
    .withIndex("by_post_and_source", (q) =>
      q.eq("postId", postId).eq("sourceId", sourceId),
    )
    .unique();
}

export async function insertShipment(
  ctx: MutationCtx,
  suggestion: {
    postId: Id<"posts">;
    sourceId: string;
    url: string;
    version: string;
    title: string;
    summary: string;
    confidence: number;
    rationale: string;
    status: "pending" | "auto";
    createdAt: number;
  },
) {
  return ctx.db.insert("shippedSuggestions", suggestion);
}

export async function setShipmentStatus(
  ctx: MutationCtx,
  suggestionId: Id<"shippedSuggestions">,
  status: "pending" | "confirmed" | "dismissed" | "auto" | "reopened",
) {
  await ctx.db.patch(suggestionId, { status });
}

export async function listShipmentsByStatus(
  ctx: ReadCtx,
  status: "pending" | "auto",
  limit: number,
) {
  return ctx.db
    .query("shippedSuggestions")
    .withIndex("by_status", (q) => q.eq("status", status))
    .order("desc")
    .take(limit);
}

export async function pendingShipmentForPost(
  ctx: ReadCtx,
  postId: Id<"posts">,
) {
  const rows = await ctx.db
    .query("shippedSuggestions")
    .withIndex("by_post", (q) => q.eq("postId", postId))
    .take(8);
  return rows.find((row) => row.status === "pending") ?? null;
}

export async function insertReviewEvent(
  ctx: MutationCtx,
  event: {
    suggestionId?: Id<"shippedSuggestions">;
    postId: Id<"posts">;
    sourceId: string;
    action:
      "suggested" | "confirmed" | "dismissed" | "auto-closed" | "reopened";
    actorId?: Id<"users">;
    detail: string;
    createdAt: number;
  },
) {
  await ctx.db.insert("reviewEvents", event);
}

export async function readUser(ctx: ReadCtx, userId: Id<"users">) {
  return ctx.db.get(userId);
}

export async function insertDigest(
  ctx: MutationCtx,
  digest: { createdAt: number; summary: string; themes: string[] },
) {
  return ctx.db.insert("digests", digest);
}

export async function listDigests(ctx: ReadCtx, limit: number) {
  return ctx.db
    .query("digests")
    .withIndex("by_createdAt")
    .order("desc")
    .take(limit);
}

export type CatalogNoteId = Id<"catalogNotes">;
