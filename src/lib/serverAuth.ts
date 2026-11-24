import "server-only";

import { setupConvexAuthServer } from "@convex-dev/auth/ssr";
import { setupConvexAuthNextjs } from "@convex-dev/auth/ssr/nextjs";

import { api } from "../../convex/_generated/api";

function convexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url && url.length > 0 ? url : null;
}

const url = convexUrl();

export const authHandlers = url
  ? setupConvexAuthServer({
      convexUrl: url,
      refreshSession: api.auth.refreshSession,
      signOut: api.auth.signOut,
      signIn: [
        api.auth.completeSignInWithGithub,
        api.auth.completeSignInWithDiscord,
      ],
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    })
  : null;

export const nextAuth = url
  ? setupConvexAuthNextjs({
      convexUrl: url,
      refreshSession: api.auth.refreshSession,
      isAuthenticated: api.auth.isAuthenticated,
    })
  : null;
