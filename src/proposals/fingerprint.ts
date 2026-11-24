import { tokenize } from "../text/tokens";

export const NEAR_DUPLICATE_THRESHOLD = 0.72;
const MIN_CHARS = 8;
const MAX_CHARS = 200;
const MIN_TOKENS = 2;

export type ProposalDraft =
  | {
      ok: true;
      text: string;
      normalizedKey: string;
      tokens: string[];
    }
  | { ok: false; error: string };

export function cleanProposalText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function draftProposal(input: string): ProposalDraft {
  const text = cleanProposalText(input);
  if (text.length < MIN_CHARS) {
    return { ok: false, error: "Say a little more about the feature." };
  }
  if (text.length > MAX_CHARS) {
    return { ok: false, error: "Keep the proposal under 200 characters." };
  }
  const tokens = tokenize(text).sort();
  if (tokens.length < MIN_TOKENS) {
    return { ok: false, error: "Say a little more about the feature." };
  }
  return { ok: true, text, normalizedKey: tokens.join(" "), tokens };
}

export function jaccard(
  left: readonly string[],
  right: readonly string[],
): number {
  const rightSet = new Set(right);
  let intersection = 0;
  for (const token of left) {
    if (rightSet.has(token)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size;
  if (union === 0) return 0;
  return intersection / union;
}

export function findNearDuplicate<
  T extends { id: string; tokens: readonly string[] },
>(tokens: readonly string[], existing: readonly T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const candidate of existing) {
    const score = jaccard(tokens, candidate.tokens);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best || bestScore < NEAR_DUPLICATE_THRESHOLD) return null;
  return best;
}
