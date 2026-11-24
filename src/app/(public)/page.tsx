import { Suspense } from "react";

import { SearchPanel } from "@/components/search-panel";
import { env } from "@/env";
import { withPickedMatch } from "@/server/search/match";
import { searchCatalog } from "@/server/search/service";

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; pick?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const pick = typeof params.pick === "string" ? params.pick : undefined;
  const found = query ? await searchCatalog(query) : null;
  const result = found ? withPickedMatch(found, pick) : null;
  return (
    <SearchPanel
      query={query}
      result={result}
      proposalsEnabled={Boolean(env.NEXT_PUBLIC_CONVEX_URL)}
      convexUrl={env.NEXT_PUBLIC_CONVEX_URL}
    />
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense
      fallback={<SearchPanel query="" result={null} proposalsEnabled={false} />}
    >
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
