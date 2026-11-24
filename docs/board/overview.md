# Suggestion board

The home page is a public list of feature requests. Each post is a title, a description, and a vote count. The list can be sorted by votes or by newest. Anyone can read it. Posting and voting require a signed-in GitHub or Discord account, and each account has one vote per post.

## Typing-time matches

While a title is being typed, `/api/dedup` returns likely duplicates. It does not call OpenRouter.

- Shipped T3 Code features come from `data/feature-index.json` through the lexical matcher. If `ALREADY_SHIPPED_MATCHER=embeddings` is configured and the embeddings call succeeds, feature search uses that rerank. A failure stays on the lexical matcher.
- Existing posts come from the Convex `posts.similar` query, ranked with the same token overlap used at submit time. When embeddings are configured, those already-selected posts are reordered by cosine similarity. A failure keeps the lexical order.

Each suggestion has one action, “Yes, that's it”. A shipped feature shows where it lives. An existing post gets the signed-in user’s vote. “None of these” reveals the submit button. Submitting still checks for a near-duplicate and adds a vote to that post instead of creating another row.

## Background passes

Creating a post schedules `jobs.enrichPost`. That action no-ops without `OPENROUTER_API_KEY`. With a key, it stores a cleaned title and a category, and it queues possible-duplicate rows for the author to confirm or dismiss. Confirmation does not merge posts or move votes.

A daily lexical check can queue “Possibly shipped, pending review”. It never auto-closes, and it does not need the OpenRouter key. The nightly changelog job, which no-ops without the key, can mark a request “Shipped (auto-detected)” only when an embedding match and the model confidence both clear the threshold. `/admin` lists pending suggestions and recent auto-closes. That page and its buttons use the Convex `isAdmin` query and server-side checks. Admin allowlists are Convex environment variables, not Next.js or Vercel.

The same nightly pass can ingest public GitHub and X requests. Those stay off the board until an admin approves them. A near-duplicate adds a source link and a signal vote instead of a second post.

The weekly refresh rewrites raw release lines into one-line summaries and drops test, chore, and CI noise. It no-ops without the key. The weekly digest summarizes top requested themes onto `/digest` and also no-ops without the key.
