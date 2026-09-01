import {
  ApiErrorResponseSchema,
  HistoryResponseSchema,
  type HistoryResponse,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import type { HistoryService } from "./history-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";

const sampleHistoryResponse: HistoryResponse = {
  data: [
    {
      attemptId: "22222222-2222-4222-8222-222222222222",
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

function createHistoryApp(
  overrides: Partial<HistoryService> = {},
  authProviderUserId: string | null = "user_clerk_123",
) {
  const historyService: HistoryService = Object.assign(
    {
      getHistory: vi
        .fn<HistoryService["getHistory"]>()
        .mockResolvedValue(sampleHistoryResponse),
    },
    overrides,
  );

  const ensureUser = vi.fn(async () => ({ id: ownerId }));
  const app = createApp({
    attemptService: {
      create: vi.fn(),
      getOwned: vi.fn(),
      getComparison: vi.fn(),
      createTurn: vi.fn(),
      retryTurn: vi.fn(),
      finish: vi.fn(),
      importRealtimeTranscript: vi.fn(),
      delete: vi.fn(),
    },
    authenticationMiddleware: (_req, _res, next) => next(),
    evaluationService: {
      evaluate: vi.fn(),
    },
    historyService,
    progressService: {
      getProgress: vi.fn(),
    },
    resolveAuthProviderUserId: () => authProviderUserId,
    scenarioService: {
      listActive: async () => [],
      getActiveByKey: async () => null,
    },
    userProvisioner: { ensureUser },
    voiceService: {
      transcribe: vi.fn(),
    },
    webOrigin: "http://localhost:3000",
  });

  return { app, historyService, ensureUser };
}

describe("GET /api/v1/history", () => {
  it("rejects unauthenticated requests before provisioning", async () => {
    const { app, ensureUser } = createHistoryApp({}, null);

    const response = await request(app).get("/api/v1/history");

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(ensureUser).not.toHaveBeenCalled();
  });

  it("returns user history list with default pagination params", async () => {
    const { app, historyService } = createHistoryApp();

    const response = await request(app).get("/api/v1/history");

    expect(response.status).toBe(200);
    expect(HistoryResponseSchema.parse(response.body)).toEqual(
      sampleHistoryResponse,
    );
    expect(historyService.getHistory).toHaveBeenCalledWith(ownerId, {
      cursor: undefined,
      limit: 20,
    });
  });

  it("passes cursor and limit query parameters", async () => {
    const { app, historyService } = createHistoryApp();
    const cursor = "22222222-2222-4222-8222-222222222222";

    const response = await request(app).get(
      `/api/v1/history?cursor=${cursor}&limit=10`,
    );

    expect(response.status).toBe(200);
    expect(historyService.getHistory).toHaveBeenCalledWith(ownerId, {
      cursor,
      limit: 10,
    });
  });

  it("rejects invalid cursor query parameter with VALIDATION_FAILED", async () => {
    const { app } = createHistoryApp();

    const response = await request(app).get(
      "/api/v1/history?cursor=invalid-id",
    );

    expect(response.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "VALIDATION_FAILED",
    );
  });
});
