import {
  ApiErrorResponseSchema,
  EvaluationResponseSchema,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import type { AttemptService } from "../attempts/attempt-service.js";
import type { ScenarioService } from "../scenarios/scenario-service.js";
import type { EvaluationService } from "./evaluation-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";

const sampleEvaluation = {
  attemptId,
  skills: {
    clarity: 85,
    assertiveness: 75,
    empathy: 70,
    structure: 90,
    conciseness: 80,
  },
  universalScore: 80,
  scenarioScore: 100,
  overallScore: 86,
  objectives: [
    {
      objectiveId: "CLEAR_REQUEST",
      status: "ACHIEVED" as const,
      explanation: "Clear ask",
      evidenceTurnIds: ["33333333-3333-4333-8333-333333333333"],
    },
  ],
  strengths: [
    {
      title: "Direct ask",
      explanation: "Stated target directly",
      turnIds: ["33333333-3333-4333-8333-333333333333"],
    },
  ],
  improvements: [
    {
      title: "Empathy",
      explanation: "Acknowledge budget constraints",
      turnIds: ["33333333-3333-4333-8333-333333333333"],
    },
  ],
  moments: [
    {
      turnId: "33333333-3333-4333-8333-333333333333",
      type: "STRENGTH" as const,
      explanation: "Strong ask",
      betterResponse: null,
    },
  ],
  summary: "Solid performance.",
  nextFocus: {
    skill: "EMPATHY" as const,
    reason: "Acknowledge budget pressures.",
  },
  createdAt: "2026-08-29T12:00:00.000Z",
};

function createEvaluationApp(
  overrides: Partial<EvaluationService> = {},
  authProviderUserId: string | null = "user_clerk_123",
) {
  const evaluationService: EvaluationService = Object.assign(
    {
      evaluate: vi
        .fn<EvaluationService["evaluate"]>()
        .mockResolvedValue(sampleEvaluation),
    },
    overrides,
  );

  const attemptService: AttemptService = {
    create: vi.fn(),
    getOwned: vi.fn(),
    createTurn: vi.fn(),
    retryTurn: vi.fn(),
    finish: vi.fn(),
  };

  const scenarioService: ScenarioService = {
    listActive: vi.fn(),
    getActiveByKey: vi.fn(),
  };

  const userProvisioner = {
    ensureUser: vi.fn().mockResolvedValue({ id: ownerId }),
  };

  const app = createApp({
    attemptService,
    authenticationMiddleware: (_req, _res, next) => next(),
    evaluationService,
    resolveAuthProviderUserId: () => authProviderUserId,
    scenarioService,
    userProvisioner,
    webOrigin: "http://localhost:3000",
  });

  return { app, evaluationService };
}

describe("POST /api/v1/attempts/:attemptId/evaluation", () => {
  it("rejects unauthenticated evaluation requests with 401", async () => {
    const { app } = createEvaluationApp({}, null);
    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(401);

    const parsed = ApiErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects invalid UUID attempt parameter with 400", async () => {
    const { app } = createEvaluationApp();
    const response = await request(app)
      .post("/api/v1/attempts/not-a-uuid/evaluation")
      .expect(400);

    const parsed = ApiErrorResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 200 and evaluation response contract on success", async () => {
    const { app, evaluationService } = createEvaluationApp();
    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(200);

    const parsed = EvaluationResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(response.body.data.overallScore).toBe(86);
    expect(evaluationService.evaluate).toHaveBeenCalledWith(ownerId, attemptId);
  });

  it("maps NOT_FOUND to 404", async () => {
    const { app } = createEvaluationApp({
      evaluate: vi.fn().mockRejectedValue(new AttemptError("NOT_FOUND")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(404);

    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("maps INVALID_ATTEMPT_STATE to 409", async () => {
    const { app } = createEvaluationApp({
      evaluate: vi
        .fn()
        .mockRejectedValue(new AttemptError("INVALID_ATTEMPT_STATE")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(409);

    expect(response.body.error.code).toBe("INVALID_ATTEMPT_STATE");
  });

  it("maps AI_TIMEOUT to 504", async () => {
    const { app } = createEvaluationApp({
      evaluate: vi.fn().mockRejectedValue(new AttemptError("AI_TIMEOUT")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(504);

    expect(response.body.error.code).toBe("AI_TIMEOUT");
  });

  it("maps AI_PROVIDER_ERROR to 502", async () => {
    const { app } = createEvaluationApp({
      evaluate: vi
        .fn()
        .mockRejectedValue(new AttemptError("AI_PROVIDER_ERROR")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(502);

    expect(response.body.error.code).toBe("AI_PROVIDER_ERROR");
  });

  it("maps EVALUATION_FAILED to 500", async () => {
    const { app } = createEvaluationApp({
      evaluate: vi
        .fn()
        .mockRejectedValue(new AttemptError("EVALUATION_FAILED")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/evaluation`)
      .expect(500);

    expect(response.body.error.code).toBe("EVALUATION_FAILED");
  });
});
