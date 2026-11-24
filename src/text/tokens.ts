const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "and",
  "or",
  "with",
  "my",
  "me",
  "does",
  "do",
  "it",
  "this",
  "that",
  "is",
  "are",
  "be",
  "already",
  "t3",
  "code",
  "please",
  "can",
  "i",
  "want",
  "how",
  "when",
  "from",
  "into",
  "by",
  "your",
  "you",
  "app",
  "just",
  "not",
  "have",
  "has",
  "would",
  "could",
  "should",
  "let",
  "make",
  "add",
  "need",
  "like",
  "using",
  "use",
  "our",
  "we",
  "their",
  "them",
]);

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["group", "grouping", "grouped", "groups"],
  ["project", "projects", "repo", "repos", "repository", "repositories"],
  ["sidebar", "sidebars"],
  ["thread", "threads", "conversation", "conversations"],
  ["boring", "classic"],
  ["worktree", "worktrees"],
  ["snooze", "snoozed", "snoozing"],
  ["notification", "notifications"],
  ["keybinding", "keybindings", "shortcut", "shortcuts"],
  ["setting", "settings", "toggle", "toggles", "preference", "preferences"],
];

const CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0];
  if (!canonical) continue;
  for (const word of group) CANONICAL.set(word, canonical);
}

export function stemToken(token: string): string {
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

export function canonicalizeToken(token: string): string {
  const stemmed = stemToken(token);
  return CANONICAL.get(stemmed) ?? CANONICAL.get(token) ?? stemmed;
}

export function tokenize(text: string): string[] {
  const parts = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/);
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (part.length < 2 || STOP_WORDS.has(part)) continue;
    const token = canonicalizeToken(part);
    if (token.length < 2 || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

export function orderedTokens(text: string): string[] {
  const parts = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/);
  const tokens: string[] = [];
  for (const part of parts) {
    if (part.length < 2 || STOP_WORDS.has(part)) continue;
    const token = canonicalizeToken(part);
    if (token.length < 2) continue;
    tokens.push(token);
  }
  return tokens;
}

export function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 1) return 2;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );
  for (let row = 0; row < rows; row += 1) matrix[row]![0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0]![col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row]![col] = Math.min(
        matrix[row - 1]![col]! + 1,
        matrix[row]![col - 1]! + 1,
        matrix[row - 1]![col - 1]! + cost,
      );
    }
  }
  return matrix[left.length]![right.length]!;
}
