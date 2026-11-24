# Search

The home page asks “Does T3 Code already do this?” and looks up the idea in a committed index of real T3 Code settings, user docs, and release notes.

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

While the field is empty and focused, recent searches saved in this browser are listed when any exist. Typing asks `/api/suggest` for a few real index matches and keeps the list closed until one exists. Arrow keys move the highlight. Enter opens the highlighted row and keeps the typed question in the field. The return button searches the typed question directly.

## What a hit shows

The card says the feature already shipped, shows the real title, where to find it, a match percent derived from the score, and one source link. A doc link is preferred when the entry has one. Release entries link to the release note.
