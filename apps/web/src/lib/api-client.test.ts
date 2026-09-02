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
    vi.mocked(fetch).mockRejectedValue(new Error("Failed to fetch"));

    await expect(client.fetchScenarios(token)).rejects.toThrow(
      "Network connection failure",
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("retries transient scenario-read failures before returning data", async () => {
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

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred.",
            requestId: "req-500",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      } as Response);

    await expect(client.fetchScenarios(token)).resolves.toEqual(mockData.data);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a scenario not-found response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "Scenario not found.",
          requestId: "req-404",
        },
      }),
    } as Response);

    await expect(client.fetchScenarios(token)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
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

  it("requests a realtime session and returns public session data", async () => {
    const mockData = {
      data: {
        attemptId: "123e4567-e89b-12d3-a456-426614174000",
        agentId: "agent_123",
        conversationToken: "conversationToken",
        contextToken: "contextToken",
        contextTokenExpiresAt: "2026-08-30T12:10:00.000Z",
        scenario: {
          key: "salary-negotiation",
          version: 2,
          title: "Salary Negotiation",
        },
        difficulty: "MEDIUM",
        openingMessage: "Thanks for making time to talk.",
        expiresAt: "2026-08-30T12:30:00.000Z",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await client.createRealtimeSession(
      token,
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/attempts/123e4567-e89b-12d3-a456-426614174000/realtime-session",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "POST",
      }),
    );
    expect(result.conversationToken).toBe("conversationToken");
    expect(result.contextToken).toBe("contextToken");
    expect(result.openingMessage).toBe("Thanks for making time to talk.");
  });

  it("surfaces realtime session provider errors with stable codes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        error: {
          code: "AI_PROVIDER_ERROR",
          message: "The realtime provider is unavailable.",
          requestId: "req-rt-1",
        },
      }),
    } as Response);

    await expect(
      client.createRealtimeSession(
        token,
        "123e4567-e89b-12d3-a456-426614174000",
      ),
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "AI_PROVIDER_ERROR",
      status: 502,
    });
  });

  it("fetches me and plan entitlement data", async () => {
    const mockData = {
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        entitlement: {
          plan: "FREE",
          effectivePlan: "FREE",
          expiresAt: null,
          simulationsLimit: 3,
          simulationsUsed: 1,
          simulationsRemaining: 2,
          windowStartsAt: "2026-08-26T10:00:00.000Z",
          windowEndsAt: "2026-09-02T10:00:00.000Z",
        },
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    } as Response);

    const result = await client.fetchMe(token);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/me",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "GET",
      }),
    );
    expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(result.entitlement.plan).toBe("FREE");
    expect(result.entitlement.simulationsRemaining).toBe(2);
  });

  it("posts custom scenario creation with multipart form data and parses detail response", async () => {
    const mockScenario = {
      data: {
        key: "custom-interview-1234-uuid",
        version: 1,
        title: "Senior Backend Engineer Interview - Stripe",
        category: "CUSTOM",
        summary:
          "Custom interview scenario tailored to candidate CV and job description.",
        isCustom: true,
        context: {
          description:
            "Technical interview focusing on system design and APIs.",
          userRole: "Backend Engineer Candidate",
          aiRole: "Hiring Manager",
          userObjective:
            "Demonstrate strong distributed systems architecture knowledge.",
          stakes: "High stakes technical round.",
        },
        availableDifficulties: ["EASY", "MEDIUM", "HARD"],
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockScenario,
    } as Response);

    const cvBlob = new Blob(
      ["%PDF-1.4 dummy pdf content with more than 50 chars for test"],
      {
        type: "application/pdf",
      },
    );

    const result = await client.createCustomScenario(
      token,
      cvBlob,
      "Senior backend engineer job description with distributed systems requirements...",
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.kalemny.com/api/v1/scenarios/custom",
      expect.objectContaining({
        headers: expect.any(Headers),
        method: "POST",
        body: expect.any(FormData),
      }),
    );
    expect(result.key).toBe("custom-interview-1234-uuid");
    expect(result.isCustom).toBe(true);
    expect(result.category).toBe("CUSTOM");
  });

  it("throws ApiClientError when createCustomScenario returns error status", async () => {
    const errorBody = {
      error: {
        code: "PLAN_UPGRADE_REQUIRED",
        message: "Custom interview scenarios require a Plus or Pro plan.",
        requestId: "req-custom-err",
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => errorBody,
    } as Response);

    const cvBlob = new Blob(["%PDF-1.4 dummy pdf content"], {
      type: "application/pdf",
    });

    await expect(
      client.createCustomScenario(
        token,
        cvBlob,
        "Job description text for testing error handling...",
      ),
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "PLAN_UPGRADE_REQUIRED",
      status: 403,
      requestId: "req-custom-err",
    });
  });
});
