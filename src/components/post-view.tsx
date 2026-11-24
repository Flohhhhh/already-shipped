"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { SignInDrawer } from "@/components/account-menu";
import { ShipmentStatus } from "@/components/shipment-status";
import { sourceLabel } from "@/jobs/ingest";
import { useClientReady } from "@/components/use-client-ready";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function PostLive({ postId }: { postId: string }) {
  const post = useQuery(api.posts.get, { postId });
  const merges = useQuery(api.posts.merges, { postId });
  const vote = useMutation(api.posts.vote);
  const respond = useMutation(api.posts.respondMerge);
  const [signInOpen, setSignInOpen] = useState(false);

  if (post === undefined) return null;
  if (!post)
    return (
      <p className="text-muted-foreground text-sm">That suggestion is gone.</p>
    );
  const heading = post.normalizedTitle ?? post.title;

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {heading}
      </h1>
      <p className="text-base">{post.description}</p>
      {post.category ? (
        <p className="text-muted-foreground text-sm">{post.category}</p>
      ) : null}
      <ShipmentStatus
        shippedIn={post.shippedIn}
        shippedUrl={post.shippedUrl}
        shippedKind={post.shippedKind}
        shippedSuppressed={post.shippedSuppressed}
        pendingShipment={post.pendingShipment}
      />
      {post.sources.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {post.sources.map((source) => (
            <li key={source.url}>
              <a
                className="text-sm underline"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {sourceLabel(source.kind)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        variant={post.voted ? "default" : "outline"}
        className="h-11 w-fit rounded-full px-4"
        aria-pressed={post.voted}
        onClick={() => {
          void vote({ postId: post.id, next: !post.voted }).catch(() =>
            setSignInOpen(true),
          );
        }}
      >
        {post.voteCount} {post.voteCount === 1 ? "vote" : "votes"}
      </Button>
      {merges && merges.some((item) => item.status !== "dismissed") ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Possible duplicate</h2>
          <ul className="flex flex-col gap-3">
            {merges
              .filter((item) => item.status !== "dismissed")
              .map((item) => (
                <li
                  key={item.id}
                  className="border-border/70 rounded-2xl border px-4 py-3"
                >
                  <Link
                    href={`/posts/${item.otherPostId}`}
                    className="text-sm font-medium"
                  >
                    {item.otherTitle}
                  </Link>
                  {item.status === "pending" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="h-11 rounded-full"
                        onClick={() => {
                          void respond({
                            suggestionId: item.id as Id<"mergeSuggestions">,
                            status: "confirmed",
                          }).catch(() => setSignInOpen(true));
                        }}
                      >
                        Yes, same idea
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-full"
                        onClick={() => {
                          void respond({
                            suggestionId: item.id as Id<"mergeSuggestions">,
                            status: "dismissed",
                          }).catch(() => setSignInOpen(true));
                        }}
                      >
                        Keep separate
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Confirmed as the same idea.
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
      <SignInDrawer open={signInOpen} onOpenChange={setSignInOpen} />
    </article>
  );
}

export function PostView({ postId }: { postId: string }) {
  const ready = useClientReady();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <p className="text-muted-foreground text-sm">
        This post needs a Convex deployment.
      </p>
    );
  }
  if (!ready) return null;
  return <PostLive postId={postId} />;
}
