import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export async function listByVoteCount(
  ctx: ReadCtx,
  limit: number,
): Promise<Doc<"proposals">[]> {
  return ctx.db
    .query("proposals")
    .withIndex("by_voteCount")
    .order("desc")
    .take(limit);
}

export async function listByCreatedAt(
  ctx: ReadCtx,
  limit: number,
): Promise<Doc<"proposals">[]> {
  return ctx.db
    .query("proposals")
    .withIndex("by_createdAt")
    .order("desc")
    .take(limit);
}

export async function findByNormalizedKey(
  ctx: ReadCtx,
  normalizedKey: string,
): Promise<Doc<"proposals"> | null> {
  return ctx.db
    .query("proposals")
    .withIndex("by_normalizedKey", (q) => q.eq("normalizedKey", normalizedKey))
    .unique();
}

export async function getProposal(
  ctx: ReadCtx,
  proposalId: Id<"proposals">,
): Promise<Doc<"proposals"> | null> {
  return ctx.db.get(proposalId);
}

export async function listTokenRows(
  ctx: ReadCtx,
  token: string,
  limit: number,
) {
  return ctx.db
    .query("proposalTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .take(limit);
}

export async function insertProposal(
  ctx: MutationCtx,
  value: {
    text: string;
    normalizedKey: string;
    voteCount: number;
    createdAt: number;
  },
): Promise<Id<"proposals">> {
  return ctx.db.insert("proposals", value);
}

export async function insertToken(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
  token: string,
): Promise<void> {
  await ctx.db.insert("proposalTokens", { proposalId, token });
}

export async function findVote(
  ctx: ReadCtx,
  proposalId: Id<"proposals">,
  voterKey: string,
) {
  return ctx.db
    .query("votes")
    .withIndex("by_proposal_and_voter", (q) =>
      q.eq("proposalId", proposalId).eq("voterKey", voterKey),
    )
    .unique();
}

export async function insertVote(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
  voterKey: string,
): Promise<void> {
  await ctx.db.insert("votes", { proposalId, voterKey });
}

export async function deleteVote(
  ctx: MutationCtx,
  voteId: Id<"votes">,
): Promise<void> {
  await ctx.db.delete(voteId);
}

export async function setVoteCount(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
  voteCount: number,
): Promise<void> {
  await ctx.db.patch(proposalId, { voteCount });
}
