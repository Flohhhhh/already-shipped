# Proposals

When search does not find a close feature, the visitor can add the idea to **Proposed: not found**. The same list is on `/proposed`.

## Data

Convex tables:

- `proposals`: text, canonical token key, vote count, created time.
- `proposalTokens`: one row per canonical token, indexed for candidate lookup.
- `votes`: one row per proposal and voter id.

There is no login. The browser stores a UUID and sends it with propose and vote calls. One id can upvote a proposal once. Clicking again removes that vote.

## Dedupe

Text is cleaned, tokenized with the same synonym map as search, and sorted into a key. An exact key hits the `by_normalizedKey` index. Otherwise the mutation loads a bounded set of proposals that share those tokens and keeps the closest one at or above a Jaccard threshold of 0.72. A duplicate does not create a new row; the voter’s vote is added when they have not already voted.

Proposals shorter than 8 characters, longer than 200, or with fewer than two meaningful tokens are rejected.

## Without Convex

`NEXT_PUBLIC_CONVEX_URL` comes from `npx convex dev`. When it is absent, search still runs and the proposal UI says a Convex deployment is required.
