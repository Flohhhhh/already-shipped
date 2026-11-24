export type ReviewStatus =
  "pending" | "confirmed" | "dismissed" | "auto" | "reopened";
export type ReviewDecision = "confirmed" | "dismissed";

export const DEFAULT_ADMIN_GITHUB_IDS = "48927090";
export const DEFAULT_AUTO_CLOSE_THRESHOLD = 0.9;
export const SUGGEST_CONFIDENCE = 0.6;
export const EMBEDDING_BAR = 0.35;

export function suggestPair(existing: ReviewStatus | null): "create" | "skip" {
  return existing === null ? "create" : "skip";
}

export function resolveAutoCloseThreshold(value: string | undefined): number {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_AUTO_CLOSE_THRESHOLD;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= SUGGEST_CONFIDENCE || parsed > 1) {
    return DEFAULT_AUTO_CLOSE_THRESHOLD;
  }
  return parsed;
}

export function shipmentOutcome(
  confidence: number,
  embeddingPassed: boolean,
  threshold: number,
): "auto" | "review" | "ignore" {
  if (confidence < SUGGEST_CONFIDENCE || confidence > 1) return "ignore";
  if (embeddingPassed && confidence >= threshold) return "auto";
  return "review";
}

export function reopenAutoClose(
  status: ReviewStatus,
): { status: "reopened" } | { error: string } {
  if (status !== "auto")
    return { error: "Only an auto-closed suggestion can be reopened." };
  return { status: "reopened" };
}

export function decideReview(
  status: ReviewStatus,
  decision: ReviewDecision,
): { status: ReviewDecision } | { error: string } {
  if (status !== "pending")
    return { error: "That suggestion is already reviewed." };
  return { status: decision };
}

function idSet(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

export function resolveAdminGithubIds(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_ADMIN_GITHUB_IDS;
}

export function isAdminAccount(
  user: {
    provider: "github" | "discord";
    providerAccountId?: string;
    email?: string;
    emailVerified?: boolean;
  },
  env: { githubIds?: string; discordIds?: string; emails?: string },
): boolean {
  const accountId = user.providerAccountId;
  if (
    user.provider === "github" &&
    accountId &&
    idSet(resolveAdminGithubIds(env.githubIds)).has(accountId)
  ) {
    return true;
  }
  if (
    user.provider === "discord" &&
    accountId &&
    idSet(env.discordIds).has(accountId)
  )
    return true;
  if (user.provider === "github" && user.emailVerified && user.email) {
    const emails = new Set(
      [...idSet(env.emails)].map((item) => item.toLowerCase()),
    );
    if (emails.has(user.email.toLowerCase())) return true;
  }
  return false;
}
