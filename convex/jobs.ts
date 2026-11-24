import { v } from "convex/values";

import {
  cursorAfter,
  releaseBullets,
  selectNewReleases,
  sourceIdFor,
} from "../src/jobs/changelog";
import { EMBEDDING_DIMENSIONS, shouldCallOpenRouter } from "../src/jobs/model";
import {
  isReleaseNoise,
  parseCatalogRewrites,
  parseDigest,
  parseEnrichment,
  parseShipmentChecks,
} from "../src/jobs/parse";
import { topCandidates } from "../src/jobs/similarity";
import { matchShipped } from "../src/jobs/shipped";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
} from "./_generated/server";
import { fetchRecentReleases } from "./jobs/github";
import { runIngest } from "./jobs/ingest";
import { completeJson, embedDocuments } from "./jobs/openrouter";
import { releaseFeatures } from "./jobs/releases";
import {
  applyShipment,
  catalogOrEmpty,
  changelogCursor,
  postsAwaitingShip,
  recentDigests,
  namedCursor,
  recordIngest,
  saveCatalogNotes,
  saveChangelogCursor,
  saveEnrichment,
  saveNamedCursor,
  saveWeeklyDigest,
  themesFromPosts,
} from "./jobs/service";
import { readPost, similarPosts } from "./posts/service";

const ENRICH_SYSTEM = [
  "Classify one feature request.",
  'Return JSON only: {"normalizedTitle":string,"category":string,"duplicateIds":string[]}.',
  "category is one of sidebar, editor, git, settings, chat, search, other.",
  "normalizedTitle is a short cleaned title.",
  "duplicateIds lists candidate ids that are the same request. Leave it empty when unsure.",
  "Do not merge, delete, or change votes.",
].join(" ");

const CATALOG_SYSTEM = [
  "Rewrite release lines into one clean feature sentence each.",
  "Omit tests, chores, CI, dependency bumps, and other noise by leaving them out.",
  'Return JSON only: {"items":[{"sourceId":string,"summary":string}]}.',
  "Keep each sourceId exactly as given.",
].join(" ");

const DIGEST_SYSTEM = [
  "Summarize the themes people are requesting.",
  'Return JSON only: {"summary":string,"themes":string[]}.',
  "summary is one paragraph. themes has at most 6 short labels.",
].join(" ");

export const readEnrichmentTarget = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => readPost(ctx, null, args.postId),
});

export const similarToPost = internalQuery({
  args: { title: v.string(), description: v.string() },
  handler: async (ctx, args) => similarPosts(ctx, args.title, args.description),
});

export const applyEnrichmentResult = internalMutation({
  args: {
    postId: v.id("posts"),
    normalizedTitle: v.string(),
    category: v.string(),
    duplicateIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await saveEnrichment(
      ctx,
      args.postId,
      { normalizedTitle: args.normalizedTitle, category: args.category },
      args.duplicateIds,
    );
  },
});

export const enrichPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    if (!shouldCallOpenRouter(process.env.OPENROUTER_API_KEY)) return null;
    const post = await ctx.runQuery(internal.jobs.readEnrichmentTarget, {
      postId: args.postId,
    });
    if (!post) return null;
    const similar = await ctx.runQuery(internal.jobs.similarToPost, {
      title: post.title,
      description: post.description,
    });
    const candidates = similar
      .filter((item) => item.id !== args.postId)
      .slice(0, 8)
      .map((item) => `${item.id} | ${item.title} | ${item.description}`)
      .join("\n");
    const text = await completeJson(
      ENRICH_SYSTEM,
      `Title: ${post.title}\nDescription: ${post.description}\nCandidates:\n${candidates || "(none)"}`,
    );
    if (!text) return null;
    const parsed = parseEnrichment(text);
    if (!parsed) return null;
    const allowed = new Set(similar.map((item) => item.id));
    const duplicateIds = parsed.duplicateIds.filter(
      (id) => id !== args.postId && allowed.has(id),
    );
    await ctx.runMutation(internal.jobs.applyEnrichmentResult, {
      postId: args.postId,
      normalizedTitle: parsed.normalizedTitle,
      category: parsed.category,
      duplicateIds,
    });
    return null;
  },
});

export const matchingCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cleaned = await catalogOrEmpty(ctx);
    return cleaned.length > 0 ? cleaned : releaseFeatures();
  },
});

export const awaitingShip = internalQuery({
  args: {},
  handler: async (ctx) => postsAwaitingShip(ctx),
});

export const applyShipmentResult = internalMutation({
  args: {
    postId: v.id("posts"),
    sourceId: v.string(),
    url: v.string(),
    version: v.string(),
    title: v.string(),
    summary: v.string(),
    confidence: v.number(),
    rationale: v.string(),
    embeddingPassed: v.boolean(),
  },
  handler: async (ctx, args) => applyShipment(ctx, args),
});

export const flagShipped = internalAction({
  args: {},
  handler: async (ctx) => {
    const features = await ctx.runQuery(internal.jobs.matchingCatalog, {});
    const posts = await ctx.runQuery(internal.jobs.awaitingShip, {});
    for (const post of posts) {
      const hit = matchShipped(post, features);
      if (!hit) continue;
      await ctx.runMutation(internal.jobs.applyShipmentResult, {
        postId: post.id,
        sourceId: hit.id,
        url: hit.url,
        version: hit.version,
        title: hit.title,
        summary: hit.title,
        confidence: hit.score,
        rationale: "The request overlaps this release line.",
        embeddingPassed: false,
      });
    }
    return null;
  },
});

export const storeCatalog = internalMutation({
  args: {
    notes: v.array(
      v.object({
        sourceId: v.string(),
        summary: v.string(),
        version: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await saveCatalogNotes(ctx, args.notes);
  },
});

export const refreshIndex = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!shouldCallOpenRouter(process.env.OPENROUTER_API_KEY)) return null;
    const features = releaseFeatures();
    const batchSize = 12;
    for (let index = 0; index < features.length; index += batchSize) {
      const batch = features.slice(index, index + batchSize);
      const text = await completeJson(
        CATALOG_SYSTEM,
        batch.map((feature) => `${feature.id}\t${feature.title}`).join("\n"),
      );
      if (!text) continue;
      const rewritten = parseCatalogRewrites(text);
      const notes = [];
      for (const item of rewritten) {
        const source = batch.find((feature) => feature.id === item.sourceId);
        if (!source) continue;
        notes.push({
          sourceId: source.id,
          summary: item.summary,
          version: source.version,
        });
      }
      if (notes.length > 0)
        await ctx.runMutation(internal.jobs.storeCatalog, { notes });
    }
    return null;
  },
});

export const requestedThemes = internalQuery({
  args: {},
  handler: async (ctx) => themesFromPosts(ctx),
});

export const storeDigest = internalMutation({
  args: { summary: v.string(), themes: v.array(v.string()) },
  handler: async (ctx, args) => {
    await saveWeeklyDigest(ctx, args);
  },
});

export const writeDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!shouldCallOpenRouter(process.env.OPENROUTER_API_KEY)) return null;
    const posts = await ctx.runQuery(internal.jobs.requestedThemes, {});
    if (posts.length === 0) return null;
    const text = await completeJson(
      DIGEST_SYSTEM,
      posts
        .map(
          (post) => `${post.voteCount} | ${post.title} | ${post.description}`,
        )
        .join("\n"),
    );
    if (!text) return null;
    const draft = parseDigest(text);
    if (!draft) return null;
    await ctx.runMutation(internal.jobs.storeDigest, draft);
    return null;
  },
});

const CHANGELOG_SYSTEM = [
  "Rewrite each changelog line into one clean feature sentence.",
  "Omit tests, chores, CI, and dependency noise by leaving them out.",
  'Return JSON only: {"items":[{"sourceId":string,"summary":string}]}.',
  "Keep each sourceId exactly as given.",
].join(" ");

const VERIFY_SYSTEM = [
  "Decide which changelog lines are the same feature as the request.",
  'Return JSON only: {"matches":[{"sourceId":string,"confidence":number,"rationale":string}]}.',
  "confidence is between 0 and 1. Omit lines that are only related.",
  "Do not close a request yourself.",
].join(" ");

export const readCursor = internalQuery({
  args: {},
  handler: async (ctx) => changelogCursor(ctx),
});

export const storeCursor = internalMutation({
  args: { releaseId: v.string() },
  handler: async (ctx, args) => {
    await saveChangelogCursor(ctx, args.releaseId);
  },
});

export const storeChangelog = internalMutation({
  args: {
    notes: v.array(
      v.object({
        sourceId: v.string(),
        summary: v.string(),
        version: v.string(),
        url: v.string(),
        title: v.string(),
        embedding: v.optional(v.array(v.float64())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await saveCatalogNotes(ctx, args.notes);
  },
});

export const syncChangelog = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!shouldCallOpenRouter(process.env.OPENROUTER_API_KEY)) return null;
    await indexNewReleases(ctx);
    await ctx.runAction(internal.jobs.ingestRequests, {});
    return null;
  },
});

async function indexNewReleases(ctx: ActionCtx): Promise<void> {
  const releases = await fetchRecentReleases();
  const cursor = await ctx.runQuery(internal.jobs.readCursor, {});
  const selected = selectNewReleases(releases, cursor);
  if (selected.length === 0) return;
  const finished = new Set<string>();
  const indexed: {
    sourceId: string;
    summary: string;
    version: string;
    url: string;
    embedding: number[] | null;
  }[] = [];
  for (const release of selected) {
    const bullets = releaseBullets(release.body).filter(
      (line) => !isReleaseNoise(line),
    );
    if (bullets.length === 0) {
      finished.add(release.id);
      continue;
    }
    const lines = bullets.map((text) => ({
      sourceId: sourceIdFor(release.id, text),
      text,
      version: release.tag,
      url: release.url,
    }));
    const rewritten = await completeJson(
      CHANGELOG_SYSTEM,
      lines.map((line) => `${line.sourceId}\t${line.text}`).join("\n"),
    );
    const items = rewritten ? parseCatalogRewrites(rewritten) : [];
    if (items.length === 0) continue;
    const notes = [];
    for (const item of items) {
      const source = lines.find((line) => line.sourceId === item.sourceId);
      if (!source) continue;
      notes.push({
        sourceId: source.sourceId,
        summary: item.summary,
        version: source.version,
        url: source.url,
        title: item.summary,
      });
    }
    if (notes.length === 0) continue;
    const vectors = await embedDocuments(notes.map((note) => note.summary));
    const stored = notes.map((note, index) => {
      const embedding = vectors?.[index];
      return embedding && embedding.length === EMBEDDING_DIMENSIONS
        ? { ...note, embedding }
        : note;
    });
    await ctx.runMutation(internal.jobs.storeChangelog, { notes: stored });
    for (const note of stored) {
      indexed.push({
        sourceId: note.sourceId,
        summary: note.summary,
        version: note.version,
        url: note.url,
        embedding: "embedding" in note ? note.embedding : null,
      });
    }
    finished.add(release.id);
  }
  const nextCursor = cursorAfter(releases, selected, finished);
  if (nextCursor)
    await ctx.runMutation(internal.jobs.storeCursor, {
      releaseId: nextCursor,
    });
  if (indexed.length === 0) return;
  const posts = await ctx.runQuery(internal.jobs.awaitingShip, {});
  for (const post of posts) {
    const queryVectors = await embedDocuments([
      `${post.title}\n${post.description}`,
    ]);
    const queryEmbedding = queryVectors?.[0] ?? null;
    const ranked = topCandidates(post, indexed, queryEmbedding, 3);
    if (ranked.length === 0) continue;
    const verdict = await completeJson(
      VERIFY_SYSTEM,
      [
        `Request: ${post.title}`,
        post.description,
        "Lines:",
        ...ranked.map(
          (entry) => `${entry.sourceId} | ${entry.summary} | ${entry.version}`,
        ),
      ].join("\n"),
    );
    if (!verdict) continue;
    for (const check of parseShipmentChecks(verdict)) {
      const entry = ranked.find((item) => item.sourceId === check.sourceId);
      if (!entry) continue;
      await ctx.runMutation(internal.jobs.applyShipmentResult, {
        postId: post.id,
        sourceId: entry.sourceId,
        url: entry.url,
        version: entry.version,
        title: entry.summary,
        summary: entry.summary,
        confidence: check.confidence,
        rationale: check.rationale,
        embeddingPassed: entry.matchedBy === "embedding",
      });
    }
  }
}

export const ingestCursor = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => namedCursor(ctx, args.name),
});

export const storeIngestCursor = internalMutation({
  args: { name: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await saveNamedCursor(ctx, args.name, args.value);
  },
});

export const recordIngested = internalMutation({
  args: {
    sourceKey: v.string(),
    kind: v.union(
      v.literal("github-issue"),
      v.literal("github-discussion"),
      v.literal("x"),
    ),
    url: v.string(),
    featureRequest: v.boolean(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => recordIngest(ctx, args),
});

export const ingestRequests = internalAction({
  args: {},
  handler: async (ctx) => {
    await runIngest(ctx);
    return null;
  },
});

export const catalogEntries = query({
  args: {},
  handler: async (ctx) => {
    const notes = await catalogOrEmpty(ctx);
    return notes.slice(0, 100).map((note) => ({
      id: note.id,
      title: note.title,
      summary: note.summary,
      version: note.version,
      url: note.url ?? "",
    }));
  },
});

export const listDigests = query({
  args: {},
  handler: async (ctx) => recentDigests(ctx),
});
