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

  it("fetches attempt comparison", async () => {
    const mockData = {
      data: {
        previousAttemptId: "11111111-1111-4111-8111-111111111111",
        previousDifficulty: "MEDIUM",
        currentDifficulty: "MEDIUM",
        comparable: true,
        nonEquivalentReason: null,
        previousOverallScore: 65,
        currentOverallScore: 78,
        overallDelta: 13,
        previousSkills: {
          clarity: 60,
          assertiveness: 55,
          empathy: 70,
          structure: 65,
          conciseness: 75,
        },
        currentSkills: {
          clarity: 75,
          assertiveness: 70,
          empathy: 75,
          structure: 70,
          conciseness: 80,
        },
        skillDeltas: {
          clarity: 15,
          assertiveness: 15,
          empathy: 5,
          structure: 5,
          conciseness: 5,
        },
        objectives: [
          {
            objectiveId: "CLEAR_REQUEST",
            previousStatus: "PARTIALLY_ACHIEVED",
            currentStatus: "ACHIEVED",
            statusChanged: "IMPROVED",
          },
        ],
        weakArea: {
          skill: "ASSERTIVENESS",
          previousScore: 55,
          currentScore: 70,
          delta: 15,
          improved: true,
        },
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await client.fetchAttemptComparison(
      token,
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/attempts/123e4567-e89b-12d3-a456-426614174000/comparison",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "GET",
      }),
    );
    expect(result?.comparable).toBe(true);
    expect(result?.overallDelta).toBe(13);
  });
});
