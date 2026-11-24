import { jaccard } from "../proposals/fingerprint";
import { tokenize } from "../text/tokens";

export type ShippedFeature = {
  id: string;
  title: string;
  summary: string;
  version: string;
  url?: string;
};

export function matchShipped(
  post: { title: string; description: string },
  features: readonly ShippedFeature[],
): {
  id: string;
  version: string;
  title: string;
  url: string;
  score: number;
} | null {
  const query = tokenize(`${post.title} ${post.description}`);
  if (query.length < 2) return null;
  let best: {
    id: string;
    version: string;
    title: string;
    url: string;
    score: number;
  } | null = null;
  for (const feature of features) {
    const score = jaccard(
      query,
      tokenize(`${feature.title} ${feature.summary}`),
    );
    if (!best || score > best.score) {
      best = {
        id: feature.id,
        version: feature.version,
        title: feature.title,
        url: feature.url ?? "",
        score,
      };
    }
  }
  if (!best || best.score < 0.45) return null;
  return best;
}
