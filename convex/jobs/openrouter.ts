import {
  EMBEDDING_DIMENSIONS,
  resolveEmbeddingModel,
  resolveOpenRouterModel,
  shouldCallOpenRouter,
} from "../../src/jobs/model";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function completeJson(
  system: string,
  user: string,
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!shouldCallOpenRouter(apiKey)) return null;
  const model = resolveOpenRouterModel(process.env.OPENROUTER_MODEL);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0
      ? content
      : null;
  } catch {
    return null;
  }
}

export async function embedDocuments(
  texts: readonly string[],
): Promise<(number[] | null)[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!shouldCallOpenRouter(apiKey) || texts.length === 0) return null;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: resolveEmbeddingModel(process.env.OPENROUTER_EMBEDDING_MODEL),
        input: [...texts],
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: { index?: number; embedding?: number[] }[];
    };
    const ordered = [...(json.data ?? [])].sort(
      (left, right) => (left.index ?? 0) - (right.index ?? 0),
    );
    if (ordered.length !== texts.length) return null;
    return ordered.map((item) => {
      const vector = item.embedding;
      return vector && vector.length === EMBEDDING_DIMENSIONS ? vector : null;
    });
  } catch {
    return null;
  }
}
