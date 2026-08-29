import { describe, expect, it } from "vitest";

import {
  createHistoryService,
  type HistoryAttemptRecord,
  type HistoryRepository,
} from "./history-service.js";

const userId = "11111111-1111-4111-8111-111111111111";

function createMockHistoryRepository(
  records: HistoryAttemptRecord[] = [],
): HistoryRepository {
  return {
    async findUserHistory(_userId, options) {
      let result = [...records];
      if (options.cursor) {
        const index = result.findIndex((r) => r.id === options.cursor);
        if (index >= 0) {
          result = result.slice(index + 1);
        }
      }
      return result.slice(0, options.limit + 1);
    },
  };
}

describe("HistoryService", () => {
  it("returns formatted history items with null nextCursor when results fit in limit", async () => {
    const records: HistoryAttemptRecord[] = [
      {
        id: "attempt-1",
        difficulty: "MEDIUM",
        status: "COMPLETED",
        retryOfAttemptId: null,
        startedAt: new Date("2026-08-29T10:00:00.000Z"),
        endedAt: new Date("2026-08-29T10:10:00.000Z"),
        createdAt: new Date("2026-08-29T10:00:00.000Z"),
        scenario: {
          key: "salary-negotiation",
          title: "Salary Negotiation",
        },
        evaluation: {
          overallScore: 85,
          createdAt: new Date("2026-08-29T10:10:05.000Z"),
        },
      },
    ];

    const service = createHistoryService(createMockHistoryRepository(records));
    const response = await service.getHistory(userId, { limit: 20 });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toEqual({
      attemptId: "attempt-1",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
      },
      difficulty: "MEDIUM",
      status: "COMPLETED",
      overallScore: 85,
      retryOfAttemptId: null,
      startedAt: "2026-08-29T10:00:00.000Z",
      completedAt: "2026-08-29T10:10:05.000Z",
      createdAt: "2026-08-29T10:00:00.000Z",
    });
    expect(response.meta.nextCursor).toBeNull();
  });

  it("handles cursor pagination and calculates nextCursor when more records exist", async () => {
    const records: HistoryAttemptRecord[] = [
      {
        id: "attempt-1",
        difficulty: "HARD",
        status: "COMPLETED",
        retryOfAttemptId: null,
        startedAt: new Date("2026-08-29T11:00:00.000Z"),
        endedAt: new Date("2026-08-29T11:10:00.000Z"),
        createdAt: new Date("2026-08-29T11:00:00.000Z"),
        scenario: {
          key: "salary-negotiation",
          title: "Salary Negotiation",
        },
        evaluation: {
          overallScore: 78,
          createdAt: new Date("2026-08-29T11:10:00.000Z"),
        },
      },
      {
        id: "attempt-2",
        difficulty: "MEDIUM",
        status: "ABANDONED",
        retryOfAttemptId: null,
        startedAt: new Date("2026-08-29T10:00:00.000Z"),
        endedAt: null,
        createdAt: new Date("2026-08-29T10:00:00.000Z"),
        scenario: {
          key: "salary-negotiation",
          title: "Salary Negotiation",
        },
        evaluation: null,
      },
      {
        id: "attempt-3",
        difficulty: "EASY",
        status: "COMPLETED",
        retryOfAttemptId: null,
        startedAt: new Date("2026-08-29T09:00:00.000Z"),
        endedAt: new Date("2026-08-29T09:10:00.000Z"),
        createdAt: new Date("2026-08-29T09:00:00.000Z"),
        scenario: {
          key: "salary-negotiation",
          title: "Salary Negotiation",
        },
        evaluation: {
          overallScore: 92,
          createdAt: new Date("2026-08-29T09:10:00.000Z"),
        },
      },
    ];

    const service = createHistoryService(createMockHistoryRepository(records));

    // Page 1 with limit 2
    const page1 = await service.getHistory(userId, { limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.data[0]?.attemptId).toBe("attempt-1");
    expect(page1.data[1]?.attemptId).toBe("attempt-2");
    expect(page1.meta.nextCursor).toBe("attempt-2");

    // Page 2 with cursor "attempt-2" and limit 2
    const page2 = await service.getHistory(userId, {
      cursor: "attempt-2",
      limit: 2,
    });
    expect(page2.data).toHaveLength(1);
    expect(page2.data[0]?.attemptId).toBe("attempt-3");
    expect(page2.meta.nextCursor).toBeNull();
  });

  it("returns empty array and null nextCursor when user has no history", async () => {
    const service = createHistoryService(createMockHistoryRepository([]));
    const response = await service.getHistory(userId, { limit: 20 });

    expect(response.data).toEqual([]);
    expect(response.meta.nextCursor).toBeNull();
  });
});
