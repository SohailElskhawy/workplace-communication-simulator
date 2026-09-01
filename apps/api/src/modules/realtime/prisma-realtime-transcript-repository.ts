import type { PrismaClient } from "../../generated/prisma/client.js";

import type { NormalizedRealtimeTranscriptTurn } from "./elevenlabs-webhook.js";

export interface RealtimeTranscriptRepository {
  importTranscript(
    conversationId: string,
    turns: readonly NormalizedRealtimeTranscriptTurn[],
    completedAt: Date,
  ): Promise<"imported" | "unknown" | "ignored">;
}

export function createPrismaRealtimeTranscriptRepository(
  prisma: PrismaClient,
): RealtimeTranscriptRepository {
  return {
    async importTranscript(conversationId, turns, completedAt) {
      return prisma.$transaction(async (transaction) => {
        const mappings = await transaction.$queryRaw<
          Array<{
            attemptId: string;
            status:
              | "ACTIVE"
              | "EVALUATING"
              | "COMPLETED"
              | "EVALUATION_FAILED"
              | "ABANDONED";
            transcriptImportedAt: Date | null;
          }>
        >`
          SELECT conversation."attemptId", attempt."status", conversation."transcriptImportedAt"
          FROM "RealtimeConversation" AS conversation
          INNER JOIN "SimulationAttempt" AS attempt
            ON attempt."id" = conversation."attemptId"
          WHERE conversation."conversationId" = ${conversationId}
          FOR UPDATE OF conversation, attempt
        `;
        const [mapping] = mappings;
        if (!mapping) return "unknown" as const;
        // A browser import may have completed first. It is already frozen or
        // will be frozen by Finish, so provider retries must not append copies.
        if (mapping.status !== "ACTIVE" || mapping.transcriptImportedAt) {
          return "ignored" as const;
        }

        const existing = await transaction.conversationTurn.findMany({
          where: {
            attemptId: mapping.attemptId,
            clientRequestId: { in: turns.map((turn) => turn.clientRequestId) },
          },
          select: { clientRequestId: true },
        });
        const existingIds = new Set(
          existing.map((turn) => turn.clientRequestId),
        );
        const missing = turns.filter(
          (turn) => !existingIds.has(turn.clientRequestId),
        );
        const aggregate = await transaction.conversationTurn.aggregate({
          where: { attemptId: mapping.attemptId },
          _max: { sequence: true },
        });
        let sequence = aggregate._max.sequence ?? 0;
        for (const turn of missing) {
          sequence += 1;
          await transaction.conversationTurn.create({
            data: {
              attemptId: mapping.attemptId,
              sequence,
              clientRequestId: turn.clientRequestId,
              inputMethod: "VOICE",
              userText: turn.userText,
              assistantText: turn.assistantText,
              status: turn.status,
              completedAt: turn.status === "COMPLETED" ? completedAt : null,
            },
          });
        }
        await transaction.realtimeConversation.update({
          where: { conversationId },
          data: { transcriptImportedAt: completedAt },
        });
        return "imported" as const;
      });
    },
  };
}
