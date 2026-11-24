import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  createPost,
  listMerges,
  listPosts,
  readPost,
  respondToMerge,
  similarPosts,
  toggleVote,
} from "./posts/service";

export const list = query({
  args: { order: v.optional(v.union(v.literal("top"), v.literal("new"))) },
  handler: async (ctx, args) =>
    listPosts(ctx, await getAuthUserId(ctx), args.order ?? "top"),
});

export const get = query({
  args: { postId: v.string() },
  handler: async (ctx, args) =>
    readPost(ctx, await getAuthUserId(ctx), args.postId),
});

export const similar = query({
  args: { title: v.string(), description: v.string() },
  handler: (ctx, args) => similarPosts(ctx, args.title, args.description),
});

export const create = mutation({
  args: { title: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const result = await createPost(ctx, {
      ...args,
      userId: await getAuthUserId(ctx),
    });
    if (result.created) {
      await ctx.scheduler.runAfter(0, internal.jobs.enrichPost, {
        postId: result.id,
      });
    }
    return result;
  },
});

export const merges = query({
  args: { postId: v.string() },
  handler: async (ctx, args) => listMerges(ctx, args.postId),
});

export const respondMerge = mutation({
  args: {
    suggestionId: v.id("mergeSuggestions"),
    status: v.union(v.literal("confirmed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) =>
    respondToMerge(ctx, {
      suggestionId: args.suggestionId,
      status: args.status,
      userId: await getAuthUserId(ctx),
    }),
});

export const vote = mutation({
  args: { postId: v.id("posts"), next: v.boolean() },
  handler: async (ctx, args) =>
    toggleVote(ctx, { ...args, userId: await getAuthUserId(ctx) }),
});
