"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowUp } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

const VOTER_STORAGE_KEY = "already-shipped-voter";

let cachedVoterKey: string | null = null;

function readVoterKey() {
  if (cachedVoterKey) return cachedVoterKey;
  const existing = localStorage.getItem(VOTER_STORAGE_KEY);
  if (existing) {
    cachedVoterKey = existing;
    return existing;
  }
  const created = crypto.randomUUID();
  localStorage.setItem(VOTER_STORAGE_KEY, created);
  cachedVoterKey = created;
  return created;
}

function useVoterKey() {
  return useSyncExternalStore(
    () => () => {},
    readVoterKey,
    () => null,
  );
}

function relativeTime(createdAt: number) {
  const minutes = Math.round((Date.now() - createdAt) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ProposeForm({ text }: { text: string }) {
  const voterKey = useVoterKey();
  const propose = useMutation(api.proposals.propose);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [settled, setSettled] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!voterKey || pending || settled) return;
        setPending(true);
        setMessage(null);
        void propose({ text, voterKey })
          .then((result) => {
            setSettled(true);
            setMessage(
              result.created
                ? "Added to proposed."
                : "Already proposed. Vote added.",
            );
          })
          .catch((error: unknown) => {
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not propose that.",
            );
          })
          .finally(() => setPending(false));
      }}
    >
      <Button
        type="submit"
        disabled={!voterKey || pending || settled}
        className="h-11 w-full rounded-full sm:w-auto"
      >
        Propose
      </Button>
      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
    </form>
  );
}

function ProposalList() {
  const voterKey = useVoterKey();
  const [order, setOrder] = useState<"top" | "new">("top");
  const proposals = useQuery(api.proposals.list, {
    voterKey: voterKey ?? undefined,
    order,
  });
  const vote = useMutation(api.proposals.vote);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Proposed Requests
            </h1>
            {proposals ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-sm">
                {proposals.length}
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Feature ideas that don&apos;t appear to exist in T3 Code.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Sort requests"
          className="bg-muted inline-flex rounded-full p-1"
        >
          {(["top", "new"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              role="radio"
              aria-checked={order === value}
              variant={order === value ? "outline" : "quiet"}
              className={`h-11 rounded-full px-4 capitalize sm:h-8 ${order === value ? "bg-card border-transparent shadow-sm" : ""}`}
              onClick={() => setOrder(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>
      {proposals === undefined ? (
        <p className="text-muted-foreground text-sm">Loading proposals.</p>
      ) : null}
      {proposals && proposals.length === 0 ? (
        <p className="text-muted-foreground text-sm">No proposals yet.</p>
      ) : null}
      {proposals && proposals.length > 0 ? (
        <ul className="border-border/70 bg-card/85 overflow-hidden rounded-[1.75rem] border">
          {proposals.map((proposal) => (
            <li
              key={proposal.id}
              className="border-border/70 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base leading-snug">{proposal.text}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {relativeTime(proposal.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant={proposal.voted ? "default" : "outline"}
                aria-pressed={proposal.voted}
                aria-label={`${proposal.voted ? "Remove vote from" : "Upvote"} ${proposal.text}`}
                disabled={!voterKey}
                className="h-11 min-w-16 rounded-full px-3"
                onClick={() => {
                  if (!voterKey) return;
                  void vote({
                    proposalId: proposal.id,
                    voterKey,
                    next: !proposal.voted,
                  });
                }}
              >
                <ArrowUp />
                {proposal.voteCount}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RequestsIntro({ note }: { note: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Proposed Requests
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base">
        Feature ideas that don&apos;t appear to exist in T3 Code.
      </p>
      <p>{note}</p>
    </div>
  );
}

export function Proposals({
  enabled,
  convexUrl,
}: {
  enabled: boolean;
  convexUrl?: string;
}) {
  if (!enabled || !convexUrl) {
    return (
      <RequestsIntro note="Proposals need a Convex deployment. Search still works." />
    );
  }
  return (
    <ConvexClientProvider
      url={convexUrl}
      fallback={<RequestsIntro note="Loading proposals." />}
    >
      <ProposalList />
    </ConvexClientProvider>
  );
}
