import { z } from "zod";

export type RealtimeProviderErrorCode = "AI_TIMEOUT" | "AI_PROVIDER_ERROR";

export class RealtimeProviderError extends Error {
  readonly code: RealtimeProviderErrorCode;
  readonly latencyMs: number;

  constructor(code: RealtimeProviderErrorCode, latencyMs: number) {
    super(
      code === "AI_TIMEOUT"
        ? "Realtime provider request timed out."
        : "Realtime provider request failed.",
    );
    this.name = "RealtimeProviderError";
    this.code = code;
    this.latencyMs = latencyMs;
  }
}

export interface ElevenLabsConversationTokenRequest {
  timeoutMs: number;
}

export interface ElevenLabsConversationTokenResult {
  token: string;
  latencyMs: number;
}

/**
 * Issues short-lived ElevenLabs credentials. The API key never leaves the
 * server; only the returned conversation token is handed to the browser.
 */
export interface ElevenLabsProvider {
  issueConversationToken(
    request: ElevenLabsConversationTokenRequest,
  ): Promise<ElevenLabsConversationTokenResult>;
}

const ConversationTokenResponseSchema = z.object({
  token: z.string().min(1),
});

interface ElevenLabsProviderOptions {
  apiKey: string;
  agentId: string;
  fetchImplementation?: typeof fetch;
  clock?: () => number;
}

export function createElevenLabsProvider(
  options: ElevenLabsProviderOptions,
): ElevenLabsProvider {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const clock = options.clock ?? Date.now;

  return {
    async issueConversationToken(request) {
      const startedAt = clock();
      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs);

      try {
        const url = new URL(
          "https://api.elevenlabs.io/v1/convai/conversation/token",
        );
        url.searchParams.set("agent_id", options.agentId);

        const response = await fetchImplementation(url, {
          method: "GET",
          headers: {
            "xi-api-key": options.apiKey,
          },
          signal: controller.signal,
        });
        const latencyMs = Math.max(0, clock() - startedAt);

        if (!response.ok) {
          throw new RealtimeProviderError("AI_PROVIDER_ERROR", latencyMs);
        }

        const parsed = ConversationTokenResponseSchema.safeParse(
          await response.json(),
        );
        if (!parsed.success) {
          throw new RealtimeProviderError("AI_PROVIDER_ERROR", latencyMs);
        }

        return { token: parsed.data.token, latencyMs };
      } catch (error) {
        if (error instanceof RealtimeProviderError) throw error;
        throw new RealtimeProviderError(
          timedOut ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
          Math.max(0, clock() - startedAt),
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
