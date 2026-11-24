import { jaccard } from "../proposals/fingerprint";
import { tokenize } from "../text/tokens";

export type PostText = {
  id: string;
  title: string;
  description: string;
};

export type RankedPost = PostText & { score: number };

const MIN_SCORE = 0.34;

export function rankPosts(
  query: string,
  posts: readonly PostText[],
): RankedPost[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length < 2) return [];
  const ranked: RankedPost[] = [];
  for (const post of posts) {
    const titleScore = jaccard(queryTokens, tokenize(post.title));
    const bodyScore = jaccard(
      queryTokens,
      tokenize(`${post.title} ${post.description}`),
    );
    const score = titleScore * 0.7 + bodyScore * 0.3;
    if (score < MIN_SCORE) continue;
    ranked.push({ ...post, score });
  }
  ranked.sort(
    (left, right) =>
      right.score - left.score || left.title.length - right.title.length,
  );
  return ranked.slice(0, 4);
}

export function parseKeptIds(text: string): string[] | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { ids?: unknown };
    if (!Array.isArray(parsed.ids)) return null;
    return parsed.ids.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
}

export function applyKeptIds<T extends { id: string }>(
  items: readonly T[],
  kept: readonly string[] | null,
): T[] {
  if (!kept) return [...items];
  const allowed = new Set(kept);
  const filtered = items.filter((item) => allowed.has(item.id));
  return filtered.length > 0 ? filtered : [...items];
}
