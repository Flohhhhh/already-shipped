"use client";

import { ConvexAuthNextjsProvider } from "../../node_modules/@convex-dev/auth/dist/ssr/nextjs/client.js";
import { getFunctionName } from "convex/server";
import { type ReactNode } from "react";

import { useClientReady } from "@/components/use-client-ready";
import { api } from "../../convex/_generated/api";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const ready = useClientReady();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !ready) return children;
  return (
    <ConvexAuthNextjsProvider
      isAuthenticatedFunctionName={getFunctionName(api.auth.isAuthenticated)}
    >
      {children}
    </ConvexAuthNextjsProvider>
  );
}
