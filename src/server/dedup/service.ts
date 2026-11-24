import "server-only";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../convex/_generated/api";
import { env } from "@/env";
import { embedTexts } from "@/server/search/embeddings";
import { matchPercent } from "@/server/search/match";
import { searchCatalog } from "@/server/search/service";
import type { DedupFeature, DedupPost } from "@/dedup/types";
import type { FeatureEntry } from "@/server/search/types";
import { tokenize } from "@/text/tokens";

async function loadCatalogEntries(): Promise<FeatureEntry[]> {
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return [];
  try {
    const client = new ConvexHttpClient(convexUrl);
    const notes = await client.query(api.jobs.catalogEntries, {});
    return notes.map((note) => ({
      id: note.id,
      title: note.title,
      summary: note.summary,
      where: `Release ${note.version}`,
      kind: "release" as const,
      terms: [],
      sources: note.url
        ? [{ url: note.url, label: `Release ${note.version}` }]
        : [],
    }));
  } catch {
    return [];
  }
}

function sourceFor(entry: FeatureEntry): { url: string; label: string } | null {
  const doc = entry.sources.find((source) => source.label.startsWith("Docs"));
  const release = entry.sources.find((source) =>
    source.label.startsWith("Release"),
  );
  if (entry.kind === "release" && release)
    return { url: release.url, label: "View release note" };
  if (doc) return { url: doc.url, label: "View doc" };
  const first = entry.sources[0];
  if (!first) return null;
  return { url: first.url, label: "View source" };
}

function cosine(left: readonly number[], right: readonly number[]): number {
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

async function rerankPosts(
  query: string,
  posts: DedupPost[],
): Promise<DedupPost[]> {
  if (posts.length < 2 || env.ALREADY_SHIPPED_MATCHER !== "embeddings")
    return posts;
  const baseUrl = env.ALREADY_SHIPPED_EMBEDDINGS_BASE_URL;
  if (!baseUrl) return posts;
  const vectors = await embedTexts(
    [query, ...posts.map((post) => `${post.title} ${post.description}`)],
    {
      baseUrl,
      apiKey: env.ALREADY_SHIPPED_EMBEDDINGS_API_KEY,
      model: env.ALREADY_SHIPPED_EMBEDDINGS_MODEL ?? "text-embedding-3-small",
    },
  );
  const queryVector = vectors?.[0];
  if (!vectors || !queryVector) return posts;
  return [...posts].sort((left, right) => {
    const leftIndex = posts.indexOf(left) + 1;
    const rightIndex = posts.indexOf(right) + 1;
    const leftScore = cosine(queryVector, vectors[leftIndex] ?? []);
    const rightScore = cosine(queryVector, vectors[rightIndex] ?? []);
    return rightScore - leftScore;
  });
}

export async function dedupDraft(
  title: string,
  description: string,
): Promise<{ features: DedupFeature[]; posts: DedupPost[] }> {
  const query = `${title} ${description}`.trim();
  if (tokenize(query).length < 2) return { features: [], posts: [] };
  const extras = await loadCatalogEntries();
  const found = await searchCatalog(query, extras);
  const matches = found.best
    ? [found.best, ...found.alternatives].slice(0, 4)
    : [];
  const features = matches.map((match) => {
    const source = sourceFor(match.entry);
    return {
      id: match.entry.id,
      title: match.entry.title,
      where: match.entry.where.replaceAll(", then ", " → "),
      summary: match.entry.summary,
      percent: matchPercent(match),
      url: source?.url ?? null,
      label: source?.label ?? null,
    };
  });
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return { features, posts: [] };
  try {
    const client = new ConvexHttpClient(convexUrl);
    const posts = await client.query(api.posts.similar, { title, description });
    return { features, posts: await rerankPosts(query, posts) };
  } catch {
    return { features, posts: [] };
  }
}
