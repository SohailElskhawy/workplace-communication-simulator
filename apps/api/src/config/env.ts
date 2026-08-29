import { z } from "zod";

const ExplicitOpenRouterModelSchema = z
  .string()
  .trim()
  .min(1)
  .refine((model) => model !== "openrouter/auto", {
    message: "OpenRouter automatic model routing is not allowed",
  });

const OptionalExplicitOpenRouterModelSchema = z
  .union([z.literal(""), ExplicitOpenRouterModelSchema])
  .default("");

const ApiEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_ORIGIN: z.url({ protocol: /^https?$/ }).default("http://localhost:3000"),
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  DIRECT_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  ROLEPLAY_MODEL: ExplicitOpenRouterModelSchema,
  ROLEPLAY_PROMPT_VERSION: z.literal("roleplay-v1"),
  EVALUATION_MODEL: ExplicitOpenRouterModelSchema,
  EVALUATION_PROMPT_VERSION: z
    .literal("evaluation-v1")
    .default("evaluation-v1"),
  TRANSCRIPTION_MODEL: ExplicitOpenRouterModelSchema,
  TTS_MODEL: OptionalExplicitOpenRouterModelSchema,
  ROLEPLAY_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  EVALUATION_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  TRANSCRIPTION_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  TTS_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export function parseApiEnv(input: Record<string, string | undefined>) {
  const normalized = {
    ...input,
    CLERK_PUBLISHABLE_KEY:
      input.CLERK_PUBLISHABLE_KEY ?? input.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };
  return ApiEnvSchema.parse(normalized);
}
