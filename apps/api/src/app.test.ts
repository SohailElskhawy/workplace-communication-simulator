import {
  ApiErrorResponseSchema,
  HealthResponseSchema,
  MeResponseSchema,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const unusedScenarioService = {
  listActive: async () => [],
  getActiveByKey: async () => null,
};

const unusedAttemptService = {
  create: async () => {
    throw new Error("Attempt service should not run");
  },
  getOwned: async () => {
    throw new Error("Attempt service should not run");
  },
  getComparison: async () => {
    throw new Error("Attempt service should not run");
  },
  createTurn: async () => {
    throw new Error("Attempt service should not run");
  },
  retryTurn: async () => {
    throw new Error("Attempt service should not run");
  },
  finish: async () => {
    throw new Error("Attempt service should not run");
  },
  importRealtimeTranscript: async () => {
    throw new Error("Attempt service should not run");
  },
  delete: async () => {
    throw new Error("Attempt service should not run");
  },
};

const unusedEvaluationService = {
  evaluate: async () => {
    throw new Error("Evaluation service should not run");
  },
};

const unusedHistoryService = {
  getHistory: async () => {
    throw new Error("History service should not run");
  },
};

const unusedProgressService = {
  getProgress: async () => {
    throw new Error("Progress service should not run");
  },
};

const unusedVoiceService = {
  transcribe: async () => {
    throw new Error("Voice service should not run");
  },
};

describe("GET /api/v1/health", () => {
  it("returns the shared health response", async () => {
    const response = await request(
      createApp({
        attemptService: unusedAttemptService,
        authenticationMiddleware: (_req, _res, next) => next(),
        evaluationService: unusedEvaluationService,
        historyService: unusedHistoryService,
        progressService: unusedProgressService,
        resolveAuthProviderUserId: () => null,
        scenarioService: unusedScenarioService,
        userProvisioner: {
          ensureUser: () => {
            throw new Error("Provisioning should not run on health check");
          },
        },
        voiceService: unusedVoiceService,
        webOrigin: "http://localhost:3000",
      }),
    ).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(HealthResponseSchema.parse(response.body)).toEqual({
      data: { status: "ok" },
    });
  });
});

describe("GET /api/v1/me", () => {
  const authenticationMiddleware = (
    _request: unknown,
    _response: unknown,
    next: () => void,
  ) => {
    next();
  };

  it("rejects an unauthenticated request", async () => {
    const response = await request(
      createApp({
        attemptService: unusedAttemptService,
        authenticationMiddleware,
        evaluationService: unusedEvaluationService,
        historyService: unusedHistoryService,
        progressService: unusedProgressService,
        resolveAuthProviderUserId: () => null,
        scenarioService: unusedScenarioService,
        userProvisioner: {
          ensureUser: () => {
            throw new Error("Provisioning must not run without authentication");
          },
        },
        voiceService: unusedVoiceService,
        webOrigin: "http://localhost:3000",
      }),
    ).get("/api/v1/me");

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
  });

  it("returns the lazily provisioned local user", async () => {
    const localUserId = "ef4d8dd1-d525-45d7-91f6-3a180db74eac";
    const response = await request(
      createApp({
        attemptService: unusedAttemptService,
        authenticationMiddleware,
        evaluationService: unusedEvaluationService,
        historyService: unusedHistoryService,
        progressService: unusedProgressService,
        resolveAuthProviderUserId: () => "user_clerk_123",
        scenarioService: unusedScenarioService,
        userProvisioner: {
          ensureUser: async (authProviderUserId: string) => {
            if (authProviderUserId !== "user_clerk_123") {
              throw new Error("Unexpected provider identity");
            }

            return { id: localUserId };
          },
        },
        voiceService: unusedVoiceService,
        webOrigin: "http://localhost:3000",
      }),
    ).get("/api/v1/me");

    expect(response.status).toBe(200);
    expect(MeResponseSchema.parse(response.body)).toEqual({
      data: { id: localUserId },
    });
  });
});
