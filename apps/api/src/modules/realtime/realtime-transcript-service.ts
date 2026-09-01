import type { ElevenLabsPostCallTranscription } from "./elevenlabs-webhook.js";
import { normalizeElevenLabsTranscript } from "./elevenlabs-webhook.js";
import type { RealtimeTranscriptRepository } from "./prisma-realtime-transcript-repository.js";

export interface RealtimeTranscriptService {
  importPostCallTranscription(
    event: ElevenLabsPostCallTranscription,
  ): Promise<void>;
}

export function createRealtimeTranscriptService(
  repository: RealtimeTranscriptRepository,
  clock: () => Date = () => new Date(),
): RealtimeTranscriptService {
  return {
    async importPostCallTranscription(event) {
      await repository.importTranscript(
        event.data.conversation_id,
        normalizeElevenLabsTranscript(
          event.data.conversation_id,
          event.data.transcript,
        ),
        clock(),
      );
    },
  };
}
