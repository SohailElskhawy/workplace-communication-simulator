import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import type { VoiceRepository } from "./voice-repository.js";
import type { AudioDurationParser } from "./audio-duration.js";
import { createAudioDurationParser } from "./audio-duration.js";
import { validateAudioInput } from "./voice-rules.js";

export class VoiceValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "VoiceValidationError";
  }
}

export interface TranscribeAudioParams {
  userId: string;
  attemptId: string;
  audio: {
    buffer: Buffer;
    mimeType: string;
    size: number;
    fileName?: string | undefined;
    durationMs?: number | null | undefined;
  };
}

export interface VoiceService {
  transcribe(params: TranscribeAudioParams): Promise<{ transcript: string }>;
}

export function createVoiceService(
  repository: VoiceRepository,
  aiService: AiService,
  clock: () => Date = () => new Date(),
  durationParser: AudioDurationParser = createAudioDurationParser(),
): VoiceService {
  return {
    async transcribe(params) {
      const attempt = await repository.findAttemptForTranscription(
        params.attemptId,
        params.userId,
      );

      if (!attempt) {
        throw new AttemptError("NOT_FOUND");
      }

      if (attempt.status !== "ACTIVE") {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }

      if (clock().getTime() >= attempt.expiresAt.getTime()) {
        throw new AttemptError("SESSION_LIMIT_REACHED");
      }

      let durationMs: number;
      try {
        durationMs = await durationParser.parseDurationMs(
          params.audio.buffer,
          params.audio.mimeType,
        );
      } catch {
        throw new VoiceValidationError("Audio duration could not be verified.");
      }

      const validation = validateAudioInput({
        buffer: params.audio.buffer,
        mimeType: params.audio.mimeType,
        size: params.audio.size,
        durationMs,
      });

      if (!validation.valid) {
        throw new VoiceValidationError(
          validation.reason ?? "Audio recording is invalid.",
        );
      }

      try {
        const result = await aiService.transcribeAudio({
          audioBuffer: params.audio.buffer,
          mimeType: params.audio.mimeType,
          fileName: params.audio.fileName,
        });

        await repository.recordTranscriptionUsage({
          userId: params.userId,
          attemptId: params.attemptId,
          provider: "openrouter",
          model: aiService.transcriptionModel,
          status: "SUCCESS",
          latencyMs: result.latencyMs,
          audioDurationMs: durationMs,
          estimatedCost: result.estimatedCost,
          errorCode: null,
        });

        return { transcript: result.text };
      } catch (error) {
        const errorCode =
          error instanceof AiProviderError
            ? error.code
            : "TRANSCRIPTION_FAILED";
        const latencyMs =
          error instanceof AiProviderError ? error.latencyMs : 0;

        await repository.recordTranscriptionUsage({
          userId: params.userId,
          attemptId: params.attemptId,
          provider: "openrouter",
          model: aiService.transcriptionModel,
          status: "FAILED",
          latencyMs,
          audioDurationMs: durationMs,
          estimatedCost: null,
          errorCode,
        });

        if (error instanceof AiProviderError) {
          throw new AttemptError(error.code);
        }
        throw new AttemptError("TRANSCRIPTION_FAILED");
      }
    },
  };
}
