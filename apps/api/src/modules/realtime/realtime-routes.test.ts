import { ApiErrorResponseSchema } from "@kalemny/contracts";
import { createHmac } from "node:crypto";
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
const WEBHOOK_SECRET = "webhook-secret-example";

function createRealtimeApp(
  serviceOverrides: {
    bindConversation?: RealtimeVoiceService["bindConversation"];
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
    bindConversation:
      serviceOverrides.bindConversation ??
      vi.fn<RealtimeVoiceService["bindConversation"]>().mockResolvedValue(),
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

function createWebhookApp(
  importPostCallTranscription = vi.fn().mockResolvedValue(undefined),
) {
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
    resolveAuthProviderUserId: () => null,
    scenarioService: {
      listActive: async () => [],
      getActiveByKey: async () => null,
    },
    userProvisioner: { ensureUser: vi.fn() },
    voiceService: { transcribe: vi.fn() },
    realtimeTranscriptService: { importPostCallTranscription },
    elevenLabsAgentId: "agent_example",
    elevenLabsWebhookSecret: WEBHOOK_SECRET,
    webOrigin: "http://localhost:3000",
  });
  return { app, importPostCallTranscription };
}

function webhookSignature(
  body: string,
  timestamp = Math.floor(Date.now() / 1_000),
) {
  return `t=${timestamp},v0=${createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex")}`;
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

describe("POST /api/v1/attempts/:attemptId/realtime-conversation", () => {
  it("binds the SDK-issued conversation ID to the owned attempt", async () => {
    const { app, realtimeVoiceService } = createRealtimeApp();

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/realtime-conversation`)
      .send({ conversationId: "conv_example" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      attemptId,
      conversationId: "conv_example",
    });
    expect(realtimeVoiceService.bindConversation).toHaveBeenCalledWith(
      ownerId,
      attemptId,
      "conv_example",
    );
  });

  it("does not expose another attempt when a conversation ID conflicts", async () => {
    const { app } = createRealtimeApp({
      bindConversation: vi
        .fn<RealtimeVoiceService["bindConversation"]>()
        .mockRejectedValue(new AttemptError("NOT_FOUND")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/realtime-conversation`)
      .send({ conversationId: "conv_taken_elsewhere" });

    expect(response.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "NOT_FOUND",
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

describe("POST /api/v1/webhooks/elevenlabs", () => {
  const event = {
    type: "post_call_transcription",
    event_timestamp: 1,
    data: {
      agent_id: "agent_example",
      conversation_id: "conv_example",
      transcript: [{ role: "user", message: "hello" }],
    },
  };

  it("verifies raw HMAC before importing a valid post-call transcript", async () => {
    const { app, importPostCallTranscription } = createWebhookApp();
    const body = JSON.stringify(event);

    const response = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", webhookSignature(body))
      .send(body);

    expect(response.status).toBe(204);
    expect(importPostCallTranscription).toHaveBeenCalledWith(event);
  });

  it("rejects invalid and stale webhook signatures before parsing", async () => {
    const { app, importPostCallTranscription } = createWebhookApp();
    const body = JSON.stringify(event);
    const invalid = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", "t=1788170400,v0=" + "0".repeat(64))
      .send(body);
    const staleTimestamp = Math.floor(Date.now() / 1_000) - 1801;
    const stale = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", webhookSignature(body, staleTimestamp))
      .send(body);

    expect(invalid.status).toBe(401);
    expect(stale.status).toBe(401);
    expect(importPostCallTranscription).not.toHaveBeenCalled();
  });

  it("returns a safe 2xx for a wrong agent, unknown conversation, and duplicate delivery", async () => {
    const { app, importPostCallTranscription } = createWebhookApp();
    const wrongAgent = {
      ...event,
      data: { ...event.data, agent_id: "agent_other" },
    };
    const wrongBody = JSON.stringify(wrongAgent);
    const wrongResponse = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", webhookSignature(wrongBody))
      .send(wrongBody);

    const body = JSON.stringify(event);
    const first = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", webhookSignature(body))
      .send(body);
    const duplicate = await request(app)
      .post("/api/v1/webhooks/elevenlabs")
      .set("Content-Type", "application/json")
      .set("ElevenLabs-Signature", webhookSignature(body))
      .send(body);

    expect(wrongResponse.status).toBe(204);
    expect(first.status).toBe(204);
    expect(duplicate.status).toBe(204);
    expect(importPostCallTranscription).toHaveBeenCalledTimes(2);
  });
});
