import {
  draftProposal,
  findNearDuplicate,
} from "../../src/proposals/fingerprint";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  deleteVote,
  findByNormalizedKey,
  findVote,
  getProposal,
  insertProposal,
  insertToken,
  insertVote,
  listByCreatedAt,
  listByVoteCount,
  listTokenRows,
  setVoteCount,
} from "./data";

const VOTER_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_LIMIT = 50;

export type ProposalListItem = {
  id: Id<"proposals">;
  text: string;
  voteCount: number;
  createdAt: number;
  voted: boolean;
};

function voterKeyOrThrow(voterKey: string): string {
  const key = voterKey.trim().toLowerCase();
  if (!VOTER_KEY.test(key)) throw new Error("A voter key is required.");
  return key;
}

export async function listProposals(
  ctx: QueryCtx,
  voterKey: string | undefined,
  order: "top" | "new" = "top",
): Promise<ProposalListItem[]> {
  const key =
    voterKey && VOTER_KEY.test(voterKey.trim().toLowerCase())
      ? voterKey.trim().toLowerCase()
      : undefined;
  const rows =
    order === "new"
      ? await listByCreatedAt(ctx, LIST_LIMIT)
      : await listByVoteCount(ctx, LIST_LIMIT);
  const items: ProposalListItem[] = [];
  for (const row of rows) {
    const vote = key ? await findVote(ctx, row._id, key) : null;
    items.push({
      id: row._id,
      text: row.text,
      voteCount: row.voteCount,
      createdAt: row.createdAt,
      voted: vote !== null,
    });
  }
  return items;
}

async function loadCandidates(
  ctx: MutationCtx,
  tokens: readonly string[],
  normalizedKey: string,
) {
  const ids = new Set<Id<"proposals">>();
  const exact = await findByNormalizedKey(ctx, normalizedKey);
  if (exact) ids.add(exact._id);
  for (const token of tokens.slice(0, 8)) {
    const rows = await listTokenRows(ctx, token, 20);
    for (const row of rows) ids.add(row.proposalId);
    if (ids.size >= 40) break;
  }
  const candidates = [];
  for (const id of ids) {
    const proposal = await getProposal(ctx, id);
    if (!proposal) continue;
    candidates.push({
      id: proposal._id,
      tokens: proposal.normalizedKey.split(" ").filter(Boolean),
      proposal,
    });
  }
  return candidates;
}

export async function proposeFeature(
  ctx: MutationCtx,
  args: { text: string; voterKey: string },
): Promise<{ id: Id<"proposals">; created: boolean; duplicate: boolean }> {
  const voterKey = voterKeyOrThrow(args.voterKey);
  const draft = draftProposal(args.text);
  if (!draft.ok) throw new Error(draft.error);
  const candidates = await loadCandidates(
    ctx,
    draft.tokens,
    draft.normalizedKey,
  );
  const duplicate = findNearDuplicate(draft.tokens, candidates);
  if (duplicate) {
    const existingVote = await findVote(ctx, duplicate.id, voterKey);
    if (!existingVote) {
      await insertVote(ctx, duplicate.id, voterKey);
      await setVoteCount(ctx, duplicate.id, duplicate.proposal.voteCount + 1);
    }
    return { id: duplicate.id, created: false, duplicate: true };
  }
  const id = await insertProposal(ctx, {
    text: draft.text,
    normalizedKey: draft.normalizedKey,
    voteCount: 1,
    createdAt: Date.now(),
  });
  for (const token of draft.tokens) await insertToken(ctx, id, token);
  await insertVote(ctx, id, voterKey);
  return { id, created: true, duplicate: false };
}

export async function toggleVote(
  ctx: MutationCtx,
  args: { proposalId: Id<"proposals">; voterKey: string; next: boolean },
): Promise<{ voteCount: number; voted: boolean }> {
  const voterKey = voterKeyOrThrow(args.voterKey);
  const proposal = await getProposal(ctx, args.proposalId);
  if (!proposal) throw new Error("That proposal is gone.");
  const existing = await findVote(ctx, proposal._id, voterKey);
  if (args.next && !existing) {
    await insertVote(ctx, proposal._id, voterKey);
    const voteCount = proposal.voteCount + 1;
    await setVoteCount(ctx, proposal._id, voteCount);
    return { voteCount, voted: true };
  }
  if (!args.next && existing) {
    await deleteVote(ctx, existing._id);
    const voteCount = Math.max(0, proposal.voteCount - 1);
    await setVoteCount(ctx, proposal._id, voteCount);
    return { voteCount, voted: false };
  }
  return { voteCount: proposal.voteCount, voted: existing !== null };
}
