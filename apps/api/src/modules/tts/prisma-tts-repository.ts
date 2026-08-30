import type { PrismaClient } from "../../generated/prisma/client.js";
import type { TtsRepository } from "./tts-repository.js";

import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";

export function createPrismaTtsRepository(prisma: PrismaClient): TtsRepository {
  return {
    async findOwnedSpeechTurn(attemptId, turnId, userId) {
      if (turnId === "opening") {
        const attempt = await prisma.simulationAttempt.findFirst({
          where: { id: attemptId, userId },
          select: {
            status: true,
            scenario: { select: { definition: true } },
          },
        });
        if (!attempt) return null;
        try {
          const definition = ScenarioDefinitionSchema.parse(
            attempt.scenario.definition,
          );
          return {
            assistantText: definition.openingMessage,
            attemptStatus: attempt.status,
          };
        } catch {
          return null;
        }
      }

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
