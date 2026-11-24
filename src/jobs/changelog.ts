export type RemoteRelease = {
  id: string;
  tag: string;
  url: string;
  body: string;
};

const FIRST_RUN_LIMIT = 3;

export function selectNewReleases(
  newestFirst: readonly RemoteRelease[],
  cursorId: string | null,
): RemoteRelease[] {
  if (newestFirst.length === 0) return [];
  if (!cursorId) return [...newestFirst].slice(0, FIRST_RUN_LIMIT).reverse();
  const fresh: RemoteRelease[] = [];
  for (const release of newestFirst) {
    if (release.id === cursorId) break;
    fresh.push(release);
  }
  return fresh.reverse();
}

export function cursorAfter(
  newestFirst: readonly RemoteRelease[],
  selected: readonly RemoteRelease[],
  finishedIds: ReadonlySet<string>,
): string | null {
  if (selected.length === 0) return null;
  if (!selected.every((release) => finishedIds.has(release.id))) return null;
  return newestFirst[0]?.id ?? null;
}

export function releaseBullets(body: string): string[] {
  const bullets: string[] = [];
  for (const line of body.split("\n")) {
    const match = /^\s*[-*]\s+(.+)$/.exec(line);
    if (!match) continue;
    const text = (match[1] ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 40 || text.length > 280) continue;
    if (/^https?:/i.test(text) || /full changelog/i.test(text)) continue;
    bullets.push(text);
  }
  return bullets.slice(0, 12);
}

export function sourceIdFor(releaseId: string, text: string): string {
  let hash = 5381;
  const value = text.toLowerCase();
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 33) ^ value.charCodeAt(index)) >>> 0;
  }
  return `release:${releaseId}:${hash.toString(16)}`;
}
