import type {
  AttemptStatus,
  Difficulty,
  HistoryItem,
  HistoryQuery,
  HistoryResponse,
} from "@kalemny/contracts";

export interface HistoryAttemptRecord {
  id: string;
  difficulty: Difficulty;
  status: AttemptStatus;
  retryOfAttemptId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  scenario: {
    key: string;
    title: string;
  };
  evaluation: {
    overallScore: number;
    createdAt: Date;
  } | null;
}

export interface HistoryRepository {
  findUserHistory(
    userId: string,
    options: { cursor?: string; limit: number },
  ): Promise<HistoryAttemptRecord[]>;
}

export interface HistoryService {
  getHistory(userId: string, query: HistoryQuery): Promise<HistoryResponse>;
}

export function createHistoryService(
  repository: HistoryRepository,
): HistoryService {
  return {
    async getHistory(userId, query) {
      const limit = query.limit ?? 20;
      const records = await repository.findUserHistory(userId, {
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit,
      });

      const hasMore = records.length > limit;
      const itemsToReturn = hasMore ? records.slice(0, limit) : records;
      const lastItem = itemsToReturn[itemsToReturn.length - 1];
      const nextCursor = hasMore && lastItem ? lastItem.id : null;

      const data: HistoryItem[] = itemsToReturn.map((record) => ({
        attemptId: record.id,
        scenario: {
          key: record.scenario.key,
          title: record.scenario.title,
        },
        difficulty: record.difficulty,
        status: record.status,
        overallScore: record.evaluation?.overallScore ?? null,
        retryOfAttemptId: record.retryOfAttemptId,
        startedAt: record.startedAt.toISOString(),
        completedAt:
          record.evaluation?.createdAt.toISOString() ??
          record.endedAt?.toISOString() ??
          null,
        createdAt: record.createdAt.toISOString(),
      }));

      return {
        data,
        meta: {
          nextCursor,
        },
      };
    },
  };
}
