"use client";

import { useMutation } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SignInDrawer } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DedupFeature, DedupPost } from "@/dedup/types";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type DraftResult = { features: DedupFeature[]; posts: DedupPost[] };

async function loadDraft(
  title: string,
  description: string,
): Promise<DraftResult> {
  const response = await fetch("/api/dedup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) return { features: [], posts: [] };
  return (await response.json()) as DraftResult;
}

function ComposerForm({
  onCreate,
  onVote,
}: {
  onCreate: (title: string, description: string) => Promise<string>;
  onVote: (postId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<DraftResult>({ features: [], posts: [] });
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [openFeature, setOpenFeature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (title.trim().length < 8) return;
    const key = `${title}\n${description}`;
    let cancelled = false;
    const handle = setTimeout(() => {
      void loadDraft(title, description).then((result) => {
        if (cancelled) return;
        setDraft(result);
        setCheckedKey(key);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [title, description]);

  const queryKey = `${title}\n${description}`;
  const checked = title.trim().length >= 8 && checkedKey === queryKey;
  const features = checked ? draft.features : [];
  const posts = checked ? draft.posts : [];
  const suggestions = features.length + posts.length;
  const longEnough = title.trim().length >= 8 && description.trim().length >= 8;
  const showSubmit = longEnough && checked && (suggestions === 0 || dismissed);

  return (
    <form
      id="suggest"
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        void onCreate(title, description)
          .catch((caught: unknown) => {
            setError(
              caught instanceof Error ? caught.message : "Could not post.",
            );
          })
          .finally(() => setPending(false));
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          maxLength={120}
          placeholder="Group projects in the sidebar"
          onChange={(event) => {
            setTitle(event.target.value);
            setDismissed(false);
            setOpenFeature(null);
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={description}
          maxLength={2000}
          rows={4}
          placeholder="What should it do?"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/40 dark:bg-input/30 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
          onChange={(event) => {
            setDescription(event.target.value);
            setDismissed(false);
          }}
        />
      </div>
      {checked && suggestions > 0 && !dismissed ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Possible matches</p>
          <ul className="flex flex-col gap-2">
            {features.map((feature) => (
              <li
                key={feature.id}
                className="border-border/70 rounded-2xl border px-4 py-3"
              >
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {feature.where}
                </p>
                {openFeature === feature.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-sm">{feature.summary}</p>
                    {feature.url && feature.label ? (
                      <Button
                        variant="outline"
                        nativeButton={false}
                        className="h-11 w-fit rounded-full px-4"
                        render={
                          <a
                            href={feature.url}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        {feature.label}
                        <ArrowUpRight />
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-11 rounded-full"
                    onClick={() => setOpenFeature(feature.id)}
                  >
                    Yes, that&apos;s it
                  </Button>
                )}
              </li>
            ))}
            {posts.map((post) => (
              <li
                key={post.id}
                className="border-border/70 rounded-2xl border px-4 py-3"
              >
                <p className="text-sm font-medium">{post.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {post.voteCount} votes
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 rounded-full"
                  onClick={() => {
                    setError(null);
                    void onVote(post.id).catch((caught: unknown) => {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "Could not vote.",
                      );
                    });
                  }}
                >
                  Yes, that&apos;s it
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="quiet"
            className="h-11 w-fit rounded-full px-3"
            onClick={() => setDismissed(true)}
          >
            None of these
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm">{error}</p> : null}
      {showSubmit ? (
        <Button
          type="submit"
          className="h-11 w-fit rounded-full px-4"
          disabled={pending}
        >
          Post suggestion
        </Button>
      ) : null}
    </form>
  );
}

function ComposerLive() {
  const create = useMutation(api.posts.create);
  const vote = useMutation(api.posts.vote);
  const router = useRouter();
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <>
      <ComposerForm
        onCreate={async (title, description) => {
          try {
            const result = await create({ title, description });
            router.push(`/posts/${result.id}`);
            return result.id;
          } catch (caught) {
            const message =
              caught instanceof Error ? caught.message : "Could not post.";
            if (message.toLowerCase().includes("sign in")) {
              setSignInOpen(true);
              throw new Error("Sign in to post.");
            }
            throw caught instanceof Error ? caught : new Error(message);
          }
        }}
        onVote={async (postId) => {
          try {
            await vote({ postId: postId as Id<"posts">, next: true });
            router.push(`/posts/${postId}`);
          } catch (caught) {
            const message =
              caught instanceof Error ? caught.message : "Could not vote.";
            if (message.toLowerCase().includes("sign in")) {
              setSignInOpen(true);
              throw new Error("Sign in to vote.");
            }
            throw caught instanceof Error ? caught : new Error(message);
          }
        }}
      />
      <SignInDrawer open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}

export function Composer({ convexEnabled }: { convexEnabled: boolean }) {
  if (!convexEnabled) {
    return (
      <ComposerForm
        onCreate={async () => {
          throw new Error("Suggestions need a Convex deployment.");
        }}
        onVote={async () => {
          throw new Error("Suggestions need a Convex deployment.");
        }}
      />
    );
  }
  return <ComposerLive />;
}
