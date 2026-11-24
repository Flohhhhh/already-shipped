import { draftPost } from "../posts/draft";

export const INGEST_LIMIT = 8;

export type IngestKind = "github-issue" | "github-discussion" | "x";

export type IngestClassification = {
  sourceId: string;
  featureRequest: boolean;
  title: string;
  description: string;
};

export type IngestPlan = "skip" | "link" | "create";

function readObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function compareCursor(left: string, right: string): number {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function pendingSince<T extends { cursor: string }>(
  items: readonly T[],
  cursor: string | null,
  limit = INGEST_LIMIT,
): T[] {
  const fresh = cursor
    ? items.filter((item) => compareCursor(item.cursor, cursor) > 0)
    : items;
  return [...fresh]
    .sort((left, right) => compareCursor(left.cursor, right.cursor))
    .slice(0, limit);
}

export function cursorAfterFinished(
  items: readonly { cursor: string; finished: boolean }[],
): string | null {
  if (items.length === 0 || items.some((item) => !item.finished)) return null;
  return items.reduce(
    (max, item) => (compareCursor(item.cursor, max) > 0 ? item.cursor : max),
    items[0]?.cursor ?? "",
  );
}

export function stepCursor(cursor: string): string {
  if (/^\d+$/.test(cursor)) return cursor;
  const time = Date.parse(cursor);
  if (Number.isNaN(time)) return cursor;
  return new Date(time + 1).toISOString();
}

export function parseIngestClassifications(
  text: string,
): IngestClassification[] {
  const parsed = readObject(text);
  if (!parsed || !Array.isArray(parsed.items)) return [];
  const items: IngestClassification[] = [];
  for (const item of parsed.items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.sourceId !== "string" ||
      record.sourceId.trim().length === 0
    )
      continue;
    if (record.featureRequest !== true) {
      items.push({
        sourceId: record.sourceId,
        featureRequest: false,
        title: "",
        description: "",
      });
      continue;
    }
    if (
      typeof record.title !== "string" ||
      typeof record.description !== "string"
    )
      continue;
    const draft = draftPost(record.title, record.description);
    if (!draft.ok) continue;
    items.push({
      sourceId: record.sourceId,
      featureRequest: true,
      title: draft.title,
      description: draft.description,
    });
  }
  return items;
}

export function ingestPlan(
  seen: boolean,
  duplicateId: string | null,
): IngestPlan {
  if (seen) return "skip";
  if (duplicateId) return "link";
  return "create";
}

export function sourceLabel(kind: IngestKind): string {
  if (kind === "github-issue") return "GitHub issue";
  if (kind === "github-discussion") return "GitHub discussion";
  return "Post on X";
}
