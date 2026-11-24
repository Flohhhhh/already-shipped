import { setupDiscord } from "@convex-dev/auth/methods/discord/server";
import { setupGithub } from "@convex-dev/auth/methods/github/server";
import { setupConvexAuth } from "@convex-dev/auth/server";

import { components, internal } from "./_generated/api";

const auth = setupConvexAuth({ component: components.auth });

export const { signOut, refreshSession, isAuthenticated } = auth;

function allowedOrigins(): string[] {
  const extra = (process.env.AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return [
    "http://localhost:3000",
    "https://already-shipped.vercel.app",
    ...extra,
  ];
}

const origins = allowedOrigins();

export const { startSignInWithGithub, completeSignInWithGithub } = setupGithub(
  auth,
  {
    component: components.authGithub,
    allowedRedirectOrigins: origins,
  },
).attachUserCallbacks({ createUser: internal.users.createFromGithub });

export const { startSignInWithDiscord, completeSignInWithDiscord } =
  setupDiscord(auth, {
    component: components.authDiscord,
    allowedRedirectOrigins: origins,
  }).attachUserCallbacks({ createUser: internal.users.createFromDiscord });
