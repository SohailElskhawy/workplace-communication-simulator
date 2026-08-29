import { describe, expect, it } from "vitest";

import {
  HistoryItemSchema,
  HistoryPaginationMetaSchema,
  HistoryQuerySchema,
  HistoryResponseSchema,
} from "./history.js";

describe("History contracts", () => {
  it("validates a completed history item", () => {
    const item = {
      attemptId: "123e4567-e89b-12d3-a456-426614174000",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
      },
      difficulty: "MEDIUM",
      status: "COMPLETED",
      overallScore: 82,
      retryOfAttemptId: null,
      startedAt: "2026-08-29T12:00:00.000Z",
      completedAt: "2026-08-29T12:10:00.000Z",
      createdAt: "2026-08-29T12:00:00.000Z",
    };

    const parsed = HistoryItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
  });

  it("validates an active or abandoned attempt without overall score or completedAt", () => {
    const item = {
      attemptId: "123e4567-e89b-12d3-a456-426614174000",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
      },
      difficulty: "EASY",
      status: "ABANDONED",
      overallScore: null,
      retryOfAttemptId: "123e4567-e89b-12d3-a456-426614174001",
      startedAt: "2026-08-29T12:00:00.000Z",
      completedAt: null,
      createdAt: "2026-08-29T12:00:00.000Z",
    };

    const parsed = HistoryItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
  });

  it("validates a paginated history response", () => {
    const response = {
      data: [
        {
          attemptId: "123e4567-e89b-12d3-a456-426614174000",
          scenario: {
            key: "salary-negotiation",
            title: "Salary Negotiation",
          },
          difficulty: "HARD",
          status: "COMPLETED",
          overallScore: 75,
          retryOfAttemptId: null,
          startedAt: "2026-08-29T12:00:00.000Z",
          completedAt: "2026-08-29T12:10:00.000Z",
          createdAt: "2026-08-29T12:00:00.000Z",
        },
      ],
      meta: {
        nextCursor: "123e4567-e89b-12d3-a456-426614174000",
      },
    };

    const parsed = HistoryResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
    expect(HistoryPaginationMetaSchema.safeParse(response.meta).success).toBe(
      true,
    );
  });

  it("validates and defaults query parameters", () => {
    const defaultQuery = HistoryQuerySchema.parse({});
    expect(defaultQuery.limit).toBe(20);
    expect(defaultQuery.cursor).toBeUndefined();

    const customQuery = HistoryQuerySchema.parse({
      cursor: "123e4567-e89b-12d3-a456-426614174000",
      limit: "50",
    });
    expect(customQuery.limit).toBe(50);
    expect(customQuery.cursor).toBe("123e4567-e89b-12d3-a456-426614174000");
  });
});
