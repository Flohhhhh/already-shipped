# Server structure

Search, posts, and background jobs stay in separate domains. Persistence, business rules, and transport entrypoints do not import each other upward.

```text
src/server/search/match.ts         # pure feature matching
src/server/search/embeddings.ts    # optional HTTP embeddings
src/server/search/service.ts       # catalog read
src/server/dedup/service.ts        # typing-time feature and post matches
src/posts/draft.ts                 # title and description rules
src/posts/rank.ts                  # lexical post ranking
src/jobs/parse.ts                  # model output parsers
src/jobs/model.ts                  # OpenRouter model id and key check
src/jobs/shipped.ts                # lexical shipped match
convex/posts/data.ts               # post, vote, and merge rows
convex/posts/service.ts            # auth, dedupe, votes
convex/posts.ts                    # public queries and mutations
convex/jobs/data.ts                # catalog notes and digests
convex/jobs/service.ts             # enrichment, shipped flags, digests
convex/jobs.ts                     # internal actions and the digest query
convex/auth.ts                     # Convex Auth, GitHub, Discord
convex/crons.ts                    # daily and weekly schedules
```

## Layers

- **Data:** Convex reads and writes. No voting rules and no model calls.
- **Service:** validation, dedupe, vote counts, and enrichment rules. Next.js route handlers call the dedup service. Convex handlers call the post and job services.
- **Handlers:** `convex/posts.ts` and `convex/jobs.ts` register queries, mutations, and actions. They are not Next.js Server Actions. This app does not use Server Actions.

There is no SQL database. Convex `ctx.db` stays inside `convex/**/data.ts` except the auth user create mutations, which write the user row Convex Auth asks them to return.

Dependencies flow from handlers to services to data. UI imports the Convex generated `api` and React hooks, not data or service modules.

## Reads and mutations

`posts.list` reads at most 50 posts through `by_voteCount` or `by_createdAt`. `posts.similar` and `posts.create` load a bounded token-index candidate set. `posts.create` schedules `jobs.enrichPost` only after a new row is inserted. Merge confirmation updates one suggestion’s status.

`jobs.listDigests` reads at most 12 digests. Catalog notes are read with `take`. Scheduled actions do not scan unbounded tables.

## Enforcement and tests

ESLint `server-boundaries/layers` blocks UI and route code from importing data modules, blocks data from importing services or handlers, and blocks services from importing handlers. Type-only imports are not treated as runtime boundary breaks.

Tests under `tests/unit/search/`, `tests/unit/proposals/`, `tests/unit/posts/`, `tests/unit/jobs/`, and `tests/unit/index/` cover matching, dedupe, drafts, parsers, and index parsing. They do not prove the Convex deployment is reachable.

## Docs

Search behavior is in `docs/search/`. Posts are in `docs/proposals/` and `docs/board/`. Background jobs are in `docs/jobs/`.
