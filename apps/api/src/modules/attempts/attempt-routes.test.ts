import {
  ApiErrorResponseSchema,
  CreateAttemptResponseSchema,
  FinishAttemptResponseSchema,
  TurnResponseSchema,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import { AttemptError } from "./attempt-errors.js";
import type { AttemptService } from "./attempt-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const turnId = "33333333-3333-4333-8333-333333333333";

const createdAttempt = {
  id: attemptId,
  status: "ACTIVE" as const,
  difficulty: "MEDIUM" as const,
  scenario: {
    key: "salary-negotiation",
    version: 1,
    title: "Salary Negotiation",
  },
  openingMessage: "Thanks for meeting with me. What would you like to discuss?",
  startedAt: "2026-08-29T10:00:00.000Z",
  expiresAt: "2026-08-29T10:15:00.000Z",
};

const pendingTurn = {
  id: turnId,
  sequence: 1,
  inputMethod: "TEXT" as const,
  userText: "I would like to discuss compensation.",
  assistantText: null,
  status: "PENDING" as const,
  createdAt: "2026-08-29T10:01:00.000Z",
  completedAt: null,
};

function createAttemptApp(
  overrides: Partial<AttemptService> = {},
  authProviderUserId: string | null = "user_clerk_123",
) {
  const attemptService: AttemptService = Object.assign(
    {
      create: vi
        .fn<AttemptService["create"]>()
        .mockResolvedValue(createdAttempt),
      getOwned: vi.fn<AttemptService["getOwned"]>().mockResolvedValue({
        id: attemptId,
        status: "ACTIVE",
        difficulty: "MEDIUM",
        scenario: createdAttempt.scenario,
        retryOfAttemptId: null,
        turns: [],
        evaluation: null,
        startedAt: createdAttempt.startedAt,
        endedAt: null,
        expiresAt: createdAttempt.expiresAt,
      }),
      createTurn: vi
        .fn<AttemptService["createTurn"]>()
        .mockResolvedValue({ data: pendingTurn, created: true }),
      retryTurn: vi
        .fn<AttemptService["retryTurn"]>()
        .mockResolvedValue(pendingTurn),
      finish: vi
        .fn<AttemptService["finish"]>()
        .mockResolvedValue({ id: attemptId, status: "EVALUATING" }),
    } satisfies AttemptService,
    overrides,
  );
  const ensureUser = vi.fn(async () => ({ id: ownerId }));
  const app = createApp({
    attemptService,
    authenticationMiddleware: (_request, _response, next) => next(),
    evaluationService: {
      evaluate: vi.fn(),
    },
    resolveAuthProviderUserId: () => authProviderUserId,
    scenarioService: {
      listActive: async () => [],
      getActiveByKey: async () => null,
    },
    userProvisioner: { ensureUser },
    webOrigin: "http://localhost:3000",
  });

  return { app, attemptService, ensureUser };
}

describe("attempt endpoints", () => {
  it("rejects unauthenticated attempt creation before provisioning", async () => {
    const { app, ensureUser } = createAttemptApp({}, null);

    const response = await request(app).post("/api/v1/attempts").send({
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
    });

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(ensureUser).not.toHaveBeenCalled();
  });

  it("creates an attempt with the provisioned owner identity", async () => {
    const { app, attemptService } = createAttemptApp();

    const response = await request(app).post("/api/v1/attempts").send({
      scenarioKey: " salary-negotiation ",
      difficulty: "MEDIUM",
    });

    expect(response.status).toBe(201);
    expect(CreateAttemptResponseSchema.parse(response.body).data).toEqual(
      createdAttempt,
    );
    expect(attemptService.create).toHaveBeenCalledWith(ownerId, {
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
      retryOfAttemptId: null,
    });
  });

  it("returns not found for a missing or non-owned attempt", async () => {
    const { app } = createAttemptApp({
      getOwned: async () => {
        throw new AttemptError("NOT_FOUND");
      },
    });

    const response = await request(app).get(`/api/v1/attempts/${attemptId}`);

    expect(response.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "NOT_FOUND",
    );
  });

  it("rejects malformed IDs and blank turn text", async () => {
    const { app, attemptService } = createAttemptApp();

    const invalidId = await request(app).get("/api/v1/attempts/not-a-uuid");
    const blankTurn = await request(app)
      .post(`/api/v1/attempts/${attemptId}/turns`)
      .send({
        clientRequestId: "request-1",
        text: "   ",
        inputMethod: "TEXT",
      });

    expect(invalidId.status).toBe(400);
    expect(blankTurn.status).toBe(400);
    expect(attemptService.getOwned).not.toHaveBeenCalled();
    expect(attemptService.createTurn).not.toHaveBeenCalled();
  });

  it("uses 201 for a new turn and 200 for its idempotent replay", async () => {
    const createTurn = vi
      .fn<AttemptService["createTurn"]>()
      .mockResolvedValueOnce({ data: pendingTurn, created: true })
      .mockResolvedValueOnce({ data: pendingTurn, created: false });
    const { app } = createAttemptApp({ createTurn });
    const body = {
      clientRequestId: "request-stable",
      text: pendingTurn.userText,
      inputMethod: "TEXT",
    };

    const first = await request(app)
      .post(`/api/v1/attempts/${attemptId}/turns`)
      .send(body);
    const duplicate = await request(app)
      .post(`/api/v1/attempts/${attemptId}/turns`)
      .send(body);

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(200);
    expect(TurnResponseSchema.parse(first.body)).toEqual(
      TurnResponseSchema.parse(duplicate.body),
    );
  });

  it("retries the same failed turn through the owner-scoped endpoint", async () => {
    const completedTurn = {
      ...pendingTurn,
      assistantText: "A generated response",
      status: "COMPLETED" as const,
      completedAt: "2026-08-29T10:01:01.000Z",
    };
    const retryTurn = vi
      .fn<AttemptService["retryTurn"]>()
      .mockResolvedValue(completedTurn);
    const { app } = createAttemptApp({ retryTurn });

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/turns/${pendingTurn.id}/retry`,
    );

    expect(response.status).toBe(200);
    expect(TurnResponseSchema.parse(response.body).data.id).toBe(
      pendingTurn.id,
    );
    expect(retryTurn).toHaveBeenCalledWith(ownerId, attemptId, pendingTurn.id);
  });

  it("returns sanitized roleplay errors without exposing provider details", async () => {
    const createTurn = vi
      .fn<AttemptService["createTurn"]>()
      .mockRejectedValue(new AttemptError("AI_PROVIDER_ERROR"));
    const { app } = createAttemptApp({ createTurn });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/turns`)
      .send({
        clientRequestId: "request-provider-error",
        text: "Sensitive learner text",
        inputMethod: "TEXT",
      });

    expect(response.status).toBe(502);
    expect(ApiErrorResponseSchema.parse(response.body).error).toMatchObject({
      code: "AI_PROVIDER_ERROR",
      message: "The roleplay response could not be generated. Retry this turn.",
    });
    expect(JSON.stringify(response.body)).not.toContain(
      "Sensitive learner text",
    );
  });

  it("finishes an owned attempt without starting evaluation generation", async () => {
    const { app, attemptService } = createAttemptApp();

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/finish`,
    );

    expect(response.status).toBe(200);
    expect(FinishAttemptResponseSchema.parse(response.body)).toEqual({
      data: { id: attemptId, status: "EVALUATING" },
    });
    expect(attemptService.finish).toHaveBeenCalledWith(ownerId, attemptId);
  });
});
