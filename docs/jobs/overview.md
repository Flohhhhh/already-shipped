# Background jobs

OpenRouter runs only inside Convex actions. Typing-time duplicate suggestions never call it.

| Job                  | Schedule          | Without `OPENROUTER_API_KEY`                                       |
| -------------------- | ----------------- | ------------------------------------------------------------------ |
| `jobs.enrichPost`    | After a new post  | No title cleanup, category, or duplicate queue                     |
| `jobs.refreshIndex`  | Sundays 06:00 UTC | No rewritten release lines                                         |
| `jobs.flagShipped`   | Daily 07:00 UTC   | Queues a review suggestion from committed lines. Never auto-closes |
| `jobs.syncChangelog` | Daily 08:00 UTC   | The whole pass no-ops, including embeddings and ingestion          |
| `jobs.writeDigest`   | Mondays 07:00 UTC | No new digest                                                      |

08:00 UTC is 03:00 in America/New_York during standard time and 04:00 during daylight time. Convex crons cannot follow daylight saving time.

The model is `OPENROUTER_MODEL` on the Convex deployment. When that variable is unset, jobs call `openai/gpt-6-luna`. `openai/gpt-5.6-luna` is an accepted override. Embeddings use `OPENROUTER_EMBEDDING_MODEL`, default `openai/text-embedding-3-small`. Set these with `npx convex env set`, not in the Next.js env file.

`syncChangelog` fetches new T3 Code releases, stores one-line summaries, and checks open requests. Auto-close requires an embedding hit and confidence at or above `SHIPPED_AUTO_CLOSE_THRESHOLD` (default `0.9`). Anything from `0.6` up to that threshold stays pending. Confirm marks the request shipped. Dismiss and reopen both block that release line from being suggested again. Every decision is logged.

Admin allowlists `ADMIN_GITHUB_IDS`, `ADMIN_EMAILS`, and `ADMIN_DISCORD_IDS` are Convex environment variables. The `/admin` page gates on the `isAdmin` query. Each admin mutation checks again on the server. Next.js does not read them, so they are not set on Vercel. `ADMIN_EMAILS` stays empty in examples. Do not commit a real email.

The same nightly pass ingests public GitHub issues, GitHub discussions, and X posts that mention or reply to @theo about T3 Code. `X_BEARER_TOKEN` skips X when unset. `GITHUB_TOKEN` is optional for issues and required for discussions. Both are Convex environment variables, not Vercel. Each item is classified with OpenRouter. A near-duplicate links the source and adds one signal vote. Anything new stays in the admin queue until approve or reject. Cursors are per source, and a source key is stored once.

An @-mention that files a request is not implemented. That hook would call this ingest path later.

Duplicate post suggestions are stored as `mergeSuggestions`. Nothing in these jobs deletes a post or combines vote counts.
