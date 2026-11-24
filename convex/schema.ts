import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  proposals: defineTable({
    text: v.string(),
    normalizedKey: v.string(),
    voteCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_normalizedKey", ["normalizedKey"])
    .index("by_voteCount", ["voteCount"])
    .index("by_createdAt", ["createdAt"]),
  proposalTokens: defineTable({
    proposalId: v.id("proposals"),
    token: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_proposal", ["proposalId"]),
  votes: defineTable({
    proposalId: v.id("proposals"),
    voterKey: v.string(),
  }).index("by_proposal_and_voter", ["proposalId", "voterKey"]),
});
