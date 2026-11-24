"use client";

import { useQuery } from "convex/react";

import { useClientReady } from "@/components/use-client-ready";
import { api } from "../../convex/_generated/api";

function DigestLive() {
  const digests = useQuery(api.jobs.listDigests, {});
  if (digests === undefined) return null;
  if (digests.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No digest yet. A weekly summary appears here after OpenRouter is
        configured.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-6">
      {digests.map((digest) => (
        <li key={digest.id} className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            {new Date(digest.createdAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-base">{digest.summary}</p>
          <ul className="flex flex-wrap gap-2">
            {digest.themes.map((theme) => (
              <li
                key={theme}
                className="bg-muted rounded-full px-3 py-1 text-sm"
              >
                {theme}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function DigestView() {
  const ready = useClientReady();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Digest</h1>
      {!process.env.NEXT_PUBLIC_CONVEX_URL ? (
        <p className="text-muted-foreground text-sm">
          The digest needs a Convex deployment.
        </p>
      ) : ready ? (
        <DigestLive />
      ) : null}
    </div>
  );
}
