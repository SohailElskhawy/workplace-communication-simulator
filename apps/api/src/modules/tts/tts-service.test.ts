import { describe, expect, it, vi } from "vitest";
import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { createTtsService } from "./tts-service.js";
import type { TtsRepository } from "./tts-repository.js";

const baseAi = {
  roleplayModel: "roleplay/model",
  evaluationModel: "evaluation/model",
  transcriptionModel: "transcription/model",
  ttsModel: "hexgrad/kokoro-82m",
  generateRoleplayReply: vi.fn(),
  evaluateSimulation: vi.fn(),
  transcribeAudio: vi.fn(),
};

describe("TtsService", () => {
  it("synthesizes only stored assistant text and records safe usage", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue({
        assistantText: "Stored reply",
        attemptStatus: "ACTIVE",
      }),
      recordUsage: vi.fn(),
    };
    const generateSpeech = vi.fn().mockResolvedValue({
      audio: Buffer.from("mp3"),
      contentType: "audio/mpeg",
      latencyMs: 120,
      estimatedCost: null,
    });
    const service = createTtsService(repository, {
      ...baseAi,
      generateSpeech,
    } as AiService);
    const result = await service.generate("user", "attempt", "turn");
    expect(generateSpeech).toHaveBeenCalledWith("Stored reply");
    expect(result.contentType).toBe("audio/mpeg");
    expect(repository.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        model: "hexgrad/kokoro-82m",
      }),
    );
  });

  it("records a sanitized failure without changing domain state", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue({
        assistantText: "Stored reply",
        attemptStatus: "COMPLETED",
      }),
      recordUsage: vi.fn(),
    };
    const service = createTtsService(repository, {
      ...baseAi,
      generateSpeech: vi
        .fn()
        .mockRejectedValue(new AiProviderError("AI_TIMEOUT", 15000)),
    } as AiService);
    await expect(
      service.generate("user", "attempt", "turn"),
    ).rejects.toMatchObject({ code: "TTS_FAILED" });
    expect(repository.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        errorCode: "AI_TIMEOUT",
        latencyMs: 15000,
      }),
    );
  });
});
