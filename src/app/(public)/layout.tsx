import { Suspense } from "react";

import { Atmosphere } from "@/components/atmosphere";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <Atmosphere />
      <Suspense fallback={null}>
        <SiteHeader />
      </Suspense>
      <main className="flex flex-1 flex-col">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <footer className="text-muted-foreground px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm">
        Unofficial. Not affiliated with T3.
      </footer>
    </div>
  );
}
