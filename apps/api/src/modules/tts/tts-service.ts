import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { AttemptError } from "../attempts/attempt-errors.js";
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
  aiService: AiService,
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
      try {
        const result = await aiService.generateSpeech(turn.assistantText);
        await repository.recordUsage({
          userId,
          attemptId,
          model: aiService.ttsModel,
          status: "SUCCESS",
          latencyMs: result.latencyMs,
          estimatedCost: result.estimatedCost,
          errorCode: null,
        });
        return { audio: result.audio, contentType: result.contentType };
      } catch (error) {
        const errorCode =
          error instanceof AiProviderError ? error.code : "TTS_FAILED";
        await repository.recordUsage({
          userId,
          attemptId,
          model: aiService.ttsModel,
          status: "FAILED",
          latencyMs: error instanceof AiProviderError ? error.latencyMs : 0,
          estimatedCost: null,
          errorCode,
        });
        throw new AttemptError("TTS_FAILED");
      }
    },
  };
}
