import { AttemptError } from "../attempts/attempt-errors.js";
import type { TtsProvider } from "./tts-provider.js";
import type { TtsRepository } from "./tts-repository.js";

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
}

export interface TtsService {
  generate(
    userId: string,
    attemptId: string,
    turnId: string,
  ): Promise<SpeechResult>;
}

export function createTtsService(
  repository: TtsRepository,
  ttsProvider: TtsProvider,
): TtsService {
  return {
    async generate(userId, attemptId, turnId) {
      const turn = await repository.findOwnedSpeechTurn(
        attemptId,
        turnId,
        userId,
      );
      if (!turn?.assistantText) throw new AttemptError("NOT_FOUND");
      if (
        turn.attemptStatus !== "ACTIVE" &&
        turn.attemptStatus !== "COMPLETED"
      ) {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }

      const model = ttsProvider.model ?? "edge-tts";
      const startTime = Date.now();

      try {
        const result = await ttsProvider.generateSpeech({
          text: turn.assistantText,
          language: turn.language ?? "en",
          dialect: turn.dialect,
          gender: turn.personaGender,
          timeoutMs: 15000,
        });

        await repository.recordUsage({
          userId,
          attemptId,
          provider: "edge-tts",
          model,
          status: "SUCCESS",
          latencyMs: result.latencyMs,
          estimatedCost: 0,
          errorCode: null,
        });

        return { audio: result.audio, contentType: result.contentType };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        const errorCode =
          error instanceof Error &&
          error.message.toLowerCase().includes("timed out")
            ? "AI_TIMEOUT"
            : ((error as { code?: string })?.code ?? "TTS_FAILED");

        await repository.recordUsage({
          userId,
          attemptId,
          provider: "edge-tts",
          model,
          status: "FAILED",
          latencyMs,
          estimatedCost: null,
          errorCode,
        });

        throw new AttemptError("TTS_FAILED");
      }
    },
  };
}
