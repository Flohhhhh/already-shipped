"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useSyncExternalStore, type ReactNode } from "react";

let singleton: ConvexReactClient | null = null;

export function ConvexClientProvider({
  url,
  children,
  fallback = null,
}: {
  url: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return fallback;
  singleton ??= new ConvexReactClient(url);
  return <ConvexProvider client={singleton}>{children}</ConvexProvider>;
}
