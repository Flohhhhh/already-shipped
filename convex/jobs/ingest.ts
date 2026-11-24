import {
  cursorAfterFinished,
  parseIngestClassifications,
  pendingSince,
  stepCursor,
} from "../../src/jobs/ingest";
import type { IngestKind } from "../../src/jobs/ingest";
import { shouldCallOpenRouter } from "../../src/jobs/model";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  fetchGithubDiscussions,
  fetchGithubIssues,
  type RemoteRequest,
} from "./github";
import { completeJson } from "./openrouter";
import { fetchXRequests } from "./x";

const INGEST_SYSTEM = [
  "Classify each public post about T3 Code.",
  "featureRequest is true only when it asks for a product feature or setting.",
  "Normalize a feature request into a short title and a one or two sentence description.",
  'Return JSON only: {"items":[{"sourceId":string,"featureRequest":boolean,"title":string,"description":string}]}.',
  "Keep each sourceId exactly. Leave title and description empty when featureRequest is false.",
].join(" ");

function kindFor(sourceId: string): IngestKind {
  if (sourceId.startsWith("github:discussion:")) return "github-discussion";
  if (sourceId.startsWith("x:")) return "x";
  return "github-issue";
}

async function classifyBatch(
  ctx: ActionCtx,
  cursorName: string | null,
  items: readonly RemoteRequest[],
) {
  const cursor = cursorName
    ? await ctx.runQuery(internal.jobs.ingestCursor, { name: cursorName })
    : null;
  const batch = cursorName ? pendingSince(items, cursor) : items.slice(0, 8);
  if (batch.length === 0) return;
  const text = await completeJson(
    INGEST_SYSTEM,
    batch.map((item) => `${item.sourceId}\t${item.text}`).join("\n"),
  );
  if (!text) return;
  const parsed = parseIngestClassifications(text);
  const finished: { cursor: string; finished: boolean }[] = [];
  for (const item of batch) {
    const row = parsed.find((entry) => entry.sourceId === item.sourceId);
    if (!row) {
      finished.push({ cursor: item.cursor, finished: false });
      continue;
    }
    const result = await ctx.runMutation(internal.jobs.recordIngested, {
      sourceKey: item.sourceId,
      kind: kindFor(item.sourceId),
      url: item.url,
      featureRequest: row.featureRequest,
      title: row.title,
      description: row.description,
    });
    finished.push({ cursor: item.cursor, finished: result !== "invalid" });
  }
  if (!cursorName) return;
  const next = cursorAfterFinished(finished);
  if (!next) return;
  await ctx.runMutation(internal.jobs.storeIngestCursor, {
    name: cursorName,
    value: stepCursor(next),
  });
}

export async function runIngest(ctx: ActionCtx) {
  if (!shouldCallOpenRouter(process.env.OPENROUTER_API_KEY)) return;
  const token = process.env.GITHUB_TOKEN;
  const issues = await fetchGithubIssues(token);
  if (issues) await classifyBatch(ctx, "github-issues", issues);
  const discussions = await fetchGithubDiscussions(token);
  if (discussions) await classifyBatch(ctx, "github-discussions", discussions);
  const xToken = process.env.X_BEARER_TOKEN;
  if (!xToken) return;
  const since = await ctx.runQuery(internal.jobs.ingestCursor, {
    name: "x-mentions",
  });
  const found = await fetchXRequests(xToken, since);
  if (!found) return;
  await classifyBatch(ctx, "x-mentions", found.mentions);
  await classifyBatch(ctx, null, found.replies);
}
