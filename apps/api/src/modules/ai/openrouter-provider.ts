import { z } from "zod";

import type { RoleplayMessage } from "./roleplay-prompt.js";

const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.int().nonnegative().optional(),
      completion_tokens: z.int().nonnegative().optional(),
      cost: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type AiErrorCode = "AI_TIMEOUT" | "AI_PROVIDER_ERROR";

export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly latencyMs: number;

  constructor(code: AiErrorCode, latencyMs: number) {
    super(
      code === "AI_TIMEOUT"
        ? "AI request timed out."
        : "AI provider request failed.",
    );
    this.name = "AiProviderError";
    this.code = code;
    this.latencyMs = latencyMs;
  }
}

export interface OpenRouterRoleplayRequest {
  model: string;
  messages: RoleplayMessage[];
  timeoutMs: number;
}

export interface OpenRouterRoleplayResult {
  text: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
}

export interface OpenRouterProvider {
  generateRoleplayReply(
    request: OpenRouterRoleplayRequest,
  ): Promise<OpenRouterRoleplayResult>;
}

interface OpenRouterProviderOptions {
  apiKey: string;
  fetchImplementation?: typeof fetch;
  clock?: () => number;
}

export function createOpenRouterProvider(
  options: OpenRouterProviderOptions,
): OpenRouterProvider {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const clock = options.clock ?? Date.now;

  return {
    async generateRoleplayReply(request) {
      const startedAt = clock();
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs);

      try {
        const response = await fetchImplementation(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: request.model,
              messages: request.messages,
              stream: false,
              provider: {
                zdr: true,
                data_collection: "deny",
              },
            }),
            signal: controller.signal,
          },
        );
        const latencyMs = Math.max(0, clock() - startedAt);

        if (!response.ok) {
          throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
        }

        const parsed = OpenRouterResponseSchema.safeParse(
          await response.json(),
        );
        const text = parsed.success
          ? parsed.data.choices[0]?.message.content.trim()
          : "";

        if (!parsed.success || !text) {
          throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
        }

        return {
          text,
          latencyMs,
          inputTokens: parsed.data.usage?.prompt_tokens ?? null,
          outputTokens: parsed.data.usage?.completion_tokens ?? null,
          estimatedCost: parsed.data.usage?.cost ?? null,
        };
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError(
          timedOut ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
          Math.max(0, clock() - startedAt),
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
