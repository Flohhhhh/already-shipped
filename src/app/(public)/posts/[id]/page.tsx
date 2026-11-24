import { Suspense } from "react";

import { PostView } from "@/components/post-view";

async function PostPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <PostView postId={id} />
    </div>
  );
}

export default function PostPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <Suspense fallback={null}>
      <PostPageContent params={params} />
    </Suspense>
  );
}
