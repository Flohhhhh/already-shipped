import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { listProposals, proposeFeature, toggleVote } from "./proposals/service";

export const list = query({
  args: {
    voterKey: v.optional(v.string()),
    order: v.optional(v.union(v.literal("top"), v.literal("new"))),
  },
  handler: (ctx, args) =>
    listProposals(ctx, args.voterKey, args.order ?? "top"),
});

export const propose = mutation({
  args: { text: v.string(), voterKey: v.string() },
  handler: (ctx, args) => proposeFeature(ctx, args),
});

export const vote = mutation({
  args: {
    proposalId: v.id("proposals"),
    voterKey: v.string(),
    next: v.boolean(),
  },
  handler: (ctx, args) => toggleVote(ctx, args),
});
