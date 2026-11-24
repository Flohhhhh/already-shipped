import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    image: v.optional(v.string()),
    provider: v.union(v.literal("github"), v.literal("discord")),
    providerAccountId: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  }),
  posts: defineTable({
    title: v.string(),
    description: v.string(),
    normalizedKey: v.string(),
    normalizedTitle: v.optional(v.string()),
    category: v.optional(v.string()),
    shippedIn: v.optional(v.string()),
    shippedUrl: v.optional(v.string()),
    shippedKind: v.optional(v.union(v.literal("auto"), v.literal("confirmed"))),
    shippedSourceId: v.optional(v.string()),
    shippedSuppressed: v.optional(v.boolean()),
    voteCount: v.number(),
    createdAt: v.number(),
    authorId: v.optional(v.id("users")),
    ingestedStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
  })
    .index("by_voteCount", ["voteCount"])
    .index("by_createdAt", ["createdAt"])
    .index("by_normalizedKey", ["normalizedKey"])
    .index("by_ingestedStatus", ["ingestedStatus"]),
  postSources: defineTable({
    sourceKey: v.string(),
    kind: v.union(
      v.literal("github-issue"),
      v.literal("github-discussion"),
      v.literal("x"),
    ),
    url: v.string(),
    status: v.union(
      v.literal("linked"),
      v.literal("created"),
      v.literal("ignored"),
    ),
    postId: v.optional(v.id("posts")),
    createdAt: v.number(),
  })
    .index("by_sourceKey", ["sourceKey"])
    .index("by_post", ["postId"]),
  postTokens: defineTable({
    postId: v.id("posts"),
    token: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_post", ["postId"]),
  votes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
  }).index("by_post_and_user", ["postId", "userId"]),
  mergeSuggestions: defineTable({
    postId: v.id("posts"),
    otherPostId: v.id("posts"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("dismissed"),
    ),
    createdAt: v.number(),
  }).index("by_post", ["postId"]),
  catalogNotes: defineTable({
    sourceId: v.string(),
    summary: v.string(),
    version: v.string(),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  }).index("by_source", ["sourceId"]),
  syncCursors: defineTable({
    name: v.string(),
    releaseId: v.string(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),
  shippedSuggestions: defineTable({
    postId: v.id("posts"),
    sourceId: v.string(),
    url: v.string(),
    version: v.string(),
    title: v.string(),
    summary: v.string(),
    confidence: v.number(),
    rationale: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("dismissed"),
      v.literal("auto"),
      v.literal("reopened"),
    ),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_and_source", ["postId", "sourceId"])
    .index("by_status", ["status"]),
  reviewEvents: defineTable({
    suggestionId: v.optional(v.id("shippedSuggestions")),
    postId: v.id("posts"),
    sourceId: v.string(),
    action: v.union(
      v.literal("suggested"),
      v.literal("confirmed"),
      v.literal("dismissed"),
      v.literal("auto-closed"),
      v.literal("reopened"),
    ),
    actorId: v.optional(v.id("users")),
    detail: v.string(),
    createdAt: v.number(),
  }).index("by_suggestion", ["suggestionId"]),
  digests: defineTable({
    createdAt: v.number(),
    summary: v.string(),
    themes: v.array(v.string()),
  }).index("by_createdAt", ["createdAt"]),
});
