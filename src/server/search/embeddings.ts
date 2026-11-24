export type EmbeddingConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
};

type EmbeddingResponse = {
  data?: { index?: number; embedding?: number[] }[];
};

export async function embedQuery(
  text: string,
  config: EmbeddingConfig,
): Promise<number[] | null> {
  try {
    const response = await fetch(
      `${config.baseUrl.replace(/\/$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey
            ? { authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({ model: config.model, input: text }),
      },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as EmbeddingResponse;
    const vector = json.data?.[0]?.embedding;
    if (!vector || vector.length === 0) return null;
    return vector;
  } catch {
    return null;
  }
}

export async function embedTexts(
  texts: readonly string[],
  config: EmbeddingConfig,
): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  try {
    const response = await fetch(
      `${config.baseUrl.replace(/\/$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey
            ? { authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({ model: config.model, input: [...texts] }),
      },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as EmbeddingResponse;
    const ordered = [...(json.data ?? [])].sort(
      (left, right) => (left.index ?? 0) - (right.index ?? 0),
    );
    const vectors = ordered.map((item) => item.embedding ?? []);
    if (
      vectors.length !== texts.length ||
      vectors.some((vector) => vector.length === 0)
    ) {
      return null;
    }
    return vectors;
  } catch {
    return null;
  }
}
