# Posts

Requests live in Convex as posts. The old public proposal list and browser voter id are gone. Near-duplicate text still uses the shared fingerprint helper.

## Data

- `users`: display name, image, and `github` or `discord`.
- `posts`: title, description, token key, optional cleaned title, category, shipped version, vote count, author.
- `postTokens`: one row per token, used to load a bounded candidate set.
- `votes`: one row per post and user.
- `mergeSuggestions`: a possible duplicate queued for confirmation. Status is `pending`, `confirmed`, or `dismissed`.
- `catalogNotes`: cleaned one-line release summaries written by the index refresh.
- `digests`: weekly theme summaries.

## Rules

A title is 8–120 characters and a description is 8–2000. The title needs at least two meaningful tokens. An exact token key, or a Jaccard match at or above 0.72, adds a vote to the existing post instead of creating another. The author starts with one vote. Voting again removes it.

Signing in uses Convex Auth with GitHub and Discord. Browsing does not require an account. `jobs.enrichPost` may later clean the title, set a category, and queue merge suggestions. Those suggestions never merge the rows.

## Without Convex

Feature matches in the composer still run from the committed index. The list, votes, digest, and background jobs need `NEXT_PUBLIC_CONVEX_URL`.
