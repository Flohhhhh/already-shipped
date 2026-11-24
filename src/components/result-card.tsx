"use client";

import { ArrowUpRight, CircleCheck, Settings } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { FeatureEntry, FeatureMatch } from "@/server/search/types";

function primarySource(
  entry: FeatureEntry,
): { url: string; label: string } | null {
  const doc = entry.sources.find((source) => source.label.startsWith("Docs"));
  const release = entry.sources.find((source) =>
    source.label.startsWith("Release"),
  );
  if (entry.kind === "release" && release)
    return { url: release.url, label: "View release note" };
  if (doc) return { url: doc.url, label: "View doc" };
  const first = entry.sources[0];
  if (!first) return null;
  return { url: first.url, label: "View source" };
}

export function ResultCard({
  match,
  percent,
}: {
  match: FeatureMatch;
  percent: number;
}) {
  const reduce = useReducedMotion();
  const source = primarySource(match.entry);
  const where = match.entry.where.replaceAll(", then ", " → ");

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="border-border/70 bg-card/85 w-full rounded-[1.75rem] border p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-6 dark:shadow-[0_10px_40px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          <p className="text-base font-medium">Already shipped.</p>
        </div>
        <p className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-1 text-sm">
          {percent}% match
        </p>
      </div>
      <h2 className="mt-4 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
        {match.entry.title}
      </h2>
      <p className="text-muted-foreground mt-3 flex items-start gap-2 text-sm sm:text-base">
        <Settings aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{where}</span>
      </p>
      {source ? (
        <Button
          variant="outline"
          nativeButton={false}
          className="mt-5 h-11 rounded-full px-4"
          render={<a href={source.url} target="_blank" rel="noreferrer" />}
        >
          {source.label}
          <ArrowUpRight />
        </Button>
      ) : null}
    </motion.article>
  );
}
