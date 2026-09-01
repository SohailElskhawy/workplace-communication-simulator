import {
  ApiErrorResponseSchema,
  TranscriptionResponseSchema,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import { VoiceValidationError, type VoiceService } from "./voice-service.js";

const ownerId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";

function createVoiceApp(
  overrides: Partial<VoiceService> = {},
  authProviderUserId: string | null = "user_clerk_123",
) {
  const voiceService: VoiceService = Object.assign(
    {
      transcribe: vi.fn<VoiceService["transcribe"]>().mockResolvedValue({
        transcript: "I would like to discuss compensation.",
      }),
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
    progressService: {
      getProgress: vi.fn(),
    },
    resolveAuthProviderUserId: () => authProviderUserId,
    scenarioService: {
      listActive: async () => [],
      getActiveByKey: async () => null,
    },
    userProvisioner: { ensureUser },
    voiceService,
    webOrigin: "http://localhost:3000",
  });

  return { app, voiceService, ensureUser };
}

describe("POST /api/v1/attempts/:attemptId/transcriptions", () => {
  it("rejects unauthenticated requests before provisioning", async () => {
    const { app, ensureUser } = createVoiceApp({}, null);

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(ensureUser).not.toHaveBeenCalled();
  });

  it("rejects non-UUID attempt ID", async () => {
    const { app } = createVoiceApp();

    const response = await request(app)
      .post("/api/v1/attempts/invalid-uuid/transcriptions")
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("rejects request without audio file", async () => {
    const { app } = createVoiceApp();

    const response = await request(app).post(
      `/api/v1/attempts/${attemptId}/transcriptions`,
    );

    expect(response.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "VALIDATION_FAILED",
    );
    expect(response.body.error.message).toContain("Audio file is required");
  });

  it("transcribes audio successfully and returns TranscriptionResponse", async () => {
    const { app, voiceService } = createVoiceApp();

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("test-audio-bytes"), {
        filename: "recording.webm",
        contentType: "audio/webm",
      })
      .field("durationMs", "5500");

    expect(response.status).toBe(200);
    const parsed = TranscriptionResponseSchema.parse(response.body);
    expect(parsed.data.transcript).toBe(
      "I would like to discuss compensation.",
    );

    expect(voiceService.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ownerId,
        attemptId,
        audio: expect.objectContaining({
          mimeType: "audio/webm",
          fileName: "recording.webm",
        }),
      }),
    );
  });

  it("accepts file uploaded under field name 'file'", async () => {
    const { app, voiceService } = createVoiceApp();

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("file", Buffer.from("test-audio-bytes"), {
        filename: "recording.m4a",
        contentType: "audio/m4a",
      });

    expect(response.status).toBe(200);
    expect(voiceService.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({
          mimeType: "audio/m4a",
          fileName: "recording.m4a",
        }),
      }),
    );
  });

  it("maps VoiceValidationError to 400 VALIDATION_FAILED", async () => {
    const { app } = createVoiceApp({
      transcribe: vi
        .fn()
        .mockRejectedValue(
          new VoiceValidationError("Audio recording cannot be empty."),
        ),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("x"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(400);
    const parsed = ApiErrorResponseSchema.parse(response.body);
    expect(parsed.error.code).toBe("VALIDATION_FAILED");
    expect(parsed.error.message).toBe("Audio recording cannot be empty.");
  });

  it("maps AttemptError NOT_FOUND to 404", async () => {
    const { app } = createVoiceApp({
      transcribe: vi.fn().mockRejectedValue(new AttemptError("NOT_FOUND")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "NOT_FOUND",
    );
  });

  it("maps AttemptError INVALID_ATTEMPT_STATE to 409", async () => {
    const { app } = createVoiceApp({
      transcribe: vi
        .fn()
        .mockRejectedValue(new AttemptError("INVALID_ATTEMPT_STATE")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(409);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "INVALID_ATTEMPT_STATE",
    );
  });

  it("maps AttemptError AI_TIMEOUT to 504", async () => {
    const { app } = createVoiceApp({
      transcribe: vi.fn().mockRejectedValue(new AttemptError("AI_TIMEOUT")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(504);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "AI_TIMEOUT",
    );
  });

  it("maps AttemptError TRANSCRIPTION_FAILED to 502", async () => {
    const { app } = createVoiceApp({
      transcribe: vi
        .fn()
        .mockRejectedValue(new AttemptError("TRANSCRIPTION_FAILED")),
    });

    const response = await request(app)
      .post(`/api/v1/attempts/${attemptId}/transcriptions`)
      .attach("audio", Buffer.from("audio"), {
        filename: "audio.webm",
        contentType: "audio/webm",
      });

    expect(response.status).toBe(502);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "TRANSCRIPTION_FAILED",
    );
  });
});
