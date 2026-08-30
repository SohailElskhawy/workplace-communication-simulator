import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import {
  mapPrismaEvaluationToData,
  type EvaluationRecord,
  type EvaluationRepository,
} from "./evaluation-repository.js";

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function mapEvaluation(
  record: Prisma.EvaluationGetPayload<Record<string, never>>,
): EvaluationRecord {
  return {
    id: record.id,
    attemptId: record.attemptId,
    clarity: record.clarity,
    assertiveness: record.assertiveness,
    empathy: record.empathy,
    structure: record.structure,
    conciseness: record.conciseness,
    universalScore: record.universalScore,
    scenarioScore: record.scenarioScore,
    overallScore: record.overallScore,
    objectiveResults:
      record.objectiveResults as unknown as EvaluationRecord["objectiveResults"],
    strengths: record.strengths as unknown as EvaluationRecord["strengths"],
    improvements:
      record.improvements as unknown as EvaluationRecord["improvements"],
    moments: record.moments as unknown as EvaluationRecord["moments"],
    nextFocusSkill: record.nextFocusSkill,
    nextFocusReason: record.nextFocusReason,
    summary: record.summary,
    model: record.model,
    promptVersion: record.promptVersion,
    createdAt: record.createdAt,
  };
}

export function createPrismaEvaluationRepository(
  prisma: PrismaClient,
): EvaluationRepository {
  return {
    async claimEvaluation(attemptId, userId, claimedAt) {
      return prisma.$transaction(async (tx) => {
        const attempt = await tx.simulationAttempt.findFirst({
          where: { id: attemptId, userId },
          include: {
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
              select: {
                id: true,
                sequence: true,
                userText: true,
                assistantText: true,
                status: true,
              },
            },
            evaluation: true,
          },
        });
        if (!attempt) return { kind: "not_found" } as const;
        if (attempt.evaluation) {
          return {
            kind: "existing",
            evaluation: mapEvaluation(attempt.evaluation),
          } as const;
        }
        if (attempt.status === "COMPLETED") {
          const existing = await tx.evaluation.findUnique({
            where: { attemptId },
          });
          return existing
            ? ({
              kind: "existing",
              evaluation: mapEvaluation(existing),
            } as const)
            : ({ kind: "rejected" } as const);
        }
        const EVALUATION_CLAIM_LEASE_MS = 3 * 60 * 1000;
        const isClaimStale =
          attempt.evaluationClaimedAt !== null &&
          claimedAt.getTime() - attempt.evaluationClaimedAt.getTime() >=
          EVALUATION_CLAIM_LEASE_MS;

        if (
          attempt.status === "EVALUATING" &&
          attempt.evaluationClaimedAt &&
          !isClaimStale
        ) {
          return { kind: "in_progress" } as const;
        }
        if (
          attempt.status !== "EVALUATING" &&
          attempt.status !== "EVALUATION_FAILED"
        ) {
          return { kind: "rejected" } as const;
        }
        const claimed = await tx.simulationAttempt.updateMany({
          where: {
            id: attemptId,
            userId,
            ...(attempt.status === "EVALUATING"
              ? isClaimStale
                ? {
                  status: "EVALUATING",
                  evaluationClaimedAt: attempt.evaluationClaimedAt,
                }
                : { status: "EVALUATING", evaluationClaimedAt: null }
              : { status: "EVALUATION_FAILED" }),
          },
          data: { status: "EVALUATING", evaluationClaimedAt: claimedAt },
        });
        if (claimed.count !== 1) return { kind: "in_progress" } as const;
        return {
          kind: "claimed",
          attempt: {
            id: attempt.id,
            userId: attempt.userId,
            status: "EVALUATING",
            difficulty: attempt.difficulty,
            variationId: attempt.variationId,
            endedAt: attempt.endedAt,
            scenario: attempt.scenario,
            turns: attempt.conversationTurns,
            evaluation: null,
          },
        } as const;
      });
    },
    async findAttemptForEvaluation(attemptId, userId) {
      const attempt = await prisma.simulationAttempt.findFirst({
        where: { id: attemptId, userId },
        include: {
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
            select: {
              id: true,
              sequence: true,
              userText: true,
              assistantText: true,
              status: true,
            },
          },
          evaluation: true,
        },
      });

      if (!attempt) return null;

      return {
        id: attempt.id,
        userId: attempt.userId,
        status: attempt.status,
        difficulty: attempt.difficulty,
        variationId: attempt.variationId,
        endedAt: attempt.endedAt,
        scenario: attempt.scenario,
        turns: attempt.conversationTurns,
        evaluation: mapPrismaEvaluationToData(attempt.evaluation),
      };
    },

    async findExistingEvaluation(attemptId) {
      const evaluation = await prisma.evaluation.findUnique({
        where: { attemptId },
      });
      return evaluation ? mapEvaluation(evaluation) : null;
    },

    async saveEvaluation(input) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existing = await tx.evaluation.findUnique({
            where: { attemptId: input.attemptId },
          });
          if (existing) {
            return mapEvaluation(existing);
          }

          const evaluation = await tx.evaluation.create({
            data: {
              attemptId: input.attemptId,
              clarity: input.skills.clarity,
              assertiveness: input.skills.assertiveness,
              empathy: input.skills.empathy,
              structure: input.skills.structure,
              conciseness: input.skills.conciseness,
              universalScore: input.universalScore,
              scenarioScore: input.scenarioScore,
              overallScore: input.overallScore,
              objectiveResults:
                input.objectiveResults as unknown as Prisma.InputJsonValue,
              strengths: input.strengths as unknown as Prisma.InputJsonValue,
              improvements:
                input.improvements as unknown as Prisma.InputJsonValue,
              moments: input.moments as unknown as Prisma.InputJsonValue,
              nextFocusSkill: input.nextFocusSkill,
              nextFocusReason: input.nextFocusReason,
              summary: input.summary,
              model: input.model,
              promptVersion: input.promptVersion,
            },
          });

          await tx.simulationAttempt.update({
            where: { id: input.attemptId },
            data: {
              status: "COMPLETED",
              progressEligible: input.progressEligible,
              endedAt: input.endedAt,
              evaluationClaimedAt: null,
            },
          });

          await tx.aiUsageEvent.create({
            data: {
              userId: input.userId,
              attemptId: input.attemptId,
              operation: "EVALUATION",
              provider: input.usage.provider,
              model: input.usage.model,
              status: input.usage.status,
              latencyMs: input.usage.latencyMs,
              inputTokens: input.usage.inputTokens,
              outputTokens: input.usage.outputTokens,
              estimatedCost:
                input.usage.estimatedCost !== null
                  ? new Prisma.Decimal(input.usage.estimatedCost)
                  : null,
              errorCode: input.usage.errorCode,
            },
          });

          return mapEvaluation(evaluation);
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          const duplicate = await prisma.evaluation.findUnique({
            where: { attemptId: input.attemptId },
          });
          if (duplicate) {
            return mapEvaluation(duplicate);
          }
        }
        throw error;
      }
    },

    async markEvaluationFailed(input) {
      await prisma.$transaction(async (tx) => {
        await tx.simulationAttempt.update({
          where: { id: input.attemptId },
          data: { status: "EVALUATION_FAILED", evaluationClaimedAt: null },
        });

        await tx.aiUsageEvent.create({
          data: {
            userId: input.userId,
            attemptId: input.attemptId,
            operation: "EVALUATION",
            provider: input.usage.provider,
            model: input.usage.model,
            status: input.usage.status,
            latencyMs: input.usage.latencyMs,
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            estimatedCost:
              input.usage.estimatedCost !== null
                ? new Prisma.Decimal(input.usage.estimatedCost)
                : null,
            errorCode: input.usage.errorCode,
          },
        });
      });
    },
  };
}
