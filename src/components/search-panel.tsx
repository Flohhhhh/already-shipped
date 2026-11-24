import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ProposeForm } from "@/components/proposal-list";
import { ResultCard } from "@/components/result-card";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { matchPercent } from "@/server/search/match";
import type { SearchResult } from "@/server/search/types";

export function SearchPanel({
  query,
  result,
  proposalsEnabled,
  convexUrl,
}: {
  query: string;
  result: SearchResult | null;
  proposalsEnabled: boolean;
  convexUrl?: string;
}) {
  const best = result?.best ?? null;

  return (
    <div className="mx-auto my-auto flex w-full max-w-xl flex-col gap-8 px-4 py-8 sm:max-w-2xl sm:gap-10 sm:py-12">
      <h1 className="text-center text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
        Does T3 Code already do this?
      </h1>
      <SearchField key={query} initialQuery={query} />
      {best ? <ResultCard match={best} percent={matchPercent(best)} /> : null}
      {result && !best ? (
        <section className="border-border/70 bg-card/85 w-full rounded-[1.75rem] border p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Not found yet.
          </h2>
          <p className="text-muted-foreground mt-2 text-sm text-balance sm:text-base">
            {query}
          </p>
          <div className="mt-5">
            {proposalsEnabled && convexUrl ? (
              <ConvexClientProvider
                url={convexUrl}
                fallback={
                  <Button
                    type="button"
                    disabled
                    className="h-11 w-full rounded-full sm:w-auto"
                  >
                    Propose
                  </Button>
                }
              >
                <ProposeForm text={query} />
              </ConvexClientProvider>
            ) : (
              <p>Proposals need a Convex deployment. Search still works.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
