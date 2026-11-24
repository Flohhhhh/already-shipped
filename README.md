# already-shipped

A public suggestion board for T3 Code. Unofficial, and not affiliated with T3.

Typing a request shows likely duplicates: existing posts, and features already in the T3 Code index. Posting and voting need GitHub or Discord. OpenRouter runs only in scheduled Convex jobs.

## Setup

Node 22 (see `.nvmrc`) and pnpm 10.33.4.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Feature matches work from `data/feature-index.json` before Convex is configured. The board, votes, and digest need the steps below.

### 1. Convex

```bash
npx convex dev
```

That writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`. Restart `pnpm dev` after it does. Commit the generated files in `convex/_generated`.

The same `NEXT_PUBLIC_CONVEX_URL` goes in the Vercel project env for Production and Preview.

### 2. GitHub OAuth app

Create a GitHub OAuth app. Authorization callback URL:

```text
https://<deployment>.convex.site/oauth/github/callback
```

`<deployment>` is the Convex deployment name. The callback host is the Convex site URL, not the Next.js app. For a local `npx convex dev` backend the callback is:

```text
http://127.0.0.1:3211/oauth/github/callback
```

Set the client id and secret on the Convex deployment:

```bash
npx convex env set AUTH_GITHUB_CLIENT_ID <id>
npx convex env set AUTH_GITHUB_CLIENT_SECRET <secret>
```

### 3. Discord OAuth app

In the Discord application, OAuth2 redirect:

```text
https://<deployment>.convex.site/oauth/discord/callback
```

Local backend:

```text
http://127.0.0.1:3211/oauth/discord/callback
```

```bash
npx convex env set AUTH_DISCORD_CLIENT_ID <id>
npx convex env set AUTH_DISCORD_CLIENT_SECRET <secret>
```

`convex/convex.config.ts` requires those four auth variables before a deployment push. Browsing stays open. Posting and voting accept either provider.

Optional extra browser origins (preview URLs), comma-separated:

```bash
npx convex env set AUTH_ALLOWED_ORIGINS https://your-preview.vercel.app
```

`http://localhost:3000` and `https://already-shipped.vercel.app` are already allowed.

### 4. OpenRouter (optional)

Set the key on Convex when you have it. Without it, model steps no-op. The daily shipped check can still queue a review suggestion from the committed release lines. It never auto-closes those lexical matches.

```bash
npx convex env set OPENROUTER_API_KEY <key>
npx convex env set OPENROUTER_MODEL openai/gpt-6-luna
npx convex env set OPENROUTER_EMBEDDING_MODEL openai/text-embedding-3-small
npx convex env set SHIPPED_AUTO_CLOSE_THRESHOLD 0.9
```

`OPENROUTER_MODEL` defaults to `openai/gpt-6-luna` when unset. `openai/gpt-5.6-luna` is the other verified slug. Embeddings default to `openai/text-embedding-3-small` with 1536 dimensions. Do not put this key in Next.js or Vercel.

A nightly job runs at 08:00 UTC, which is 03:00 in America/New_York during standard time (04:00 during daylight time; Convex crons stay on UTC). It fetches new T3 Code GitHub releases, rewrites each bullet, embeds it, and upserts it. The first run takes only the newest three releases. The cursor moves only after those releases are stored. The same pass checks open requests. A match auto-closes only when the embedding clears its bar and the model confidence is at least `SHIPPED_AUTO_CLOSE_THRESHOLD` (default `0.9`). Lower matches stay as “Possibly shipped, pending review”. Undo on `/admin` reopens a request and blocks that same release line from matching it again.

### 5. Admin (Convex only)

`/admin` asks the Convex query `isAdmin`. Confirm, dismiss, and reopen check the same allowlists again inside the mutation. These variables are not read by Next.js and are not required on Vercel.

```bash
npx convex env set ADMIN_GITHUB_IDS 48927090
npx convex env set ADMIN_EMAILS ""
npx convex env set ADMIN_DISCORD_IDS ""
```

`ADMIN_GITHUB_IDS` matches the numeric GitHub account id. When it is unset, Convex treats `48927090` as the allowlist. Setting the variable replaces that default. `ADMIN_EMAILS` is an optional comma-separated list matched only against a verified GitHub email (`user:email` is already requested by the GitHub auth component). Leave it empty until you add addresses. Do not commit a real email. `ADMIN_DISCORD_IDS` is an optional comma-separated list of Discord account ids.

### 6. Public request ingestion (optional)

The nightly job also reads public GitHub issues and discussions from `pingdotgg/t3code`, and public X posts that mention or reply to @theo about T3 Code. Classification uses the OpenRouter key. Without that key, this pass does nothing. Without `X_BEARER_TOKEN`, the X search is skipped. `GITHUB_TOKEN` is optional: issues can be read anonymously, and discussions are skipped until a token is set.

```bash
npx convex env set GITHUB_TOKEN <token>
npx convex env set X_BEARER_TOKEN <token>
```

Do not put either token in Next.js or on Vercel. A match adds the original link and one signal vote to the existing request. A new request is stored as pending and stays off the public board until an admin approves or rejects it on `/admin`. Each source keeps its own cursor. An @-mention that files a request directly is not built; the nightly ingest path is where that would connect later.

## Environment

| Variable                              | Where              | Required             | Purpose                                                |
| ------------------------------------- | ------------------ | -------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL`              | Next.js and Vercel | For the board        | Convex URL written by `npx convex dev`                 |
| `AUTH_GITHUB_CLIENT_ID`               | Convex             | For GitHub sign-in   | GitHub OAuth client id                                 |
| `AUTH_GITHUB_CLIENT_SECRET`           | Convex             | For GitHub sign-in   | GitHub OAuth client secret                             |
| `AUTH_DISCORD_CLIENT_ID`              | Convex             | For Discord sign-in  | Discord OAuth client id                                |
| `AUTH_DISCORD_CLIENT_SECRET`          | Convex             | For Discord sign-in  | Discord OAuth client secret                            |
| `AUTH_ALLOWED_ORIGINS`                | Convex             | No                   | Extra comma-separated browser origins                  |
| `OPENROUTER_API_KEY`                  | Convex             | No                   | Background jobs. Missing key skips model calls         |
| `OPENROUTER_MODEL`                    | Convex             | No                   | Defaults to `openai/gpt-6-luna`                        |
| `OPENROUTER_EMBEDDING_MODEL`          | Convex             | No                   | Defaults to `openai/text-embedding-3-small`            |
| `SHIPPED_AUTO_CLOSE_THRESHOLD`        | Convex             | No                   | Defaults to `0.9`. Lexical matches never auto-close    |
| `ADMIN_GITHUB_IDS`                    | Convex only        | No                   | GitHub account ids. Unset defaults to `48927090`       |
| `ADMIN_EMAILS`                        | Convex only        | No                   | Verified GitHub emails. Leave empty                    |
| `ADMIN_DISCORD_IDS`                   | Convex only        | No                   | Discord account ids. No default                        |
| `GITHUB_TOKEN`                        | Convex only        | No                   | Higher GitHub rate limit. Discussions need it          |
| `X_BEARER_TOKEN`                      | Convex only        | No                   | Public X search. Unset skips X                         |
| `ALREADY_SHIPPED_MATCHER`             | Next.js            | No                   | Set to `embeddings` to rerank typing-time matches      |
| `ALREADY_SHIPPED_EMBEDDINGS_BASE_URL` | Next.js            | Only with embeddings | OpenAI-compatible base URL                             |
| `ALREADY_SHIPPED_EMBEDDINGS_API_KEY`  | Next.js            | No                   | Bearer token when the embeddings endpoint requires one |
| `ALREADY_SHIPPED_EMBEDDINGS_MODEL`    | Next.js            | No                   | Defaults to `text-embedding-3-small`                   |
| `SKIP_ENV_VALIDATION`                 | Next.js            | No                   | Set to `1` to skip Next.js env validation              |

Embeddings also need a local `data/feature-embeddings.json` map of entry id to vector. That file is gitignored. If anything in that path fails, typing-time search stays lexical.

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

`format:check`, `format:write`, `lint`, and `lint:fix` accept file paths. With no path they scan the project. `typecheck` always uses the Next.js and Convex project configs. `pnpm index` regenerates `data/feature-index.json` from the T3 Code GitHub repo and needs the `gh` CLI.

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

Those commands do not need Convex, OAuth, or an OpenRouter key. `pnpm typecheck` generates Next.js route types itself.
