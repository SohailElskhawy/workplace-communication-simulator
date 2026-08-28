import { z } from "zod";

const ApiEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_ORIGIN: z.url({ protocol: /^https?$/ }).default("http://localhost:3000"),
});

export function parseApiEnv(input: Record<string, string | undefined>) {
  return ApiEnvSchema.parse(input);
}

export const apiEnv = parseApiEnv(process.env);
