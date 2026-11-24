const CATEGORIES = [
  "sidebar",
  "editor",
  "git",
  "settings",
  "chat",
  "search",
  "other",
] as const;

export type Enrichment = {
  normalizedTitle: string;
  category: (typeof CATEGORIES)[number];
  duplicateIds: string[];
};

export type DigestDraft = {
  summary: string;
  themes: string[];
};

export type CatalogRewrite = {
  sourceId: string;
  summary: string;
};

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

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

export function parseEnrichment(text: string): Enrichment | null {
  const parsed = readObject(text);
  if (!parsed) return null;
  const normalizedTitle = parsed.normalizedTitle;
  const category = parsed.category;
  if (typeof normalizedTitle !== "string" || normalizedTitle.trim().length < 4)
    return null;
  if (
    typeof category !== "string" ||
    !CATEGORIES.includes(category as Enrichment["category"])
  )
    return null;
  return {
    normalizedTitle: normalizedTitle.trim(),
    category: category as Enrichment["category"],
    duplicateIds: stringList(parsed.duplicateIds),
  };
}

export function parseDigest(text: string): DigestDraft | null {
  const parsed = readObject(text);
  if (!parsed) return null;
  const summary = parsed.summary;
  if (typeof summary !== "string" || summary.trim().length < 8) return null;
  const themes = stringList(parsed.themes).slice(0, 6);
  if (themes.length === 0) return null;
  return { summary: summary.trim(), themes };
}

export function parseCatalogRewrites(text: string): CatalogRewrite[] {
  const parsed = readObject(text);
  if (!parsed || !Array.isArray(parsed.items)) return [];
  const items: CatalogRewrite[] = [];
  for (const item of parsed.items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.sourceId !== "string" ||
      typeof record.summary !== "string"
    )
      continue;
    const summary = record.summary.trim();
    if (summary.length < 8) continue;
    items.push({ sourceId: record.sourceId, summary });
  }
  return items;
}

export function isReleaseNoise(title: string): boolean {
  return (
    /^(test|tests|chore|ci|build|deps|refactor|style)\b[:\s-]/i.test(
      title.trim(),
    ) || /\b(unit test|fix tests|lint|typecheck only)\b/i.test(title)
  );
}

export type ShipmentCheck = {
  sourceId: string;
  confidence: number;
  rationale: string;
};

export function parseShipmentChecks(text: string): ShipmentCheck[] {
  const parsed = readObject(text);
  if (!parsed || !Array.isArray(parsed.matches)) return [];
  const checks: ShipmentCheck[] = [];
  for (const item of parsed.matches) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.sourceId !== "string" ||
      typeof record.rationale !== "string"
    )
      continue;
    if (
      typeof record.confidence !== "number" ||
      record.confidence < 0.6 ||
      record.confidence > 1
    ) {
      continue;
    }
    const rationale = record.rationale.trim();
    if (rationale.length < 8) continue;
    checks.push({
      sourceId: record.sourceId,
      confidence: record.confidence,
      rationale,
    });
  }
  return checks;
}

export function releaseVersion(where: string): string | null {
  const match = where.match(/v\d+\.\d+\.\d+(?:[-.][\w.]+)?/i);
  return match?.[0] ?? null;
}
