import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { env } from "@/env";
import { embedQuery } from "@/server/search/embeddings";
import { searchFeatures, searchWithVectors } from "@/server/search/match";
import type {
  FeatureEntry,
  FeatureIndex,
  SearchResult,
  Suggestion,
} from "@/server/search/types";

const INDEX_PATH = path.join(process.cwd(), "data", "feature-index.json");
const EMBEDDINGS_PATH = path.join(
  process.cwd(),
  "data",
  "feature-embeddings.json",
);

let cachedIndex: FeatureIndex | null = null;

function loadIndex(): FeatureIndex {
  if (cachedIndex) return cachedIndex;
  const parsed = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as FeatureIndex;
  cachedIndex = parsed;
  return parsed;
}

function loadVectors(): Record<string, number[]> | null {
  try {
    const parsed = JSON.parse(readFileSync(EMBEDDINGS_PATH, "utf8")) as {
      vectors?: Record<string, number[]>;
    };
    return parsed.vectors ?? null;
  } catch {
    return null;
  }
}

export function suggestCatalog(query: string): Suggestion[] {
  const result = searchFeatures(query, loadIndex().entries);
  if (!result.best) return [];
  return [result.best, ...result.alternatives].slice(0, 4).map((match) => ({
    id: match.entry.id,
    title: match.entry.title,
    where: match.entry.where.replaceAll(", then ", " → "),
  }));
}

export async function searchCatalog(
  query: string,
  extras: FeatureEntry[] = [],
): Promise<SearchResult> {
  const entries = [...loadIndex().entries, ...extras];
  const lexical = searchFeatures(query, entries);
  if (env.ALREADY_SHIPPED_MATCHER !== "embeddings") return lexical;
  const baseUrl = env.ALREADY_SHIPPED_EMBEDDINGS_BASE_URL;
  if (!baseUrl) return lexical;
  const vectors = loadVectors();
  if (!vectors) return lexical;
  const queryVector = await embedQuery(query, {
    baseUrl,
    apiKey: env.ALREADY_SHIPPED_EMBEDDINGS_API_KEY,
    model: env.ALREADY_SHIPPED_EMBEDDINGS_MODEL ?? "text-embedding-3-small",
  });
  if (!queryVector) return lexical;
  return searchWithVectors(query, entries, vectors, queryVector);
}

export function catalogMeta(): Pick<
  FeatureIndex,
  "commitSha" | "generatedAt" | "repository"
> {
  const index = loadIndex();
  return {
    commitSha: index.commitSha,
    generatedAt: index.generatedAt,
    repository: index.repository,
  };
}
