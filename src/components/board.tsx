"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { SignInDrawer } from "@/components/account-menu";
import { Composer } from "@/components/composer";
import { ShipmentStatus } from "@/components/shipment-status";
import { sourceLabel } from "@/jobs/ingest";
import { useClientReady } from "@/components/use-client-ready";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

function PostList() {
  const [order, setOrder] = useState<"top" | "new">("top");
  const [signInOpen, setSignInOpen] = useState(false);
  const posts = useQuery(api.posts.list, { order });
  const vote = useMutation(api.posts.vote);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Suggestions</h2>
        <div className="bg-muted inline-flex rounded-full p-1">
          <Button
            variant={order === "top" ? "outline" : "quiet"}
            className="h-8 rounded-full px-3"
            aria-pressed={order === "top"}
            onClick={() => setOrder("top")}
          >
            Top
          </Button>
          <Button
            variant={order === "new" ? "outline" : "quiet"}
            className="h-8 rounded-full px-3"
            aria-pressed={order === "new"}
            onClick={() => setOrder("new")}
          >
            New
          </Button>
        </div>
      </div>
      {posts === undefined ? null : posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No suggestions yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => {
            const heading = post.normalizedTitle ?? post.title;
            return (
              <li
                key={post.id}
                className="border-border/70 bg-card/85 flex items-start justify-between gap-3 rounded-[1.75rem] border p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-base font-medium"
                  >
                    {heading}
                  </Link>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {post.description}
                  </p>
                  {post.category ? (
                    <p className="text-muted-foreground mt-2 text-sm">
                      {post.category}
                    </p>
                  ) : null}
                  <ShipmentStatus
                    shippedIn={post.shippedIn}
                    shippedUrl={post.shippedUrl}
                    shippedKind={post.shippedKind}
                    shippedSuppressed={post.shippedSuppressed}
                    pendingShipment={post.pendingShipment}
                  />
                  {post.sources[0] ? (
                    <a
                      className="mt-2 inline-block text-sm underline"
                      href={post.sources[0].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sourceLabel(post.sources[0].kind)}
                    </a>
                  ) : null}
                </div>
                <Button
                  variant={post.voted ? "default" : "outline"}
                  className="h-11 shrink-0 rounded-full px-3"
                  aria-pressed={post.voted}
                  onClick={() => {
                    void vote({ postId: post.id, next: !post.voted }).catch(
                      () => {
                        setSignInOpen(true);
                      },
                    );
                  }}
                >
                  {post.voteCount}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <SignInDrawer open={signInOpen} onOpenChange={setSignInOpen} />
    </section>
  );
}

export function Board() {
  const ready = useClientReady();
  const convexEnabled = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL) && ready;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Suggestions</h1>
        <p className="text-muted-foreground text-sm">
          Ask for something T3 Code does not do yet. Matches show up while you
          type.
        </p>
      </div>
      <Composer convexEnabled={convexEnabled} />
      {convexEnabled ? (
        <PostList />
      ) : (
        <p className="text-muted-foreground text-sm">
          {process.env.NEXT_PUBLIC_CONVEX_URL
            ? null
            : "The suggestion list needs a Convex deployment. Feature matches still work while you type."}
        </p>
      )}
    </div>
  );
}
