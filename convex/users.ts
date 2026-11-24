import { vDiscordProfile } from "@convex-dev/auth/methods/discord/server";
import { vGithubProfile } from "@convex-dev/auth/methods/github/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { name: user.name };
  },
});

export const createFromGithub = internalMutation({
  args: {
    method: v.object({
      name: v.literal("github"),
      profile: vGithubProfile,
    }),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("users", {
      name: args.method.profile.name ?? args.method.profile.login,
      image: args.method.profile.avatarUrl,
      provider: "github",
      providerAccountId: args.method.profile.id,
      email: args.method.profile.emailVerified
        ? args.method.profile.email
        : undefined,
      emailVerified: args.method.profile.emailVerified,
    });
  },
});

export const createFromDiscord = internalMutation({
  args: {
    method: v.object({
      name: v.literal("discord"),
      profile: vDiscordProfile,
    }),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("users", {
      name: args.method.profile.name,
      image: args.method.profile.avatarUrl,
      provider: "discord",
      providerAccountId: args.method.profile.id,
    });
  },
});
