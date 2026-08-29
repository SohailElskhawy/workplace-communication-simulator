import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, createApiClient } from "./api-client.js";

describe("api-client", () => {
  const baseUrl = "https://api.test.kalemny.com";
  const client = createApiClient(baseUrl);
  const token = "mock-jwt-token";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches scenarios with Authorization header", async () => {
    const mockData = {
      data: [
        {
          key: "salary-negotiation",
          version: 1,
          title: "Salary Negotiation",
          category: "NEGOTIATION",
          summary: "Practice compensation negotiation.",
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await client.fetchScenarios(token);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/scenarios",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "GET",
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("salary-negotiation");
  });

  it("throws ApiClientError with code and requestId on API error response", async () => {
    const errorBody = {
      error: {
        code: "INVALID_ATTEMPT_STATE",
        message: "Attempt is already finished.",
        requestId: "req-123",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => errorBody,
    } as Response);

    await expect(
      client.createTurn(token, "123e4567-e89b-12d3-a456-426614174000", {
        clientRequestId: "req-1",
        inputMethod: "TEXT",
        text: "Hello",
      }),
    ).rejects.toThrow(ApiClientError);

    try {
      await client.finishAttempt(token, "123e4567-e89b-12d3-a456-426614174000");
    } catch (err) {
      if (err instanceof ApiClientError) {
        expect(err.code).toBe("INVALID_ATTEMPT_STATE");
        expect(err.status).toBe(409);
        expect(err.requestId).toBe("req-123");
      }
    }
  });

  it("handles network failure cleanly", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(client.fetchScenarios(token)).rejects.toThrow(
      "Network connection failure",
    );
  });
});
