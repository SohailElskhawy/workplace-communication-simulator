import { describe, expect, it, vi } from "vitest";
import type { TtsProvider } from "./tts-provider.js";
import type { TtsRepository } from "./tts-repository.js";
import { createTtsService } from "./tts-service.js";

describe("TtsService", () => {
  it("synthesizes only stored assistant text with attempt language, dialect, and persona gender", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue({
        assistantText: "Stored reply in Arabic",
        attemptStatus: "ACTIVE",
        language: "ar",
        dialect: "EGYPTIAN",
        personaGender: "FEMALE",
        personaRole: "Hiring Manager",
      }),
      recordUsage: vi.fn(),
    };

    const ttsProvider: TtsProvider = {
      model: "edge-tts",
      generateSpeech: vi.fn().mockResolvedValue({
        audio: Buffer.from("mp3-audio-bytes"),
        contentType: "audio/mpeg",
        latencyMs: 120,
      }),
    };

    const service = createTtsService(repository, ttsProvider);
    const result = await service.generate("user", "attempt", "turn");

    expect(ttsProvider.generateSpeech).toHaveBeenCalledWith({
      text: "Stored reply in Arabic",
      language: "ar",
      dialect: "EGYPTIAN",
      gender: "FEMALE",
      timeoutMs: 15000,
    });
    expect(result.contentType).toBe("audio/mpeg");
    expect(result.audio.toString()).toBe("mp3-audio-bytes");
    expect(repository.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        model: "edge-tts",
        provider: "edge-tts",
        latencyMs: 120,
        estimatedCost: 0,
        errorCode: null,
      }),
    );
  });

  it("records a sanitized failure without changing domain state on provider error", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue({
        assistantText: "Stored reply",
        attemptStatus: "COMPLETED",
        language: "en",
        dialect: null,
      }),
      recordUsage: vi.fn(),
    };

    const ttsProvider: TtsProvider = {
      model: "edge-tts",
      generateSpeech: vi
        .fn()
        .mockRejectedValue(new Error("Edge TTS generation timed out after 15000ms")),
    };

    const service = createTtsService(repository, ttsProvider);

    await expect(
      service.generate("user", "attempt", "turn"),
    ).rejects.toMatchObject({ code: "TTS_FAILED" });

    expect(repository.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        provider: "edge-tts",
        model: "edge-tts",
        errorCode: "AI_TIMEOUT",
      }),
    );
  });

  it("throws NOT_FOUND when turn or assistant text does not exist", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue(null),
      recordUsage: vi.fn(),
    };

    const ttsProvider: TtsProvider = {
      generateSpeech: vi.fn(),
    };

    const service = createTtsService(repository, ttsProvider);

    await expect(
      service.generate("user", "attempt", "turn"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(ttsProvider.generateSpeech).not.toHaveBeenCalled();
  });

  it("throws INVALID_ATTEMPT_STATE when attempt is not ACTIVE or COMPLETED", async () => {
    const repository: TtsRepository = {
      findOwnedSpeechTurn: vi.fn().mockResolvedValue({
        assistantText: "Stored reply",
        attemptStatus: "ABANDONED",
      }),
      recordUsage: vi.fn(),
    };

    const ttsProvider: TtsProvider = {
      generateSpeech: vi.fn(),
    };

    const service = createTtsService(repository, ttsProvider);

    await expect(
      service.generate("user", "attempt", "turn"),
    ).rejects.toMatchObject({ code: "INVALID_ATTEMPT_STATE" });
    expect(ttsProvider.generateSpeech).not.toHaveBeenCalled();
  });
});
