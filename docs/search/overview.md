# Search

The suggestion composer looks up a typed idea in a committed index of real T3 Code settings, user docs, and release notes. That lookup is lexical by default, with an optional embeddings rerank. It does not call OpenRouter.

## Index

`pnpm index` reads public GitHub data for `pingdotgg/t3code`:

- Setting titles, sections, and the app’s own search phrases in `apps/web/src/components/settings/settingsSearch.ts`.
- Headings and body text in `docs/user`.
- Bullet items from recent stable releases and nightlies.

Every entry stores at least one `https://github.com/pingdotgg/t3code` URL. The script refuses to write an index that does not contain the Labs setting **Boring sidebar (group by project)**. Dynamic rows whose titles are not string literals, such as generated keybinding names, are skipped rather than guessed.

Synonyms used at query time (`group` / `grouping`, `project` / `repo`, `boring` / `classic`, and a few others) are matching aids. They are not extra features in the index.

## Matching

The default matcher tokenizes the query, drops stop words, and scores title matches above search phrases, location, and summary text. A result is returned only when enough of the query is present. “group projects in the sidebar” and “boring mode” are expected to land on Boring sidebar, located at Settings, then Labs.

Optional embeddings rerank that result when all of the following are true:

- `ALREADY_SHIPPED_MATCHER=embeddings`
- `ALREADY_SHIPPED_EMBEDDINGS_BASE_URL` points at an OpenAI-compatible `/embeddings` endpoint
- `data/feature-embeddings.json` exists locally (it is gitignored)
- the request returns a vector

Otherwise the lexical result is used, including when the request errors.

## Suggestions

`/api/dedup` returns up to four feature matches for the title and description being typed. The list stays empty until the title is long enough to search. “Yes, that's it” shows where that feature lives and links to its doc or release note. Existing posts are returned from Convex in the same response and are not part of this index.
