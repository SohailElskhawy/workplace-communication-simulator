import {
  ApiErrorResponseSchema,
  AttemptComparisonResponseSchema,
  BindRealtimeConversationResponseSchema,
  AttemptDetailResponseSchema,
  CreateAttemptResponseSchema,
  EvaluationResponseSchema,
  FinishAttemptResponseSchema,
  HistoryResponseSchema,
  ProgressResponseSchema,
  RealtimeSessionResponseSchema,
  ScenarioDetailResponseSchema,
  ScenarioListResponseSchema,
  TranscriptionResponseSchema,
  TurnResponseSchema,
  type AttemptComparison,
  type BindRealtimeConversationResponse,
  type AttemptDetailResponse,
  type CreateAttemptRequest,
  type CreateAttemptResponse,
  type CreateTurnRequest,
  type EvaluationResponse,
  type FinishAttemptResponse,
  type HistoryResponse,
  type ProgressData,
  type PublicScenarioDetail,
  type PublicScenarioSummary,
  type RealtimeSessionResponse,
  type TranscriptionData,
  type TurnResponse,
} from "@kalemny/contracts";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;

  constructor(
    message: string,
    code: string,
    status: number,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

const TRANSIENT_READ_RETRY_DELAYS_MS = [250, 500] as const;

function shouldRetryReadRequest(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.code === "NETWORK_ERROR" || error.status >= 500)
  );
}

function waitForRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function retryTransientRead<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = TRANSIENT_READ_RETRY_DELAYS_MS[attempt];
      if (delayMs === undefined || !shouldRetryReadRequest(error)) {
        throw error;
      }

      await waitForRetry(delayMs);
    }
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  token: string,
  options: RequestInit = {},
  schema: { parse(data: unknown): { data: T } },
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiClientError(
      "Network connection failure. Please check your internet connection.",
      "NETWORK_ERROR",
      0,
    );
  }

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorParsed = ApiErrorResponseSchema.safeParse(rawJson);
    if (errorParsed.success) {
      throw new ApiClientError(
        errorParsed.data.error.message,
        errorParsed.data.error.code,
        response.status,
        errorParsed.data.error.requestId,
      );
    }
    throw new ApiClientError(
      `API request failed with status ${response.status}.`,
      "HTTP_ERROR",
      response.status,
    );
  }

  const parsed = schema.parse(rawJson);
  return parsed.data;
}

async function requestFull<T>(
  baseUrl: string,
  path: string,
  token: string,
  options: RequestInit = {},
  schema: { parse(data: unknown): T },
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiClientError(
      "Network connection failure. Please check your internet connection.",
      "NETWORK_ERROR",
      0,
    );
  }

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorParsed = ApiErrorResponseSchema.safeParse(rawJson);
    if (errorParsed.success) {
      throw new ApiClientError(
        errorParsed.data.error.message,
        errorParsed.data.error.code,
        response.status,
        errorParsed.data.error.requestId,
      );
    }
    throw new ApiClientError(
      `API request failed with status ${response.status}.`,
      "HTTP_ERROR",
      response.status,
    );
  }

  return schema.parse(rawJson);
}

async function requestVoid(
  baseUrl: string,
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<void> {
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiClientError(
      "Network connection failure. Please check your internet connection.",
      "NETWORK_ERROR",
      0,
    );
  }

  if (response.status === 204) {
    return;
  }

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorParsed = ApiErrorResponseSchema.safeParse(rawJson);
    if (errorParsed.success) {
      throw new ApiClientError(
        errorParsed.data.error.message,
        errorParsed.data.error.code,
        response.status,
        errorParsed.data.error.requestId,
      );
    }
    throw new ApiClientError(
      `API request failed with status ${response.status}.`,
      "HTTP_ERROR",
      response.status,
    );
  }
}

export function createApiClient(baseUrl: string) {
  return {
    async fetchScenarios(token: string): Promise<PublicScenarioSummary[]> {
      return retryTransientRead(() =>
        request(
          baseUrl,
          "/api/v1/scenarios",
          token,
          { method: "GET" },
          ScenarioListResponseSchema,
        ),
      );
    },

    async fetchScenarioDetail(
      token: string,
      scenarioKey: string,
    ): Promise<PublicScenarioDetail> {
      return retryTransientRead(() =>
        request(
          baseUrl,
          `/api/v1/scenarios/${encodeURIComponent(scenarioKey)}`,
          token,
          { method: "GET" },
          ScenarioDetailResponseSchema,
        ),
      );
    },

    async createAttempt(
      token: string,
      input: CreateAttemptRequest,
    ): Promise<CreateAttemptResponse["data"]> {
      return request(
        baseUrl,
        "/api/v1/attempts",
        token,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        CreateAttemptResponseSchema,
      );
    },

    async fetchAttempt(
      token: string,
      attemptId: string,
    ): Promise<AttemptDetailResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}`,
        token,
        { method: "GET" },
        AttemptDetailResponseSchema,
      );
    },

    async createTurn(
      token: string,
      attemptId: string,
      input: CreateTurnRequest,
    ): Promise<TurnResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/turns`,
        token,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        TurnResponseSchema,
      );
    },

    async retryTurn(
      token: string,
      attemptId: string,
      turnId: string,
    ): Promise<TurnResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/turns/${encodeURIComponent(turnId)}/retry`,
        token,
        {
          method: "POST",
        },
        TurnResponseSchema,
      );
    },

    /**
     * Issues the short-lived ElevenLabs WebRTC conversation token and signed
     * context token for the feature-flagged live conversation spike. Returns
     * only public scenario data; hidden persona/prompt configuration is
     * fetched by the voice agent through the tool-protected endpoint.
     */
    async createRealtimeSession(
      token: string,
      attemptId: string,
    ): Promise<RealtimeSessionResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/realtime-session`,
        token,
        { method: "POST" },
        RealtimeSessionResponseSchema,
      );
    },

    async bindRealtimeConversation(
      token: string,
      attemptId: string,
      conversationId: string,
    ): Promise<BindRealtimeConversationResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/realtime-conversation`,
        token,
        { method: "POST", body: JSON.stringify({ conversationId }) },
        BindRealtimeConversationResponseSchema,
      );
    },

    async submitRealtimeTranscript(
      token: string,
      attemptId: string,
      conversationId: string,
      turns: ReadonlyArray<{
        userText: string;
        assistantText: string | null;
      }>,
    ): Promise<void> {
      return requestVoid(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/realtime-transcript`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ conversationId, turns }),
          headers: { "Content-Type": "application/json" },
        },
      );
    },

    async finishAttempt(
      token: string,
      attemptId: string,
    ): Promise<FinishAttemptResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/finish`,
        token,
        {
          method: "POST",
        },
        FinishAttemptResponseSchema,
      );
    },

    async evaluateAttempt(
      token: string,
      attemptId: string,
    ): Promise<EvaluationResponse["data"]> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/evaluation`,
        token,
        {
          method: "POST",
        },
        EvaluationResponseSchema,
      );
    },

    async fetchAttemptComparison(
      token: string,
      attemptId: string,
    ): Promise<AttemptComparison | null> {
      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/comparison`,
        token,
        { method: "GET" },
        AttemptComparisonResponseSchema,
      );
    },

    async fetchHistory(
      token: string,
      query?: { cursor?: string | undefined; limit?: number | undefined },
    ): Promise<HistoryResponse> {
      const params = new URLSearchParams();
      if (query?.cursor) params.set("cursor", query.cursor);
      if (query?.limit) params.set("limit", query.limit.toString());
      const queryString = params.toString();
      const path = `/api/v1/history${queryString ? `?${queryString}` : ""}`;

      return retryTransientRead(() =>
        requestFull(
          baseUrl,
          path,
          token,
          { method: "GET" },
          HistoryResponseSchema,
        ),
      );
    },

    async fetchProgress(token: string): Promise<ProgressData> {
      return retryTransientRead(() =>
        request(
          baseUrl,
          "/api/v1/progress",
          token,
          { method: "GET" },
          ProgressResponseSchema,
        ),
      );
    },

    async deleteAttempt(token: string, attemptId: string): Promise<void> {
      return requestVoid(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}`,
        token,
        { method: "DELETE" },
      );
    },

    async transcribeAudio(
      token: string,
      attemptId: string,
      audioBlob: Blob,
      durationMs?: number,
    ): Promise<TranscriptionData> {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (durationMs != null) {
        formData.append("durationMs", durationMs.toString());
      }

      return request(
        baseUrl,
        `/api/v1/attempts/${encodeURIComponent(attemptId)}/transcriptions`,
        token,
        {
          method: "POST",
          body: formData,
        },
        TranscriptionResponseSchema,
      );
    },

    async generateSpeech(
      token: string,
      attemptId: string,
      turnId: string,
      signal?: AbortSignal,
    ): Promise<Blob> {
      let response: Response;
      try {
        response = await fetch(
          `${baseUrl}/api/v1/attempts/${encodeURIComponent(attemptId)}/turns/${encodeURIComponent(turnId)}/speech`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            ...(signal ? { signal } : {}),
          },
        );
      } catch {
        throw new ApiClientError(
          "Network connection failure. Please check your internet connection.",
          "NETWORK_ERROR",
          0,
        );
      }
      if (!response.ok) {
        const rawJson = await response.json().catch(() => null);
        const parsed = ApiErrorResponseSchema.safeParse(rawJson);
        if (parsed.success)
          throw new ApiClientError(
            parsed.data.error.message,
            parsed.data.error.code,
            response.status,
            parsed.data.error.requestId,
          );
        throw new ApiClientError(
          "Speech playback is unavailable.",
          "TTS_FAILED",
          response.status,
        );
      }
      return response.blob();
    },
  };
}
