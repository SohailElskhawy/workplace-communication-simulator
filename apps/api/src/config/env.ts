import { z } from "zod";

const ExplicitOpenRouterModelSchema = z
  .string()
  .trim()
  .min(1)
  .refine((model) => model !== "openrouter/auto", {
    message: "OpenRouter automatic model routing is not allowed",
  });

const OptionalUrlSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url({ protocol: /^https?$/ }).optional(),
);
const OptionalStringSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);
const TimeoutSchema = z.coerce.number().int().positive().max(120_000);

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
  ROLEPLAY_PROMPT_VERSION: z.literal("roleplay-v2"),
  EVALUATION_MODEL: ExplicitOpenRouterModelSchema,
  EVALUATION_PROMPT_VERSION: z
    .literal("evaluation-v2")
    .default("evaluation-v2"),
  TRANSCRIPTION_MODEL: ExplicitOpenRouterModelSchema,
  TTS_MODEL: ExplicitOpenRouterModelSchema,
  ROLEPLAY_TIMEOUT_MS: TimeoutSchema.default(25_000),
  EVALUATION_TIMEOUT_MS: TimeoutSchema.default(60_000),
  TRANSCRIPTION_TIMEOUT_MS: TimeoutSchema.default(25_000),
  TTS_TIMEOUT_MS: TimeoutSchema.default(15_000),
  GENERAL_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(3_600_000)
    .default(60_000),
  GENERAL_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .positive()
    .max(10_000)
    .default(120),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(3_600_000)
    .default(60_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(1_000).default(30),
  SENTRY_DSN: OptionalUrlSchema,
  SENTRY_ENVIRONMENT: OptionalStringSchema,
  SENTRY_RELEASE: OptionalStringSchema,
  // Server-only ElevenLabs realtime voice bootstrap. All three are optional;
  // realtime session endpoints are registered only when all are configured.
  ELEVENLABS_API_KEY: OptionalStringSchema,
  ELEVENLABS_AGENT_ID: OptionalStringSchema,
  ELEVENLABS_TOOL_SECRET: OptionalStringSchema,
  // Server-only shared secret for verifying the ElevenLabs post-call
  // transcription webhook signature. Optional; the public webhook endpoint
  // is registered only when configured.
  ELEVENLABS_WEBHOOK_SECRET: OptionalStringSchema,
});

export function parseApiEnv(input: Record<string, string | undefined>) {
  const normalized = {
    ...input,
    CLERK_PUBLISHABLE_KEY:
      input.CLERK_PUBLISHABLE_KEY ?? input.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };
  return ApiEnvSchema.parse(normalized);
}
