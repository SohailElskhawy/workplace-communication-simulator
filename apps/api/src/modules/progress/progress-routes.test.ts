import {
  ApiErrorResponseSchema,
  ProgressResponseSchema,
  type ProgressData,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import type { ProgressService } from "./progress-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";

const sampleProgressData: ProgressData = {
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
};

function createProgressApp(
  overrides: Partial<ProgressService> = {},
  authProviderUserId: string | null = "user_clerk_123",
) {
  const progressService: ProgressService = Object.assign(
    {
      getProgress: vi
        .fn<ProgressService["getProgress"]>()
        .mockResolvedValue(sampleProgressData),
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
    historyService: {
      getHistory: vi.fn(),
    },
    progressService,
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

  return { app, progressService, ensureUser };
}

describe("GET /api/v1/progress", () => {
  it("rejects unauthenticated requests before provisioning", async () => {
    const { app, ensureUser } = createProgressApp({}, null);

    const response = await request(app).get("/api/v1/progress");

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(ensureUser).not.toHaveBeenCalled();
  });

  it("returns progress profile for authenticated user", async () => {
    const { app, progressService } = createProgressApp();

    const response = await request(app).get("/api/v1/progress");

    expect(response.status).toBe(200);
    expect(ProgressResponseSchema.parse(response.body).data).toEqual(
      sampleProgressData,
    );
    expect(progressService.getProgress).toHaveBeenCalledWith(ownerId);
  });

  it("returns empty progress state when user has 0 eligible sessions", async () => {
    const emptyData: ProgressData = {
      skills: null,
      weakestSkill: null,
      recommendedScenario: null,
      eligibleSessionCount: 0,
    };
    const { app } = createProgressApp({
      getProgress: vi.fn().mockResolvedValue(emptyData),
    });

    const response = await request(app).get("/api/v1/progress");

    expect(response.status).toBe(200);
    expect(ProgressResponseSchema.parse(response.body).data).toEqual(emptyData);
  });
});
