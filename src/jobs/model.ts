export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-6-luna";
export const DEFAULT_OPENROUTER_EMBEDDING_MODEL =
  "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function resolveOpenRouterModel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_OPENROUTER_MODEL;
}

export function resolveEmbeddingModel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_OPENROUTER_EMBEDDING_MODEL;
}

export function shouldCallOpenRouter(apiKey: string | undefined): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}
