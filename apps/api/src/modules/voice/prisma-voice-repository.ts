import type { PrismaClient } from "../../generated/prisma/client.js";
import type { VoiceRepository } from "./voice-repository.js";

export function createPrismaVoiceRepository(
  prisma: PrismaClient,
): VoiceRepository {
  return {
    async findAttemptForTranscription(attemptId, userId) {
      const attempt = await prisma.simulationAttempt.findFirst({
        where: { id: attemptId, userId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!attempt) return null;

      return {
        id: attempt.id,
        status: attempt.status,
        expiresAt: attempt.expiresAt,
      };
    },

    async recordTranscriptionUsage(input) {
      await prisma.aiUsageEvent.create({
        data: {
          userId: input.userId,
          attemptId: input.attemptId,
          operation: "TRANSCRIPTION",
          provider: input.provider,
          model: input.model,
          status: input.status,
          latencyMs: input.latencyMs,
          audioDurationMs: input.audioDurationMs ?? null,
          estimatedCost: input.estimatedCost ?? null,
          errorCode: input.errorCode ?? null,
        },
      });
    },
  };
}
