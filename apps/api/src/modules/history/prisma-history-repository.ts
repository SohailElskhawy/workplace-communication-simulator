import type { PrismaClient } from "../../generated/prisma/client.js";
import type { HistoryRepository } from "./history-service.js";

export function createPrismaHistoryRepository(
  prisma: PrismaClient,
): HistoryRepository {
  return {
    async findUserHistory(userId, options) {
      const attempts = await prisma.simulationAttempt.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: options.limit + 1,
        ...(options.cursor
          ? {
              cursor: { id: options.cursor },
              skip: 1,
            }
          : {}),
        select: {
          id: true,
          difficulty: true,
          status: true,
          retryOfAttemptId: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          scenario: {
            select: {
              key: true,
              title: true,
            },
          },
          evaluation: {
            select: {
              overallScore: true,
              createdAt: true,
            },
          },
        },
      });

      return attempts;
    },
  };
}
