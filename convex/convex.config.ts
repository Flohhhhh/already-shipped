import authDiscord from "@convex-dev/auth/components/discord/convex.config.js";
import authGithub from "@convex-dev/auth/components/github/convex.config.js";
import auth from "@convex-dev/auth/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    AUTH_GITHUB_CLIENT_ID: v.string(),
    AUTH_GITHUB_CLIENT_SECRET: v.string(),
    AUTH_DISCORD_CLIENT_ID: v.string(),
    AUTH_DISCORD_CLIENT_SECRET: v.string(),
    AUTH_ALLOWED_ORIGINS: v.optional(v.string()),
  },
});

app.use(auth);
app.use(authGithub, {
  httpPrefix: "/oauth/github",
  env: {
    CLIENT_ID: app.env.AUTH_GITHUB_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_GITHUB_CLIENT_SECRET,
  },
});
app.use(authDiscord, {
  httpPrefix: "/oauth/discord",
  env: {
    CLIENT_ID: app.env.AUTH_DISCORD_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_DISCORD_CLIENT_SECRET,
  },
});

export default app;
