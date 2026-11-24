# already-shipped

Type a feature idea and see if T3 Code already does it. Unofficial, and not affiliated with T3.

## Setup

Node 22 (see `.nvmrc`) and pnpm 10.33.4.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Search works immediately from `data/feature-index.json`.

Proposals and votes need a Convex deployment:

```bash
npx convex dev
```

That writes `NEXT_PUBLIC_CONVEX_URL` (and `CONVEX_DEPLOYMENT`) into `.env.local`. Restart `pnpm dev` after it does. The generated Convex types in `convex/_generated` are committed so typecheck does not need a login. After changing Convex functions, run `npx convex codegen` or leave `npx convex dev` running.

## Environment

| Variable                              | Required             | Purpose                                                             |
| ------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`              | For proposals        | Convex cloud URL written by `npx convex dev`                        |
| `ALREADY_SHIPPED_MATCHER`             | No                   | Set to `embeddings` to opt into vector reranking                    |
| `ALREADY_SHIPPED_EMBEDDINGS_BASE_URL` | Only with embeddings | OpenAI-compatible base URL, for example `https://api.openai.com/v1` |
| `ALREADY_SHIPPED_EMBEDDINGS_API_KEY`  | No                   | Bearer token when the endpoint requires one                         |
| `ALREADY_SHIPPED_EMBEDDINGS_MODEL`    | No                   | Defaults to `text-embedding-3-small`                                |
| `SKIP_ENV_VALIDATION`                 | No                   | Set to `1` to skip Next.js env validation                           |

Embeddings also need a local `data/feature-embeddings.json` map of entry id to vector. That file is gitignored. If anything in the embeddings path is missing or the request fails, search stays on the lexical matcher.

## Scripts

```bash
pnpm dev
pnpm build
pnpm index
pnpm format:check .
pnpm format:write src/app/layout.tsx src/env.ts
pnpm lint .
pnpm lint src/server/search/match.ts
pnpm typecheck
pnpm test:unit
pnpm test:unit tests/unit/search
pnpm test:unit tests/unit/search/match.test.ts
```

`format:check`, `format:write`, `lint`, and `lint:fix` accept file paths. With no path they scan the project. `typecheck` always uses the Next.js and Convex project configs; it is not a single-file check. `pnpm index` regenerates `data/feature-index.json` from the T3 Code GitHub repo and needs the `gh` CLI.

## Branches

`main` is the default branch. `development` is the integration branch. Feature branches come off `development`. GitHub Actions runs Prettier, lint, typecheck, and unit tests as separate workflows on pull requests and on pushes to `main` and `development`.

## Fresh clone

```bash
pnpm install
pnpm format:check .
pnpm lint .
pnpm typecheck
pnpm test:unit
pnpm build
```

Those commands do not need Convex or an embeddings key. `pnpm typecheck` generates Next.js route types itself.
