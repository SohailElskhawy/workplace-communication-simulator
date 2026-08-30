import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import { mapPrismaEvaluationToData } from "../evaluations/evaluation-repository.js";
import { calculateAttemptComparison } from "./attempt-comparison.js";
import { getFinishStatus, getTurnRejection } from "./attempt-rules.js";
import type {
  AttemptRecord,
  AttemptRepository,
  ConversationTurnRecord,
} from "./attempt-service.js";

const turnSelection = {
  id: true,
  sequence: true,
  clientRequestId: true,
  inputMethod: true,
  userText: true,
  assistantText: true,
  status: true,
  createdAt: true,
  completedAt: true,
} as const;

const attemptInclude = {
  scenario: {
    select: {
      id: true,
      key: true,
      version: true,
      title: true,
      definition: true,
    },
  },
  conversationTurns: {
    orderBy: { sequence: "asc" },
    select: turnSelection,
  },
  evaluation: true,
  retryOfAttempt: {
    select: {
      id: true,
      difficulty: true,
      evaluation: true,
    },
  },
} as const;

type PrismaAttemptRecord = Prisma.SimulationAttemptGetPayload<{
  include: typeof attemptInclude;
}>;

type PrismaTurnRecord = Prisma.ConversationTurnGetPayload<{
  select: typeof turnSelection;
}>;

function mapTurn(turn: PrismaTurnRecord): ConversationTurnRecord {
  return turn;
}

function mapAttempt(attempt: PrismaAttemptRecord): AttemptRecord {
  const currentEval = mapPrismaEvaluationToData(attempt.evaluation);
  const previousEval = attempt.retryOfAttempt
    ? mapPrismaEvaluationToData(attempt.retryOfAttempt.evaluation)
    : null;

  const comparison = attempt.retryOfAttempt
    ? calculateAttemptComparison(
        {
          id: attempt.id,
          difficulty: attempt.difficulty,
          evaluation: currentEval,
        },
        {
          id: attempt.retryOfAttempt.id,
          difficulty: attempt.retryOfAttempt.difficulty,
          evaluation: previousEval,
        },
      )
    : null;

  return {
    id: attempt.id,
    userId: attempt.userId,
    difficulty: attempt.difficulty,
    status: attempt.status,
    retryOfAttemptId: attempt.retryOfAttemptId,
    variationId: attempt.variationId,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    expiresAt: attempt.expiresAt,
    evaluationStartedAt: attempt.evaluationStartedAt,
    scenario: attempt.scenario,
    turns: attempt.conversationTurns.map(mapTurn),
    evaluation: currentEval,
    comparison,
  };
}

async function lockOwnedAttempt(
  transaction: Prisma.TransactionClient,
  attemptId: string,
  userId: string,
): Promise<boolean> {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "SimulationAttempt"
    WHERE "id" = CAST(${attemptId} AS UUID)
      AND "userId" = CAST(${userId} AS UUID)
    FOR UPDATE
  `;

  return rows.length === 1;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function createPrismaAttemptRepository(
  prisma: PrismaClient,
): AttemptRepository {
  return {
    createAttempt(input) {
      return prisma.$transaction(async (transaction) => {
        const scenario = await transaction.scenario.findFirst({
          where: { key: input.scenarioKey, isActive: true },
          select: { id: true, key: true, definition: true },
        });

        if (!scenario) {
          return { kind: "not_found" } as const;
        }

        let excludeVariationId: string | null = null;
        if (input.retryOfAttemptId) {
          const retrySource = await transaction.simulationAttempt.findFirst({
            where: {
              id: input.retryOfAttemptId,
              userId: input.userId,
            },
            select: { scenario: { select: { key: true } }, variationId: true },
          });

          if (!retrySource || retrySource.scenario.key !== scenario.key) {
            return { kind: "not_found" } as const;
          }

          excludeVariationId = retrySource.variationId;
        }

        const attempt = await transaction.simulationAttempt.create({
          data: {
            userId: input.userId,
            scenarioId: scenario.id,
            retryOfAttemptId: input.retryOfAttemptId,
            difficulty: input.difficulty,
            variationId: input.selectVariationId(
              scenario.definition,
              excludeVariationId,
            ),
            startedAt: input.startedAt,
            expiresAt: input.expiresAt,
          },
          include: attemptInclude,
        });

        return { kind: "created", attempt: mapAttempt(attempt) } as const;
      });
    },

    async findOwnedAttempt(attemptId, userId) {
      const attempt = await prisma.simulationAttempt.findFirst({
        where: { id: attemptId, userId },
        include: attemptInclude,
      });

      return attempt ? mapAttempt(attempt) : null;
    },

    async findRoleplayContext({ attemptId, userId, beforeSequence }) {
      const attempt = await prisma.simulationAttempt.findFirst({
        where: { id: attemptId, userId },
        select: {
          difficulty: true,
          variationId: true,
          scenario: { select: { definition: true } },
          conversationTurns: {
            where: {
              sequence: { lt: beforeSequence },
              status: "COMPLETED",
              assistantText: { not: null },
            },
            orderBy: { sequence: "asc" },
            select: {
              sequence: true,
              userText: true,
              assistantText: true,
            },
          },
        },
      });

      if (!attempt) {
        return null;
      }

      return {
        difficulty: attempt.difficulty,
        variationId: attempt.variationId,
        scenarioDefinition: attempt.scenario.definition,
        previousTurns: attempt.conversationTurns.map((turn) => ({
          sequence: turn.sequence,
          userText: turn.userText,
          assistantText: turn.assistantText as string,
        })),
      };
    },

    async createTurn(input) {
      const existing = await prisma.conversationTurn.findFirst({
        where: {
          attemptId: input.attemptId,
          clientRequestId: input.clientRequestId,
          attempt: { userId: input.userId },
        },
        select: turnSelection,
      });

      if (existing) {
        return { kind: "existing", turn: mapTurn(existing) };
      }

      try {
        return await prisma.$transaction(async (transaction) => {
          const owned = await lockOwnedAttempt(
            transaction,
            input.attemptId,
            input.userId,
          );

          if (!owned) {
            return { kind: "not_found" } as const;
          }

          const duplicate = await transaction.conversationTurn.findUnique({
            where: {
              attemptId_clientRequestId: {
                attemptId: input.attemptId,
                clientRequestId: input.clientRequestId,
              },
            },
            select: turnSelection,
          });

          if (duplicate) {
            return {
              kind: "existing",
              turn: mapTurn(duplicate),
            } as const;
          }

          const [attempt, pendingTurn, turnAggregate] = await Promise.all([
            transaction.simulationAttempt.findUniqueOrThrow({
              where: { id: input.attemptId },
              select: {
                status: true,
                expiresAt: true,
                _count: { select: { conversationTurns: true } },
              },
            }),
            transaction.conversationTurn.findFirst({
              where: { attemptId: input.attemptId, status: "PENDING" },
              select: { id: true },
            }),
            transaction.conversationTurn.aggregate({
              where: { attemptId: input.attemptId },
              _max: { sequence: true },
            }),
          ]);

          const rejection = getTurnRejection(
            {
              status: attempt.status,
              expiresAt: attempt.expiresAt,
              learnerTurnCount: attempt._count.conversationTurns,
              hasPendingTurn: pendingTurn !== null,
            },
            input.currentTime,
          );

          if (rejection) {
            return { kind: "rejected", code: rejection } as const;
          }

          const turn = await transaction.conversationTurn.create({
            data: {
              attemptId: input.attemptId,
              sequence: (turnAggregate._max.sequence ?? 0) + 1,
              clientRequestId: input.clientRequestId,
              inputMethod: input.inputMethod,
              userText: input.text,
              status: "PENDING",
            },
            select: turnSelection,
          });

          return { kind: "created", turn: mapTurn(turn) } as const;
        });
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) {
          throw error;
        }

        const duplicate = await prisma.conversationTurn.findFirst({
          where: {
            attemptId: input.attemptId,
            clientRequestId: input.clientRequestId,
            attempt: { userId: input.userId },
          },
          select: turnSelection,
        });

        if (duplicate) {
          return { kind: "existing", turn: mapTurn(duplicate) };
        }

        const pendingTurn = await prisma.conversationTurn.findFirst({
          where: {
            attemptId: input.attemptId,
            status: "PENDING",
            attempt: { userId: input.userId },
          },
          select: { id: true },
        });

        if (pendingTurn) {
          return { kind: "rejected", code: "TURN_ALREADY_PENDING" };
        }

        throw error;
      }
    },

    prepareFailedTurnRetry(attemptId, userId, turnId) {
      return prisma.$transaction(async (transaction) => {
        const owned = await lockOwnedAttempt(transaction, attemptId, userId);
        if (!owned) return { kind: "not_found" } as const;

        const [attempt, turn, pendingTurn] = await Promise.all([
          transaction.simulationAttempt.findUniqueOrThrow({
            where: { id: attemptId },
            select: { status: true },
          }),
          transaction.conversationTurn.findFirst({
            where: { id: turnId, attemptId },
            select: turnSelection,
          }),
          transaction.conversationTurn.findFirst({
            where: { attemptId, status: "PENDING" },
            select: { id: true },
          }),
        ]);

        if (!turn) return { kind: "not_found" } as const;
        if (attempt.status !== "ACTIVE") {
          return { kind: "rejected", code: "INVALID_ATTEMPT_STATE" } as const;
        }
        if (turn.status === "PENDING" || pendingTurn) {
          return { kind: "rejected", code: "TURN_ALREADY_PENDING" } as const;
        }
        if (turn.status !== "FAILED") {
          return { kind: "rejected", code: "INVALID_ATTEMPT_STATE" } as const;
        }

        const updated = await transaction.conversationTurn.update({
          where: { id: turn.id },
          data: {
            assistantText: null,
            status: "PENDING",
            completedAt: null,
          },
          select: turnSelection,
        });

        return { kind: "ready", turn: mapTurn(updated) } as const;
      });
    },

    finalizeRoleplayTurn(input) {
      return prisma.$transaction(async (transaction) => {
        // Single conditional UPDATE: atomically transitions the PENDING turn
        // and verifies ownership in one round trip instead of locking the
        // attempt row and re-reading the turn first.
        const rows = await transaction.$queryRaw<
          Array<PrismaTurnRecord>
        >`
          UPDATE "ConversationTurn" AS turn
          SET "assistantText" = ${input.assistantText},
              "status" = CAST(${input.turnStatus} AS "TurnStatus"),
              "completedAt" = ${input.completedAt}
          FROM "SimulationAttempt" AS attempt
          WHERE turn."id" = CAST(${input.turnId} AS UUID)
            AND turn."attemptId" = attempt."id"
            AND attempt."userId" = CAST(${input.userId} AS UUID)
            AND turn."status" = 'PENDING'
          RETURNING "id", "sequence", "clientRequestId", "inputMethod",
                    "userText", "assistantText", "status", "createdAt",
                    "completedAt"
        `;

        const [updatedTurn] = rows;
        if (!updatedTurn) {
          return { kind: "not_found" } as const;
        }

        await transaction.aiUsageEvent.create({
          data: {
            userId: input.userId,
            attemptId: input.attemptId,
            operation: "ROLEPLAY",
            provider: input.usage.provider,
            model: input.usage.model,
            status: input.usage.status,
            latencyMs: input.usage.latencyMs,
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            estimatedCost: input.usage.estimatedCost,
            errorCode: input.usage.errorCode,
          },
        });

        return { kind: "updated", turn: mapTurn(updatedTurn) } as const;
      });
    },

    finishAttempt(attemptId, userId, currentTime) {
      return prisma.$transaction(async (transaction) => {
        const owned = await lockOwnedAttempt(transaction, attemptId, userId);

        if (!owned) {
          return { kind: "not_found" } as const;
        }

        const [attempt, pendingTurn] = await Promise.all([
          transaction.simulationAttempt.findUniqueOrThrow({
            where: { id: attemptId },
            select: {
              id: true,
              status: true,
              _count: { select: { conversationTurns: true } },
            },
          }),
          transaction.conversationTurn.findFirst({
            where: { attemptId, status: "PENDING" },
            select: { id: true },
          }),
        ]);
        if (pendingTurn) {
          return { kind: "rejected", code: "TURN_ALREADY_PENDING" } as const;
        }
        const status = getFinishStatus(
          attempt.status,
          attempt._count.conversationTurns,
        );

        if (status === attempt.status) {
          return { kind: "finished", id: attempt.id, status } as const;
        }

        const updated = await transaction.simulationAttempt.update({
          where: { id: attempt.id },
          data: {
            status,
            endedAt: currentTime,
            evaluationStartedAt: status === "EVALUATING" ? currentTime : null,
          },
          select: { id: true, status: true },
        });

        return {
          kind: "finished",
          id: updated.id,
          status: updated.status,
        } as const;
      });
    },

    async deleteAttempt(attemptId, userId) {
      const attempt = await prisma.simulationAttempt.findFirst({
        where: { id: attemptId, userId },
        select: { id: true },
      });

      if (!attempt) {
        return false;
      }

      await prisma.simulationAttempt.delete({
        where: { id: attemptId },
      });

      return true;
    },
  };
}
