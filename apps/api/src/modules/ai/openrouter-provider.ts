import { z } from "zod";

import type {
  EvaluationMessage,
  RawAiEvaluation,
} from "./evaluation-prompt.js";
import { RawAiEvaluationSchema } from "./evaluation-prompt.js";
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

export interface OpenRouterEvaluationRequest {
  model: string;
  messages: EvaluationMessage[];
  timeoutMs: number;
}

export interface OpenRouterEvaluationResult {
  evaluation: RawAiEvaluation;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
}

export interface OpenRouterProvider {
  generateRoleplayReply(
    request: OpenRouterRoleplayRequest,
  ): Promise<OpenRouterRoleplayResult>;
  evaluateSimulation(
    request: OpenRouterEvaluationRequest,
  ): Promise<OpenRouterEvaluationResult>;
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

  async function sendChatCompletion(
    bodyPayload: Record<string, unknown>,
    timeoutMs: number,
  ) {
    const startedAt = clock();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImplementation(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        },
      );
      const latencyMs = Math.max(0, clock() - startedAt);

      if (!response.ok) {
        throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
      }

      const rawResponse = await response.json();
      const parsed = OpenRouterResponseSchema.safeParse(rawResponse);
      const content = parsed.success
        ? parsed.data.choices[0]?.message.content.trim()
        : "";

      if (!parsed.success || !content) {
        throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
      }

      return {
        content,
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
  }

  return {
    async generateRoleplayReply(request) {
      const result = await sendChatCompletion(
        {
          model: request.model,
          messages: request.messages,
          stream: false,
          provider: {
            zdr: true,
            data_collection: "deny",
          },
        },
        request.timeoutMs,
      );

      return {
        text: result.content,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: result.estimatedCost,
      };
    },

    async evaluateSimulation(request) {
      const result = await sendChatCompletion(
        {
          model: request.model,
          messages: request.messages,
          stream: false,
          response_format: { type: "json_object" },
          provider: {
            zdr: true,
            data_collection: "deny",
          },
        },
        request.timeoutMs,
      );

      let jsonPayload: unknown;
      try {
        jsonPayload = JSON.parse(result.content);
      } catch {
        throw new AiProviderError("AI_PROVIDER_ERROR", result.latencyMs);
      }

      const evaluated = RawAiEvaluationSchema.safeParse(jsonPayload);
      if (!evaluated.success) {
        throw new AiProviderError("AI_PROVIDER_ERROR", result.latencyMs);
      }

      return {
        evaluation: evaluated.data,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: result.estimatedCost,
      };
    },
  };
}
