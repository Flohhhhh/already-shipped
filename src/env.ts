import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    ALREADY_SHIPPED_MATCHER: z.enum(["lexical", "embeddings"]).optional(),
    ALREADY_SHIPPED_EMBEDDINGS_BASE_URL: z.url().optional(),
    ALREADY_SHIPPED_EMBEDDINGS_API_KEY: z.string().min(1).optional(),
    ALREADY_SHIPPED_EMBEDDINGS_MODEL: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.url().optional(),
  },
  runtimeEnv: {
    ALREADY_SHIPPED_MATCHER: process.env.ALREADY_SHIPPED_MATCHER,
    ALREADY_SHIPPED_EMBEDDINGS_BASE_URL:
      process.env.ALREADY_SHIPPED_EMBEDDINGS_BASE_URL,
    ALREADY_SHIPPED_EMBEDDINGS_API_KEY:
      process.env.ALREADY_SHIPPED_EMBEDDINGS_API_KEY,
    ALREADY_SHIPPED_EMBEDDINGS_MODEL:
      process.env.ALREADY_SHIPPED_EMBEDDINGS_MODEL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
