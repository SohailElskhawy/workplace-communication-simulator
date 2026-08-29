import { describe, expect, it, vi } from "vitest";

import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import type { VoiceRepository } from "./voice-repository.js";
import type { AudioDurationParser } from "./audio-duration.js";
import { createVoiceService, VoiceValidationError } from "./voice-service.js";

function createMockRepository(
  overrides?: Partial<VoiceRepository>,
): VoiceRepository {
  return {
    findAttemptForTranscription: vi.fn().mockResolvedValue({
      id: "attempt-1",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 600_000),
    }),
    recordTranscriptionUsage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockAiService(overrides?: Partial<AiService>): AiService {
  return {
    roleplayModel: "deepseek/deepseek-v4-flash-0731",
    evaluationModel: "openai/gpt-5.6-luna-pro",
    transcriptionModel: "openai/whisper-large-v3-turbo",
    ttsModel: "hexgrad/kokoro-82m",
    generateSpeech: vi.fn(),
    generateRoleplayReply: vi.fn(),
    evaluateSimulation: vi.fn(),
    transcribeAudio: vi.fn().mockResolvedValue({
      text: "Hello I would like to negotiate.",
      latencyMs: 150,
      estimatedCost: 0.0001,
    }),
    ...overrides,
  };
}

function createDurationParser(durationMs = 5_000): AudioDurationParser {
  return { parseDurationMs: vi.fn().mockResolvedValue(durationMs) };
}

describe("VoiceService", () => {
  it("transcribes audio successfully and records AI usage event", async () => {
    const repository = createMockRepository();
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(),
    );

    const result = await service.transcribe({
      userId: "user-1",
      attemptId: "attempt-1",
      audio: {
        buffer: Buffer.from("fake-audio"),
        mimeType: "audio/webm",
        size: 10,
        fileName: "audio.webm",
      },
    });

    expect(result).toEqual({ transcript: "Hello I would like to negotiate." });
    expect(repository.findAttemptForTranscription).toHaveBeenCalledWith(
      "attempt-1",
      "user-1",
    );
    expect(aiService.transcribeAudio).toHaveBeenCalledWith({
      audioBuffer: Buffer.from("fake-audio"),
      mimeType: "audio/webm",
      fileName: "audio.webm",
    });
    expect(repository.recordTranscriptionUsage).toHaveBeenCalledWith({
      userId: "user-1",
      attemptId: "attempt-1",
      provider: "openrouter",
      model: "openai/whisper-large-v3-turbo",
      status: "SUCCESS",
      latencyMs: 150,
      audioDurationMs: 5000,
      estimatedCost: 0.0001,
      errorCode: null,
    });
  });

  it("throws NOT_FOUND when attempt does not exist or does not belong to user", async () => {
    const repository = createMockRepository({
      findAttemptForTranscription: vi.fn().mockResolvedValue(null),
    });
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-missing",
        audio: {
          buffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          size: 10,
        },
      }),
    ).rejects.toThrow(AttemptError);
  });

  it("throws INVALID_ATTEMPT_STATE when attempt is not ACTIVE", async () => {
    const repository = createMockRepository({
      findAttemptForTranscription: vi.fn().mockResolvedValue({
        id: "attempt-1",
        status: "COMPLETED",
        expiresAt: new Date(Date.now() + 600_000),
      }),
    });
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-1",
        audio: {
          buffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          size: 10,
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ATTEMPT_STATE",
    });
  });

  it("throws SESSION_LIMIT_REACHED when attempt is expired", async () => {
    const repository = createMockRepository({
      findAttemptForTranscription: vi.fn().mockResolvedValue({
        id: "attempt-1",
        status: "ACTIVE",
        expiresAt: new Date(1000),
      }),
    });
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      () => new Date(2000),
      createDurationParser(),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-1",
        audio: {
          buffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          size: 10,
        },
      }),
    ).rejects.toMatchObject({
      code: "SESSION_LIMIT_REACHED",
    });
  });

  it("throws VoiceValidationError when audio is invalid", async () => {
    const repository = createMockRepository();
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-1",
        audio: {
          buffer: Buffer.alloc(0),
          mimeType: "audio/webm",
          size: 0,
        },
      }),
    ).rejects.toThrow(VoiceValidationError);
  });

  it("records failed usage and throws when AI provider fails", async () => {
    const repository = createMockRepository();
    const aiService = createMockAiService({
      transcribeAudio: vi
        .fn()
        .mockRejectedValue(new AiProviderError("AI_TIMEOUT", 20_000)),
    });
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-1",
        audio: {
          buffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          size: 10,
        },
      }),
    ).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });

    expect(repository.recordTranscriptionUsage).toHaveBeenCalledWith({
      userId: "user-1",
      attemptId: "attempt-1",
      provider: "openrouter",
      model: "openai/whisper-large-v3-turbo",
      status: "FAILED",
      latencyMs: 20_000,
      audioDurationMs: 5000,
      estimatedCost: null,
      errorCode: "AI_TIMEOUT",
    });
  });

  it("rejects an uploaded recording whose parsed duration exceeds 120 seconds", async () => {
    const repository = createMockRepository();
    const aiService = createMockAiService();
    const service = createVoiceService(
      repository,
      aiService,
      undefined,
      createDurationParser(120_001),
    );

    await expect(
      service.transcribe({
        userId: "user-1",
        attemptId: "attempt-1",
        audio: {
          buffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          size: 5,
        },
      }),
    ).rejects.toThrow("exceeds the maximum limit of 120 seconds");
    expect(aiService.transcribeAudio).not.toHaveBeenCalled();
  });
});
