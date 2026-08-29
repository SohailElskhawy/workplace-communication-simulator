import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ProgressRepository } from "./progress-service.js";

export function createPrismaProgressRepository(
  prisma: PrismaClient,
): ProgressRepository {
  return {
    async findLatestEligibleEvaluations(userId, limit) {
      const attempts = await prisma.simulationAttempt.findMany({
        where: {
          userId,
          status: "COMPLETED",
          progressEligible: true,
          evaluation: { isNot: null },
        },
        orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        take: limit,
        select: {
          evaluation: {
            select: {
              clarity: true,
              assertiveness: true,
              empathy: true,
              structure: true,
              conciseness: true,
            },
          },
        },
      });

      return attempts
        .map((attempt) => attempt.evaluation)
        .filter(
          (evaluation): evaluation is NonNullable<typeof evaluation> =>
            evaluation !== null,
        );
    },
  };
}
