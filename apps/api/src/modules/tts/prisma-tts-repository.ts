import type { PrismaClient } from "../../generated/prisma/client.js";
import type { TtsRepository } from "./tts-repository.js";

export function createPrismaTtsRepository(prisma: PrismaClient): TtsRepository {
  return {
    async findOwnedSpeechTurn(attemptId, turnId, userId) {
      const turn = await prisma.conversationTurn.findFirst({
        where: { id: turnId, attemptId, attempt: { userId } },
        select: { assistantText: true, attempt: { select: { status: true } } },
      });
      return turn
        ? {
            assistantText: turn.assistantText,
            attemptStatus: turn.attempt.status,
          }
        : null;
    },
    async recordUsage(input) {
      await prisma.aiUsageEvent.create({
        data: {
          userId: input.userId,
          attemptId: input.attemptId,
          operation: "TTS",
          provider: "openrouter",
          model: input.model,
          status: input.status,
          latencyMs: input.latencyMs,
          estimatedCost: input.estimatedCost,
          errorCode: input.errorCode,
        },
      });
    },
  };
}
