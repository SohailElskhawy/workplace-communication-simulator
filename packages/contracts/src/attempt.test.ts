import { describe, expect, it } from "vitest";

import {
  ArabicDialectSchema,
  AttemptDetailResponseSchema,
  CreateAttemptRequestSchema,
  CreateAttemptResponseSchema,
  CreateTurnRequestSchema,
  MAX_TURN_TEXT_LENGTH,
  SupportedLanguageSchema,
} from "./attempt.js";

const attemptId = "6c81ce5b-79ac-4d33-9e22-58c5a264f12e";

describe("attempt contracts", () => {
  it("normalizes a valid attempt request with language and dialect defaults", () => {
    expect(
      CreateAttemptRequestSchema.parse({
        scenarioKey: " salary-negotiation ",
        difficulty: "MEDIUM",
      }),
    ).toEqual({
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
      language: "en",
      dialect: "EGYPTIAN",
      retryOfAttemptId: null,
      interactionMode: "PUSH_TO_TALK",
    });
  });

  it("accepts explicit language and dialect options and rejects invalid ones", () => {
    expect(
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        language: "ar",
        dialect: "GULF",
      }),
    ).toMatchObject({
      language: "ar",
      dialect: "GULF",
    });

    expect(SupportedLanguageSchema.parse("en")).toBe("en");
    expect(SupportedLanguageSchema.parse("ar")).toBe("ar");
    expect(() => SupportedLanguageSchema.parse("fr")).toThrow();

    expect(ArabicDialectSchema.parse("EGYPTIAN")).toBe("EGYPTIAN");
    expect(ArabicDialectSchema.parse("GULF")).toBe("GULF");
    expect(() => ArabicDialectSchema.parse("LEVANTINE")).toThrow();

    expect(() =>
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        language: "fr",
      }),
    ).toThrow();

    expect(() =>
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        dialect: "LEVANTINE",
      }),
    ).toThrow();
  });

  it("accepts an explicit interaction mode and rejects unknown values", () => {
    expect(
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        interactionMode: "REALTIME",
      }).interactionMode,
    ).toBe("REALTIME");
    expect(() =>
      CreateAttemptRequestSchema.parse({
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        interactionMode: "LIVE",
      }),
    ).toThrow();
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
        interactionMode: "PUSH_TO_TALK",
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

    expect(parsed.data.interactionMode).toBe("PUSH_TO_TALK");
    expect(parsed.data.language).toBe("en");
    expect(parsed.data.dialect).toBeUndefined();

    expect(JSON.stringify(parsed)).not.toContain("persona");
    expect(JSON.stringify(parsed)).not.toContain("openingMessage");
  });

  it("parses create and detail responses with explicit language and dialect", () => {
    const created = CreateAttemptResponseSchema.parse({
      data: {
        id: attemptId,
        status: "ACTIVE",
        difficulty: "HARD",
        language: "ar",
        dialect: "GULF",
        interactionMode: "PUSH_TO_TALK",
        scenario: {
          key: "salary-negotiation",
          version: 1,
          title: "Salary Negotiation",
        },
        openingMessage: "مرحبا بك",
        startedAt: "2026-08-29T10:00:00.000Z",
        expiresAt: "2026-08-29T10:15:00.000Z",
      },
    });

    expect(created.data.language).toBe("ar");
    expect(created.data.dialect).toBe("GULF");

    const detailed = AttemptDetailResponseSchema.parse({
      data: {
        id: attemptId,
        status: "ACTIVE",
        difficulty: "HARD",
        language: "ar",
        dialect: "EGYPTIAN",
        interactionMode: "PUSH_TO_TALK",
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

    expect(detailed.data.language).toBe("ar");
    expect(detailed.data.dialect).toBe("EGYPTIAN");
  });
});
