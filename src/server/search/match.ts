import { editDistance, orderedTokens, tokenize } from "@/text/tokens";
import type {
  FeatureEntry,
  FeatureMatch,
  SearchResult,
} from "@/server/search/types";

const FIELD_WEIGHT = {
  title: 10,
  terms: 4,
  where: 3,
  summary: 2,
} as const;

const BIGRAM_BONUS = 8;
const MIN_SCORE = 10;
const MIN_COVERAGE = 0.5;

type FieldName = keyof typeof FIELD_WEIGHT;

type PreparedEntry = {
  entry: FeatureEntry;
  fields: Record<FieldName, string[]>;
  titleOrder: string[];
};

function unique(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

function prepare(entry: FeatureEntry): PreparedEntry {
  return {
    entry,
    fields: {
      title: unique(tokenize(entry.title)),
      terms: unique(tokenize(entry.terms.join(" "))),
      where: unique(tokenize(entry.where)),
      summary: unique(tokenize(entry.summary)),
    },
    titleOrder: orderedTokens(entry.title),
  };
}

function fuzzyField(
  token: string,
  fields: PreparedEntry["fields"],
): FieldName | null {
  if (token.length < 5) return null;
  let best: { field: FieldName; weight: number } | null = null;
  for (const field of Object.keys(FIELD_WEIGHT) as FieldName[]) {
    for (const candidate of fields[field]) {
      if (candidate.length < 5) continue;
      if (editDistance(token, candidate) !== 1) continue;
      const weight = FIELD_WEIGHT[field];
      if (!best || weight > best.weight) best = { field, weight };
    }
  }
  return best?.field ?? null;
}

function hasOrderedPair(
  sequence: readonly string[],
  first: string,
  second: string,
): boolean {
  const start = sequence.indexOf(first);
  if (start < 0) return false;
  return sequence.indexOf(second, start + 1) >= 0;
}

export function scoreEntry(
  query: string,
  entry: FeatureEntry,
): FeatureMatch | null {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;
  const prepared = prepare(entry);
  let score = 0;
  let matched = 0;
  for (const token of queryTokens) {
    let field: FieldName | null = null;
    for (const name of Object.keys(FIELD_WEIGHT) as FieldName[]) {
      if (prepared.fields[name].includes(token)) {
        field = name;
        break;
      }
    }
    const fuzzy = field ? false : true;
    if (!field) field = fuzzyField(token, prepared.fields);
    if (!field) continue;
    matched += 1;
    const weight =
      FIELD_WEIGHT[field] *
      (fuzzy && !prepared.fields[field].includes(token) ? 0.5 : 1);
    score += weight;
  }
  const coverage = matched / queryTokens.length;
  if (coverage < MIN_COVERAGE || score < MIN_SCORE) return null;
  const queryOrder = orderedTokens(query);
  for (let index = 0; index < queryOrder.length - 1; index += 1) {
    const first = queryOrder[index];
    const second = queryOrder[index + 1];
    if (!first || !second) continue;
    if (hasOrderedPair(prepared.titleOrder, first, second))
      score += BIGRAM_BONUS;
  }
  return { entry, score, coverage };
}

const KIND_RANK: Record<FeatureEntry["kind"], number> = {
  setting: 0,
  doc: 1,
  release: 2,
};

function compareMatches(left: FeatureMatch, right: FeatureMatch): number {
  if (right.score !== left.score) return right.score - left.score;
  if (left.entry.kind !== right.entry.kind) {
    return KIND_RANK[left.entry.kind] - KIND_RANK[right.entry.kind];
  }
  return left.entry.title.length - right.entry.title.length;
}

export function searchFeatures(
  query: string,
  entries: readonly FeatureEntry[],
): SearchResult {
  const matches = entries
    .map((entry) => scoreEntry(query, entry))
    .filter((match): match is FeatureMatch => match !== null)
    .sort(compareMatches);
  const best = matches[0] ?? null;
  if (!best) return { query, best: null, alternatives: [], matcher: "lexical" };
  const alternatives = matches
    .slice(1)
    .filter((match) => match.score >= best.score * 0.72)
    .slice(0, 3);
  return { query, best, alternatives, matcher: "lexical" };
}

export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function searchWithVectors(
  query: string,
  entries: readonly FeatureEntry[],
  vectors: Readonly<Record<string, readonly number[]>>,
  queryVector: readonly number[],
): SearchResult {
  const lexical = new Map<string, FeatureMatch>();
  for (const entry of entries) {
    const match = scoreEntry(query, entry);
    if (match) lexical.set(entry.id, match);
  }
  const matches: FeatureMatch[] = [];
  for (const entry of entries) {
    const lexicalScore = lexical.get(entry.id)?.score ?? 0;
    const vector = vectors[entry.id];
    const cosine = vector
      ? Math.max(0, cosineSimilarity(queryVector, vector))
      : 0;
    const score = vector ? lexicalScore * 0.45 + cosine * 50 : lexicalScore;
    const coverage =
      lexical.get(entry.id)?.coverage ?? (cosine >= 0.35 ? 1 : 0);
    const passesLexical = lexical.has(entry.id);
    const passesSemantic = cosine >= 0.35 && score >= MIN_SCORE;
    if (!passesLexical && !passesSemantic) continue;
    matches.push({ entry, score, coverage });
  }
  matches.sort(compareMatches);
  const best = matches[0] ?? null;
  if (!best)
    return { query, best: null, alternatives: [], matcher: "embeddings" };
  const alternatives = matches
    .slice(1)
    .filter((match) => match.score >= best.score * 0.72)
    .slice(0, 3);
  return { query, best, alternatives, matcher: "embeddings" };
}

export function withPickedMatch(
  result: SearchResult,
  id: string | undefined,
): SearchResult {
  if (!id || !result.best) return result;
  const matches = [result.best, ...result.alternatives];
  const picked = matches.find((match) => match.entry.id === id);
  if (!picked) return result;
  return {
    ...result,
    best: picked,
    alternatives: matches.filter((match) => match.entry.id !== id),
  };
}

export function matchPercent(
  match: Pick<FeatureMatch, "score" | "coverage">,
): number {
  const scoreFactor = Math.min(match.score / 40, 1);
  const blended = match.coverage * 0.75 + scoreFactor * 0.25;
  return Math.max(1, Math.min(99, Math.round(blended * 100)));
}
