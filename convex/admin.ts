import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  callerIsAdmin,
  confirmShipment,
  dismissShipment,
  reopenShipment,
  reviewIngested,
  reviewQueue,
} from "./jobs/service";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => callerIsAdmin(ctx),
});

export const queue = query({
  args: {},
  handler: async (ctx) => reviewQueue(ctx),
});

export const confirm = mutation({
  args: { suggestionId: v.id("shippedSuggestions") },
  handler: async (ctx, args) => confirmShipment(ctx, args.suggestionId),
});

export const dismiss = mutation({
  args: { suggestionId: v.id("shippedSuggestions") },
  handler: async (ctx, args) => dismissShipment(ctx, args.suggestionId),
});

export const reopen = mutation({
  args: { suggestionId: v.id("shippedSuggestions") },
  handler: async (ctx, args) => reopenShipment(ctx, args.suggestionId),
});

export const approveIngested = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => reviewIngested(ctx, args.postId, "approved"),
});

export const rejectIngested = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => reviewIngested(ctx, args.postId, "rejected"),
});
