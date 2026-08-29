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

  it("fetches history with query parameters", async () => {
    const mockHistory = {
      data: [
        {
          attemptId: "123e4567-e89b-12d3-a456-426614174000",
          scenario: {
            key: "salary-negotiation",
            title: "Salary Negotiation",
          },
          difficulty: "MEDIUM",
          status: "COMPLETED",
          overallScore: 82,
          retryOfAttemptId: null,
          startedAt: "2026-08-29T10:00:00.000Z",
          completedAt: "2026-08-29T10:10:00.000Z",
          createdAt: "2026-08-29T10:00:00.000Z",
        },
      ],
      meta: {
        nextCursor: null,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHistory,
    } as Response);

    const result = await client.fetchHistory(token, { limit: 10 });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/history?limit=10",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "GET",
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.nextCursor).toBeNull();
  });

  it("fetches progress profile", async () => {
    const mockProgress = {
      data: {
        skills: {
          clarity: 82,
          assertiveness: 68,
          empathy: 75,
          structure: 80,
          conciseness: 74,
        },
        weakestSkill: "ASSERTIVENESS",
        recommendedScenario: {
          key: "salary-negotiation",
          title: "Salary Negotiation",
        },
        eligibleSessionCount: 3,
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProgress,
    } as Response);

    const result = await client.fetchProgress(token);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/progress",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "GET",
      }),
    );
    expect(result.eligibleSessionCount).toBe(3);
    expect(result.weakestSkill).toBe("ASSERTIVENESS");
  });

  it("deletes attempt with status 204", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    await client.deleteAttempt(token, "123e4567-e89b-12d3-a456-426614174000");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/attempts/123e4567-e89b-12d3-a456-426614174000",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "DELETE",
      }),
    );
  });

  it("transcribes audio blob and returns transcript", async () => {
    const mockData = {
      data: {
        transcript: "I would like to discuss compensation.",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const blob = new Blob(["fake-audio-data"], { type: "audio/webm" });
    const result = await client.transcribeAudio(
      token,
      "123e4567-e89b-12d3-a456-426614174000",
      blob,
      5000,
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/attempts/123e4567-e89b-12d3-a456-426614174000/transcriptions",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "POST",
        body: expect.any(FormData),
      }),
    );
    expect(result.transcript).toBe("I would like to discuss compensation.");
  });

  it("requests stored assistant speech as a temporary audio blob", async () => {
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => audio,
    } as Response);
    const result = await client.generateSpeech(
      token,
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174000",
    );
    expect(result).toBe(audio);
  });
});
