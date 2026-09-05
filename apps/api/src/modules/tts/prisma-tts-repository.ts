import type { PrismaClient } from "../../generated/prisma/client.js";
import type { TtsRepository } from "./tts-repository.js";

import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";
import { resolveScenarioVariation } from "../scenarios/scenario-variation.js";

export function createPrismaTtsRepository(prisma: PrismaClient): TtsRepository {
  return {
    async findOwnedSpeechTurn(attemptId, turnId, userId) {
      if (turnId === "opening") {
        const attempt = await prisma.simulationAttempt.findFirst({
          where: { id: attemptId, userId },
          select: {
            status: true,
            variationId: true,
            language: true,
            dialect: true,
            scenario: { select: { definition: true } },
          },
        });
        if (!attempt) return null;
        try {
          const definition = ScenarioDefinitionSchema.parse(
            attempt.scenario.definition,
          );
          const variation = resolveScenarioVariation(
            definition,
            attempt.variationId,
          );
          const language = attempt.language === "ar" ? "ar" : "en";
          const dialect =
            attempt.dialect === "GULF" || attempt.dialect === "EGYPTIAN"
              ? attempt.dialect
              : null;

          const assistantText =
            language === "ar" && variation?.openingMessageAr
              ? variation.openingMessageAr
              : language === "ar" && definition.openingMessageAr
                ? definition.openingMessageAr
                : (variation?.openingMessage ?? definition.openingMessage);

          return {
            assistantText,
            attemptStatus: attempt.status,
            language,
            dialect,
            personaRole: definition.persona.role,
            personaGender: definition.persona.gender,
          };
        } catch {
          return null;
        }
      }

      const turn = await prisma.conversationTurn.findFirst({
        where: { id: turnId, attemptId, attempt: { userId } },
        select: {
          assistantText: true,
          attempt: {
            select: {
              status: true,
              language: true,
              dialect: true,
              scenario: { select: { definition: true } },
            },
          },
        },
      });
      if (!turn) return null;

      const language = turn.attempt.language === "ar" ? "ar" : "en";
      const dialect =
        turn.attempt.dialect === "GULF" || turn.attempt.dialect === "EGYPTIAN"
          ? turn.attempt.dialect
          : null;

      let personaRole: string | undefined;
      let personaGender: "MALE" | "FEMALE" | undefined;

      try {
        const definition = ScenarioDefinitionSchema.parse(
          turn.attempt.scenario.definition,
        );
        personaRole = definition.persona.role;
        personaGender = definition.persona.gender;
      } catch {
        // If definition parsing fails, proceed without persona metadata
      }

      return {
        assistantText: turn.assistantText,
        attemptStatus: turn.attempt.status,
        language,
        dialect,
        personaRole,
        personaGender,
      };
    },
    async recordUsage(input) {
      await prisma.aiUsageEvent.create({
        data: {
          userId: input.userId,
          attemptId: input.attemptId,
          operation: "TTS",
          provider: input.provider ?? "edge-tts",
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
