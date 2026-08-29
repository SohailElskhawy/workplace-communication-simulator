import { describe, expect, it } from "vitest";

import {
  AttemptDetailResponseSchema,
  CreateAttemptRequestSchema,
  CreateTurnRequestSchema,
  MAX_TURN_TEXT_LENGTH,
} from "./attempt.js";

const attemptId = "6c81ce5b-79ac-4d33-9e22-58c5a264f12e";

describe("attempt contracts", () => {
  it("normalizes a valid attempt request", () => {
    expect(
      CreateAttemptRequestSchema.parse({
        scenarioKey: " salary-negotiation ",
        difficulty: "MEDIUM",
      }),
    ).toEqual({
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
      retryOfAttemptId: null,
    });
  });

  it("rejects invalid retry IDs and unknown fields", () => {
    expect(() =>
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        retryOfAttemptId: "not-a-uuid",
      }),
    ).toThrow();
    expect(() =>
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        userId: attemptId,
      }),
    ).toThrow();
  });

  it("rejects blank learner text and invalid input methods", () => {
    expect(() =>
      CreateTurnRequestSchema.parse({
        clientRequestId: "request-1",
        text: "   ",
        inputMethod: "TEXT",
      }),
    ).toThrow();
    expect(() =>
      CreateTurnRequestSchema.parse({
        clientRequestId: "request-1",
        text: "Hello",
        inputMethod: "AUDIO",
      }),
    ).toThrow();
  });

  it("bounds learner text to the roleplay context budget", () => {
    expect(() =>
      CreateTurnRequestSchema.parse({
        clientRequestId: "request-1",
        text: "a".repeat(MAX_TURN_TEXT_LENGTH + 1),
        inputMethod: "TEXT",
      }),
    ).toThrow();
  });

  it("parses a frontend-safe attempt response", () => {
    const parsed = AttemptDetailResponseSchema.parse({
      data: {
        id: attemptId,
        status: "ACTIVE",
        difficulty: "MEDIUM",
        scenario: {
          key: "salary-negotiation",
          version: 1,
          title: "Salary Negotiation",
        },
        retryOfAttemptId: null,
        turns: [],
        evaluation: null,
        startedAt: "2026-08-29T10:00:00.000Z",
        endedAt: null,
        expiresAt: "2026-08-29T10:15:00.000Z",
      },
    });

    expect(JSON.stringify(parsed)).not.toContain("persona");
    expect(JSON.stringify(parsed)).not.toContain("openingMessage");
  });
});
