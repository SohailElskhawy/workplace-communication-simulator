import {
  ApiErrorResponseSchema,
  AttemptDetailResponseSchema,
  CreateAttemptResponseSchema,
  EvaluationResponseSchema,
  FinishAttemptResponseSchema,
  ScenarioDetailResponseSchema,
  ScenarioListResponseSchema,
  TurnResponseSchema,
  type AttemptDetailResponse,
  type CreateAttemptRequest,
  type CreateAttemptResponse,
  type CreateTurnRequest,
  type EvaluationResponse,
  type FinishAttemptResponse,
  type PublicScenarioDetail,
  type PublicScenarioSummary,
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

export function createApiClient(baseUrl: string) {
  return {
    async fetchScenarios(token: string): Promise<PublicScenarioSummary[]> {
      return request(
        baseUrl,
        "/api/v1/scenarios",
        token,
        { method: "GET" },
        ScenarioListResponseSchema,
      );
    },

    async fetchScenarioDetail(
      token: string,
      scenarioKey: string,
    ): Promise<PublicScenarioDetail> {
      return request(
        baseUrl,
        `/api/v1/scenarios/${encodeURIComponent(scenarioKey)}`,
        token,
        { method: "GET" },
        ScenarioDetailResponseSchema,
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
  };
}
