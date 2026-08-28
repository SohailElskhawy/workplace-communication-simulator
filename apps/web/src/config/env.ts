import { z } from "zod";

const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .url({ protocol: /^https?$/ })
    .default("http://localhost:4000"),
});

export function parseWebEnv(input: Record<string, string | undefined>) {
  return WebEnvSchema.parse(input);
}

export const webEnv = parseWebEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
