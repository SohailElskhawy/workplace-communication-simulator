import { z } from "zod";

const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

export function parseWebEnv(input: Record<string, string | undefined>) {
  return WebEnvSchema.parse(input);
}

export function getWebEnv() {
  return parseWebEnv({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}
