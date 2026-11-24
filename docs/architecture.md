# Architecture

already-shipped is a single Next.js app: a public suggestion board for T3 Code, with duplicate checks against posts and against a cited feature index.

## Stack

- Next.js App Router, React, TypeScript, Tailwind, shadcn/ui (Base UI, Nova preset). The UI uses Instrument Sans, grayscale surfaces, and a bottom sheet for navigation on small screens.
- Vitest for unit tests. Prettier, ESLint, and `tsc` for static checks.
- Convex for posts, votes, and scheduled jobs. Convex Auth for GitHub and Discord sign-in.
- Package manager: pnpm. One app, no workspace packages.

## Routes

```text
src/app/(public)/page.tsx                 # board and composer
src/app/(public)/posts/[id]/page.tsx      # one suggestion
src/app/(public)/digest/page.tsx          # weekly themes
src/app/api/dedup/route.ts                # typing-time matches
src/app/auth/signin/route.ts              # GitHub and Discord completion
src/app/auth/refresh/route.ts
src/app/auth/signout/route.ts
```

Browsing is public. Posting and voting need a session. The proxy refreshes a session cookie when one exists and does not redirect anonymous readers.

## Matching

`/api/dedup` reads `data/feature-index.json` and, when Convex is configured, similar posts. The default matcher is lexical. Optional embeddings rerank features and reorder the post list. OpenRouter is not on this path. See `docs/search/` and `docs/board/`.

## Background work

Convex actions normalize a new post, refresh release lines, flag requests that shipped, and write the weekly digest. See `docs/jobs/`. Missing `OPENROUTER_API_KEY` skips the model calls. The daily shipped flag still uses the committed release lines.

## Environment

Next.js env is validated in `src/env.ts`. OAuth secrets and `OPENROUTER_API_KEY` are Convex deployment env vars, set with `npx convex env set`. `SKIP_ENV_VALIDATION=1` skips Next.js env validation for tooling only.

## Themes and Git

Light, dark, and system themes use `next-themes`. Small screens open Board and Digest from a swipeable bottom sheet. The footer reads “Unofficial. Not affiliated with T3.” Branches: `main`, `development`, and feature branches. GitHub Actions runs Prettier, lint, typecheck, and unit tests separately.
