import type { RemoteRequest } from "./github";

const SEARCH_URL = "https://api.x.com/2/tweets/search/recent";
const MENTION_QUERY =
  '(@theo OR to:theo) ("T3 Code" OR t3code OR "T3Code") -is:retweet';
const POST_QUERY = 'from:theo ("T3 Code" OR t3code OR "T3Code") -is:retweet';

type Tweet = { id: string; text: string };

async function searchTweets(
  token: string,
  query: string,
  sinceId: string | null,
): Promise<Tweet[] | null> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("tweet.fields", "created_at");
  if (sinceId) url.searchParams.set("since_id", sinceId);
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: { id?: string; text?: string }[];
    };
    if (!json.data) return [];
    const tweets: Tweet[] = [];
    for (const tweet of json.data) {
      if (typeof tweet.id !== "string" || typeof tweet.text !== "string")
        continue;
      tweets.push({ id: tweet.id, text: tweet.text.slice(0, 700) });
    }
    return tweets;
  } catch {
    return null;
  }
}

function asRequest(tweet: Tweet): RemoteRequest {
  return {
    sourceId: `x:${tweet.id}`,
    url: `https://x.com/i/status/${tweet.id}`,
    cursor: tweet.id,
    text: tweet.text,
  };
}

export async function fetchXRequests(
  token: string | undefined,
  sinceId: string | null,
): Promise<{ mentions: RemoteRequest[]; replies: RemoteRequest[] } | null> {
  if (!token) return null;
  const mentions = await searchTweets(token, MENTION_QUERY, sinceId);
  if (!mentions) return null;
  const posts = await searchTweets(token, POST_QUERY, null);
  const replies: RemoteRequest[] = [];
  const seen = new Set(mentions.map((tweet) => tweet.id));
  if (posts) {
    for (const post of posts.slice(0, 3)) {
      const found = await searchTweets(
        token,
        `conversation_id:${post.id} -from:theo -is:retweet`,
        null,
      );
      if (!found) continue;
      for (const tweet of found) {
        if (tweet.id === post.id || seen.has(tweet.id)) continue;
        seen.add(tweet.id);
        replies.push(asRequest(tweet));
      }
    }
  }
  return { mentions: mentions.map(asRequest), replies };
}
