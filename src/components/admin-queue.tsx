"use client";

import { useMutation, useQuery } from "convex/react";

import { SignInButtons } from "@/components/account-menu";
import { useClientReady } from "@/components/use-client-ready";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function QueueList({
  items,
  action,
}: {
  items: {
    id: Id<"shippedSuggestions">;
    postId: Id<"posts">;
    title: string;
    version: string;
    url: string;
    confidence: number;
    rationale: string;
  }[];
  action: "review" | "reopen";
}) {
  const confirm = useMutation(api.admin.confirm);
  const dismiss = useMutation(api.admin.dismiss);
  const reopen = useMutation(api.admin.reopen);
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">None right now.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="border-border/70 rounded-2xl border px-4 py-3"
        >
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {item.version} · {Math.round(item.confidence * 100)}%
          </p>
          <p className="mt-2 text-sm">{item.rationale}</p>
          {item.url ? (
            <a
              className="mt-2 inline-block text-sm underline"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              Changelog
            </a>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {action === "review" ? (
              <>
                <Button
                  className="h-11 rounded-full"
                  onClick={() => void confirm({ suggestionId: item.id })}
                >
                  Confirm
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => void dismiss({ suggestionId: item.id })}
                >
                  Dismiss
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => void reopen({ suggestionId: item.id })}
              >
                Undo/Reopen
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminLive() {
  const admin = useQuery(api.admin.isAdmin);
  const queue = useQuery(api.admin.queue, admin ? {} : "skip");
  const approve = useMutation(api.admin.approveIngested);
  const reject = useMutation(api.admin.rejectIngested);
  if (admin === undefined) return null;
  if (!admin) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          This page is limited to admins.
        </p>
        <SignInButtons />
      </div>
    );
  }
  if (!queue || queue.access !== "ok") return null;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Pending review</h2>
        <QueueList items={queue.pending} action="review" />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Recently auto-closed</h2>
        <QueueList items={queue.autoClosed} action="reopen" />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Ingested requests</h2>
        {queue.ingested.length === 0 ? (
          <p className="text-muted-foreground text-sm">None right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.ingested.map((item) => (
              <li
                key={item.id}
                className="border-border/70 rounded-2xl border px-4 py-3"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-2 text-sm">{item.description}</p>
                {item.url ? (
                  <a
                    className="mt-2 inline-block text-sm underline"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Original
                  </a>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="h-11 rounded-full"
                    onClick={() => void approve({ postId: item.id })}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full"
                    onClick={() => void reject({ postId: item.id })}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AdminQueue() {
  const ready = useClientReady();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      {!process.env.NEXT_PUBLIC_CONVEX_URL ? (
        <p className="text-muted-foreground text-sm">
          Admin review needs a Convex deployment.
        </p>
      ) : ready ? (
        <AdminLive />
      ) : null}
    </div>
  );
}
