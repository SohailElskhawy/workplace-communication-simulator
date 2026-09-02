import { z } from "zod";

import type { AppLogger } from "../../infrastructure/logging/logger.js";
import type { CustomScenarioMessage } from "./custom-scenario-prompt.js";
import { validateCustomScenarioOutput } from "./custom-scenario-prompt.js";
import type {
  EvaluationMessage,
  RawAiEvaluation,
} from "./evaluation-prompt.js";
import { RawAiEvaluationSchema } from "./evaluation-prompt.js";
import type { RoleplayMessage } from "./roleplay-prompt.js";
import type { ScenarioDefinition } from "../scenarios/scenario-definition.js";

const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          reasoning: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().nonnegative().nullable().optional(),
      completion_tokens: z.number().nonnegative().nullable().optional(),
      cost: z.number().nonnegative().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const ROLEPLAY_MAX_OUTPUT_TOKENS = 700;
const EVALUATION_MAX_OUTPUT_TOKENS = 12_000;
const ROLEPLAY_MAX_RESPONSE_CHARS = 1_600;
const EVALUATION_MAX_RESPONSE_CHARS = 120_000;

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

export interface OpenRouterTranscriptionRequest {
  model: string;
  audioBuffer: Buffer;
  mimeType: string;
  fileName?: string | undefined;
  timeoutMs: number;
}

export interface OpenRouterTranscriptionResult {
  text: string;
  latencyMs: number;
  estimatedCost: number | null;
}

export interface OpenRouterSpeechRequest {
  model: string;
  text: string;
  timeoutMs: number;
}

export interface OpenRouterSpeechResult {
  audio: Buffer;
  contentType: string;
  latencyMs: number;
  estimatedCost: number | null;
}

export interface OpenRouterCustomScenarioRequest {
  model: string;
  messages: CustomScenarioMessage[];
  scenarioKey: string;
  timeoutMs: number;
}

export interface OpenRouterCustomScenarioResult {
  definition: ScenarioDefinition;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
}

const OpenRouterTranscriptionResponseSchema = z.object({
  text: z.string(),
});

export interface OpenRouterProvider {
  generateRoleplayReply(
    request: OpenRouterRoleplayRequest,
  ): Promise<OpenRouterRoleplayResult>;
  evaluateSimulation(
    request: OpenRouterEvaluationRequest,
  ): Promise<OpenRouterEvaluationResult>;
  generateCustomScenario(
    request: OpenRouterCustomScenarioRequest,
  ): Promise<OpenRouterCustomScenarioResult>;
  transcribeAudio(
    request: OpenRouterTranscriptionRequest,
  ): Promise<OpenRouterTranscriptionResult>;
  generateSpeech(
    request: OpenRouterSpeechRequest,
  ): Promise<OpenRouterSpeechResult>;
}

type AiOperationName =
  "ROLEPLAY" | "EVALUATION" | "TRANSCRIPTION" | "TTS" | "SCENARIO_GENERATION";

interface OpenRouterProviderOptions {
  apiKey: string;
  logger?: AppLogger;
  fetchImplementation?: typeof fetch;
  clock?: () => number;
}

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    const match = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function createOpenRouterProvider(
  options: OpenRouterProviderOptions,
): OpenRouterProvider {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const clock = options.clock ?? Date.now;
  const logger = options.logger;

  function logAiSuccess(
    operation: AiOperationName,
    model: string,
    latencyMs: number,
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      estimatedCost: number | null;
    },
  ) {
    logger?.info({
      event: "ai_request_completed",
      operation,
      model,
      latencyMs,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
    });
  }

  function logAiFailure(
    operation: AiOperationName,
    model: string,
    latencyMs: number,
    errorCode: AiErrorCode,
  ) {
    logger?.warn({
      event: "ai_request_failed",
      operation,
      model,
      latencyMs,
      errorCode,
    });
  }

  async function sendChatCompletion(
    operation: AiOperationName,
    model: string,
    bodyPayload: Record<string, unknown>,
    timeoutMs: number,
    maxResponseChars: number,
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

      if (!response.ok) {
        throw new AiProviderError(
          "AI_PROVIDER_ERROR",
          Math.max(0, clock() - startedAt),
        );
      }

      // Measure to body completion, not headers: OpenRouter may send response
      // headers as soon as the request is accepted while generation finishes
      // during the body transfer.
      const rawResponse = await response.json();
      const latencyMs = Math.max(0, clock() - startedAt);

      const parsed = OpenRouterResponseSchema.safeParse(rawResponse);
      const rawContent = parsed.success
        ? (parsed.data.choices[0]?.message.content ?? "")
        : "";
      const content = rawContent.trim();

      if (!parsed.success || !content || content.length > maxResponseChars) {
        throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
      }

      const usage = {
        inputTokens: parsed.data.usage?.prompt_tokens ?? null,
        outputTokens: parsed.data.usage?.completion_tokens ?? null,
        estimatedCost: parsed.data.usage?.cost ?? null,
      };
      logAiSuccess(operation, model, latencyMs, usage);

      return {
        content,
        latencyMs,
        ...usage,
      };
    } catch (error) {
      const latencyMs = Math.max(0, clock() - startedAt);
      const errorCode =
        error instanceof AiProviderError
          ? error.code
          : timedOut
            ? "AI_TIMEOUT"
            : "AI_PROVIDER_ERROR";
      logAiFailure(operation, model, latencyMs, errorCode);
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(errorCode, latencyMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async generateRoleplayReply(request) {
      const result = await sendChatCompletion(
        "ROLEPLAY",
        request.model,
        {
          model: request.model,
          messages: request.messages,
          stream: false,
          max_tokens: ROLEPLAY_MAX_OUTPUT_TOKENS,
          // Roleplay replies are short in-character dialogue; hidden reasoning
          // tokens add generation latency without improving them.
          reasoning: { enabled: false },
          // Prefer the fastest ZDR-compatible upstream for this model instead
          // of default price-based load balancing. This is a routing
          // preference within OpenRouter, not model routing or fallback
          // orchestration.
          provider: {
            zdr: true,
            data_collection: "deny",
            sort: "throughput",
          },
        },
        request.timeoutMs,
        ROLEPLAY_MAX_RESPONSE_CHARS,
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
        "EVALUATION",
        request.model,
        {
          model: request.model,
          messages: request.messages,
          stream: false,
          max_tokens: EVALUATION_MAX_OUTPUT_TOKENS,
          response_format: { type: "json_object" },
          provider: {
            zdr: true,
            data_collection: "deny",
          },
        },
        request.timeoutMs,
        EVALUATION_MAX_RESPONSE_CHARS,
      );

      let jsonPayload: unknown;
      try {
        const jsonString = extractJsonString(result.content);
        jsonPayload = JSON.parse(jsonString);
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

    async generateCustomScenario(request) {
      const result = await sendChatCompletion(
        "SCENARIO_GENERATION",
        request.model,
        {
          model: request.model,
          messages: request.messages,
          stream: false,
          max_tokens: EVALUATION_MAX_OUTPUT_TOKENS,
          response_format: { type: "json_object" },
          provider: {
            zdr: true,
            data_collection: "deny",
          },
        },
        request.timeoutMs,
        EVALUATION_MAX_RESPONSE_CHARS,
      );

      let jsonPayload: unknown;
      try {
        const jsonString = extractJsonString(result.content);
        jsonPayload = JSON.parse(jsonString);
      } catch {
        throw new AiProviderError("AI_PROVIDER_ERROR", result.latencyMs);
      }

      let definition: ScenarioDefinition;
      try {
        definition = validateCustomScenarioOutput(
          jsonPayload,
          request.scenarioKey,
        );
      } catch {
        throw new AiProviderError("AI_PROVIDER_ERROR", result.latencyMs);
      }

      return {
        definition,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: result.estimatedCost,
      };
    },

    async transcribeAudio(request) {
      const startedAt = clock();
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs);

      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(request.audioBuffer)], {
          type: request.mimeType,
        });
        formData.append("file", blob, request.fileName ?? "audio.webm");

        formData.append("model", request.model);
        formData.append(
          "provider",
          JSON.stringify({ zdr: true, data_collection: "deny" }),
        );

        const response = await fetchImplementation(
          "https://openrouter.ai/api/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
            },
            body: formData,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new AiProviderError(
            "AI_PROVIDER_ERROR",
            Math.max(0, clock() - startedAt),
          );
        }

        const rawResponse = await response.json();
        const latencyMs = Math.max(0, clock() - startedAt);
        const parsed =
          OpenRouterTranscriptionResponseSchema.safeParse(rawResponse);
        if (!parsed.success) {
          throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
        }

        logAiSuccess("TRANSCRIPTION", request.model, latencyMs, {
          inputTokens: null,
          outputTokens: null,
          estimatedCost: null,
        });

        return {
          text: parsed.data.text.trim(),
          latencyMs,
          estimatedCost: null,
        };
      } catch (error) {
        const latencyMs = Math.max(0, clock() - startedAt);
        const errorCode =
          error instanceof AiProviderError
            ? error.code
            : timedOut
              ? "AI_TIMEOUT"
              : "AI_PROVIDER_ERROR";
        logAiFailure("TRANSCRIPTION", request.model, latencyMs, errorCode);
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError(errorCode, latencyMs);
      } finally {
        clearTimeout(timeout);
      }
    },

    async generateSpeech(request) {
      const startedAt = clock();
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs);

      try {
        const response = await fetchImplementation(
          "https://openrouter.ai/api/v1/audio/speech",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: request.model,
              input: request.text,
              voice: "af_heart",
              response_format: "mp3",
              provider: { zdr: true, data_collection: "deny" },
            }),
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new AiProviderError(
            "AI_PROVIDER_ERROR",
            Math.max(0, clock() - startedAt),
          );
        }
        const contentType =
          response.headers.get("content-type") ?? "audio/mpeg";
        if (!contentType.toLowerCase().startsWith("audio/")) {
          throw new AiProviderError(
            "AI_PROVIDER_ERROR",
            Math.max(0, clock() - startedAt),
          );
        }
        const audio = Buffer.from(await response.arrayBuffer());
        const latencyMs = Math.max(0, clock() - startedAt);
        if (audio.length === 0) {
          throw new AiProviderError("AI_PROVIDER_ERROR", latencyMs);
        }
        logAiSuccess("TTS", request.model, latencyMs, {
          inputTokens: null,
          outputTokens: null,
          estimatedCost: null,
        });
        return { audio, contentType, latencyMs, estimatedCost: null };
      } catch (error) {
        const latencyMs = Math.max(0, clock() - startedAt);
        const errorCode =
          error instanceof AiProviderError
            ? error.code
            : timedOut
              ? "AI_TIMEOUT"
              : "AI_PROVIDER_ERROR";
        logAiFailure("TTS", request.model, latencyMs, errorCode);
        if (error instanceof AiProviderError) throw error;
        throw new AiProviderError(errorCode, latencyMs);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
