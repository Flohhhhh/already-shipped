import { Proposals } from "@/components/proposal-list";
import { env } from "@/env";

export default function ProposedPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-6 sm:max-w-2xl sm:py-10">
      <Proposals
        enabled={Boolean(env.NEXT_PUBLIC_CONVEX_URL)}
        convexUrl={env.NEXT_PUBLIC_CONVEX_URL}
      />
    </div>
  );
}
