# Server structure

Search and proposals stay in separate domains. Persistence, business rules, and transport entrypoints do not import each other upward.

```text
src/server/search/match.ts        # pure matching
src/server/search/embeddings.ts   # optional HTTP embeddings
src/server/search/service.ts      # catalog read used by the page
src/proposals/fingerprint.ts      # shared proposal text rules
convex/schema.ts
convex/proposals/data.ts          # Convex reads and writes
convex/proposals/service.ts       # validation and dedupe
convex/proposals.ts               # public query and mutation handlers
```

## Layers

- **Data:** raw Convex reads and writes. No voting rules and no text policy.
- **Service:** validation, dedupe, vote counts, and the search decision. Next.js server components call the search service. Convex handlers call the proposal service.
- **Handlers:** `convex/proposals.ts` registers queries and mutations. They validate arguments and delegate. They are not Next.js Server Actions. This app does not use Server Actions; search is a server-component read.

There is no SQL database, so Drizzle `where` rules are not enabled. Convex `ctx.db` stays inside `convex/proposals/data.ts`.

Dependencies flow from handlers to services to data. UI imports the Convex generated `api` and React hooks, not data or service modules. The proposal list is public: there are no accounts. A voter id is a random UUID stored in the browser. That stops casual double votes on one browser and does not stop someone from minting more ids.

## Reads and mutations

`list` reads the top 50 proposals by vote count through the `by_voteCount` index. `propose` looks up an exact normalized key and a bounded set of token-index candidates, then inserts or adds a vote. `vote` toggles one voter’s vote and updates the stored count in the same mutation.

Near-duplicate detection compares canonical tokens with Jaccard similarity. It only sees proposals that share an indexed token (or the exact key), capped per token, so it does not scan the whole table.

## Enforcement and tests

ESLint `server-boundaries/layers` blocks UI and route code from importing data modules, blocks data from importing services or handlers, and blocks services from importing handlers. Alias restrictions do the same for `@/server/**/data` and `convex/**/data`. Type-only imports are not treated as runtime boundary breaks. The rule follows relative imports, aliases, re-exports, literal dynamic imports, and literal `require` calls. It does not follow non-literal dynamic imports.

Tests under `tests/unit/search/`, `tests/unit/proposals/`, and `tests/unit/index/` cover matching, dedupe, and index parsing. They do not prove the Convex deployment is reachable.

## Docs

Search behavior is in `docs/search/`. Proposal behavior is in `docs/proposals/`.
