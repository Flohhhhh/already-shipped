import { jaccard } from "../proposals/fingerprint";
import { tokenize } from "../text/tokens";

export type IndexedEntry = {
  sourceId: string;
  summary: string;
  version: string;
  url: string;
  embedding?: number[] | null;
};

export type RankedEntry = IndexedEntry & {
  score: number;
  matchedBy: "embedding" | "lexical";
};

const EMBEDDING_MIN = 0.35;
const LEXICAL_MIN = 0.45;

export function cosine(
  left: readonly number[],
  right: readonly number[],
): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function topCandidates(
  post: { title: string; description: string },
  entries: readonly IndexedEntry[],
  queryEmbedding: readonly number[] | null,
  limit: number,
): RankedEntry[] {
  const useEmbeddings = Boolean(
    queryEmbedding &&
    entries.some((entry) => (entry.embedding?.length ?? 0) > 0),
  );
  const queryTokens = tokenize(`${post.title} ${post.description}`);
  const ranked: RankedEntry[] = [];
  for (const entry of entries) {
    if (
      useEmbeddings &&
      queryEmbedding &&
      entry.embedding &&
      entry.embedding.length > 0
    ) {
      const score = cosine(queryEmbedding, entry.embedding);
      if (score < EMBEDDING_MIN) continue;
      ranked.push({ ...entry, score, matchedBy: "embedding" });
      continue;
    }
    if (useEmbeddings) continue;
    if (queryTokens.length < 2) continue;
    const score = jaccard(queryTokens, tokenize(entry.summary));
    if (score < LEXICAL_MIN) continue;
    ranked.push({ ...entry, score, matchedBy: "lexical" });
  }
  ranked.sort((left, right) => right.score - left.score);
  return ranked.slice(0, limit);
}
