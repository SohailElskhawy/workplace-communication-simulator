import { ApiErrorResponseSchema } from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import { signContextToken } from "./realtime-context-token.js";
import type {
  RealtimeScenarioContext,
  RealtimeVoiceService,
} from "./realtime-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const TOOL_SECRET = "tool-secret-example";

function createRealtimeApp(
  serviceOverrides: {
    createSession?: RealtimeVoiceService["createSession"];
    resolveScenarioContext?: RealtimeVoiceService["resolveScenarioContext"];
  } = {},
  options: { authProviderUserId?: string | null; toolSecret?: string } = {},
) {
  const realtimeVoiceService: RealtimeVoiceService = {
    createSession:
      serviceOverrides.createSession ??
      vi.fn<RealtimeVoiceService["createSession"]>().mockResolvedValue({
        attemptId,
        agentId: "agent_example",
        conversationToken: "elevenlabs-conversationToken",
        contextToken: "payload.signature",
        contextTokenExpiresAt: "2026-08-30T10:10:00.000Z",
        scenario: {
          key: "salary-negotiation",
          version: 2,
          title: "Salary Negotiation",
        },
        difficulty: "MEDIUM",
        openingMessage: "Thanks for making time today.",
        expiresAt: "2026-08-30T10:15:00.000Z",
      }),
    resolveScenarioContext:
      serviceOverrides.resolveScenarioContext ??
      vi
        .fn<RealtimeVoiceService["resolveScenarioContext"]>()
        .mockResolvedValue({
          attemptId,
          userId: ownerId,
          difficulty: "MEDIUM",
          scenario: { key: "salary-negotiation", version: 2 },
          systemPrompt: "hidden roleplay prompt",
          openingMessage: "Thanks for making time today.",
        } satisfies RealtimeScenarioContext),
  };

  const app = createApp({
    attemptService: {
      create: vi.fn(),
      getOwned: vi.fn(),
      getComparison: vi.fn(),
      createTurn: vi.fn(),
      retryTurn: vi.fn(),
      finish: vi.fn(),
      delete: vi.fn(),
    },
    authenticationMiddleware: (_req, _res, next) => next(),
    evaluationService: { evaluate: vi.fn() },
    historyService: { getHistory: vi.fn() },
    progressService: { getProgress: vi.fn() },
    resolveAuthProviderUserId: () =>
      options.authProviderUserId === undefined
        ? "user_clerk_123"
        : options.authProviderUserId,
    scenarioService: {
      listActive: async () => [],
      getActiveByKey: async () => null,
    },
    userProvisioner: { ensureUser: vi.fn(async () => ({ id: ownerId })) },
    voiceService: { transcribe: vi.fn() },
    realtimeVoiceService,
    elevenLabsToolSecret: options.toolSecret ?? TOOL_SECRET,
    webOrigin: "http://localhost:3000",
  });

  return { app, realtimeVoiceService };
}

describe("POST /api/v1/attempts/:attemptId/realtime-session", () => {
  it("rejects unauthenticated requests", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp(
      {},
      {
        authProviderUserId: null,
      },
    );

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/realtime-session`,
    );

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(realtimeVoiceService.createSession).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID attempt ID", async () => {
    const { app } = createRealtimeApp();

    const response = await request(app).post(
      "/api/v1/attempts/not-a-uuid/realtime-session",
    );

    expect(response.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("issues a realtime session for the owned active attempt", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp();

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/realtime-session`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.attemptId).toBe(attemptId);
    expect(response.body.data.conversationToken).toBe(
      "elevenlabs-conversationToken",
    );
    expect(realtimeVoiceService.createSession).toHaveBeenCalledWith(
      ownerId,
      attemptId,
    );
  });

  it("maps attempt lifecycle errors to stable error codes", async () => {
    const { app } = createRealtimeApp({
      createSession: vi
        .fn()
        .mockRejectedValue(new AttemptError("INVALID_ATTEMPT_STATE")),
    });

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/realtime-session`,
    );

    expect(response.status).toBe(409);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "INVALID_ATTEMPT_STATE",
    );
  });
});

describe("POST /api/v1/realtime/scenario-context", () => {
  const contextToken = signContextToken({
    secret: TOOL_SECRET,
    attemptId,
    userId: ownerId,
    currentTime: new Date("2026-08-30T10:00:00.000Z"),
  }).token;

  it("rejects requests without the tool secret", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp();

    const response = await request(app)
      .post("/api/v1/realtime/scenario-context")
      .set("x-kalemny-context-token", contextToken);

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(realtimeVoiceService.resolveScenarioContext).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong tool secret", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp();

    const response = await request(app)
      .post("/api/v1/realtime/scenario-context")
      .set("x-kalemny-tool-secret", "wrong-secret")
      .set("x-kalemny-context-token", contextToken);

    expect(response.status).toBe(401);
    expect(realtimeVoiceService.resolveScenarioContext).not.toHaveBeenCalled();
  });

  it("returns 404 without a context token", async () => {
    const { app } = createRealtimeApp();

    const response = await request(app)
      .post("/api/v1/realtime/scenario-context")
      .set("x-kalemny-tool-secret", TOOL_SECRET);

    expect(response.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "NOT_FOUND",
    );
  });

  it("returns 404 for an invalid context token", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp({
      resolveScenarioContext: vi.fn().mockResolvedValue(null),
    });

    const response = await request(app)
      .post("/api/v1/realtime/scenario-context")
      .set("x-kalemny-tool-secret", TOOL_SECRET)
      .set("x-kalemny-context-token", "tampered.token");

    expect(response.status).toBe(404);
    expect(realtimeVoiceService.resolveScenarioContext).toHaveBeenCalledWith(
      "tampered.token",
    );
  });

  it("returns the hidden context for a valid tool secret and token", async () => {
    const { app } = createRealtimeApp();

    const response = await request(app)
      .post("/api/v1/realtime/scenario-context")
      .set("x-kalemny-tool-secret", TOOL_SECRET)
      .set("x-kalemny-context-token", contextToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      attemptId,
      userId: ownerId,
      difficulty: "MEDIUM",
      scenario: { key: "salary-negotiation", version: 2 },
      systemPrompt: "hidden roleplay prompt",
    });
  });
});
