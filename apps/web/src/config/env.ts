import { z } from "zod";

const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url({ protocol: /^https?$/ }).optional(),
  ),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().trim().min(1).optional(),
  // UI-only gate for the ElevenLabs live conversation spike; never a secret.
  NEXT_PUBLIC_ENABLE_REALTIME_VOICE: z.preprocess(
    (value) =>
      value === undefined ? undefined : value === "true" || value === "1",
    z.boolean().optional(),
  ),
});

export function parseWebEnv(input: Record<string, string | undefined>) {
  return WebEnvSchema.parse(input);
}

export function getWebEnv() {
  return parseWebEnv({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    NEXT_PUBLIC_ENABLE_REALTIME_VOICE:
      process.env.NEXT_PUBLIC_ENABLE_REALTIME_VOICE,
  });
}
