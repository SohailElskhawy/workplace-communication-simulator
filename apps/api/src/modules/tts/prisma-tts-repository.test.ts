import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaTtsRepository } from "./prisma-tts-repository.js";

const attemptId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const turnId = "33333333-3333-4333-8333-333333333333";

const baseOpening = "Base definition opening message.";
const baseOpeningAr = "رسالة افتتاحية للسيناريو بالعربية.";
const variationOpening = "Variation opening message the learner saw.";
const variationOpeningAr = "رسالة افتتاحية للمتغير بالعربية.";

const definition = {
  key: "salary-negotiation",
  version: 2,
  title: "Salary Negotiation",
  category: "NEGOTIATION",
  summary: "Practice negotiating an offer.",
  publicContext: {
    description: "You are negotiating an offer.",
    userRole: "The candidate",
    aiRole: "The hiring manager",
    userObjective: "Reach a fair agreement.",
    stakes: "The offer may change.",
  },
  persona: {
    role: "Hiring manager",
    traits: ["professional"],
    communicationStyle: "Direct and fair.",
    gender: "FEMALE" as const,
  },
  aiObjective: "Assess the candidate's negotiation.",
  motivations: ["Close a fair offer."],
  constraints: ["Stay within budget."],
  openingMessage: baseOpening,
  openingMessageAr: baseOpeningAr,
  difficulties: {
    EASY: {
      cooperativeness: 5,
      objectionIntensity: 1,
      followUpPressure: 2,
      weakReasoningTolerance: 4,
      concessionThreshold: 2,
      behaviorGuidance: "Be supportive.",
    },
    MEDIUM: {
      cooperativeness: 3,
      objectionIntensity: 3,
      followUpPressure: 3,
      weakReasoningTolerance: 3,
      concessionThreshold: 3,
      behaviorGuidance: "Stay neutral.",
    },
    HARD: {
      cooperativeness: 2,
      objectionIntensity: 4,
      followUpPressure: 5,
      weakReasoningTolerance: 1,
      concessionThreshold: 5,
      behaviorGuidance: "Press firmly.",
    },
  },
  objectives: [
    {
      id: "ANCHOR",
      description: "Anchor the discussion.",
      successSignals: ["States a target."],
      failureSignals: ["Accepts immediately."],
    },
  ],
  skillEmphasis: ["CLARITY"],
  roleplayRules: ["Stay in character."],
  variations: [
    {
      id: "tight-budget",
      category: "BUDGET",
      openingMessage: variationOpening,
      openingMessageAr: variationOpeningAr,
    },
  ],
};

function createPrismaStub(options: {
  variationId: string | null;
  status?: string;
  language?: string;
  dialect?: string | null;
}) {
  return {
    simulationAttempt: {
      findFirst: vi.fn().mockResolvedValue({
        status: options.status ?? "ACTIVE",
        variationId: options.variationId,
        language: options.language ?? "en",
        dialect: options.dialect ?? null,
        scenario: { definition },
      }),
    },
    conversationTurn: {
      findFirst: vi.fn().mockResolvedValue({
        assistantText: "Stored assistant reply.",
        attempt: {
          status: "ACTIVE",
          language: options.language ?? "en",
          dialect: options.dialect ?? null,
          scenario: { definition },
        },
      }),
    },
    aiUsageEvent: {
      create: vi.fn().mockResolvedValue({ id: "usage-1" }),
    },
  } as unknown as PrismaClient;
}

describe("PrismaTtsRepository", () => {
  it("speaks the stored variation's opening message for the opening turn", async () => {
    const prisma = createPrismaStub({ variationId: "tight-budget" });
    const repository = createPrismaTtsRepository(prisma);

    const result = await repository.findOwnedSpeechTurn(
      attemptId,
      "opening",
      userId,
    );

    expect(result).toEqual({
      assistantText: variationOpening,
      attemptStatus: "ACTIVE",
      language: "en",
      dialect: null,
      personaRole: "Hiring manager",
      personaGender: "FEMALE",
    });
  });

  it("speaks the Arabic variation opening when attempt is in Arabic", async () => {
    const prisma = createPrismaStub({
      variationId: "tight-budget",
      language: "ar",
      dialect: "EGYPTIAN",
    });
    const repository = createPrismaTtsRepository(prisma);

    const result = await repository.findOwnedSpeechTurn(
      attemptId,
      "opening",
      userId,
    );

    expect(result).toEqual({
      assistantText: variationOpeningAr,
      attemptStatus: "ACTIVE",
      language: "ar",
      dialect: "EGYPTIAN",
      personaRole: "Hiring manager",
      personaGender: "FEMALE",
    });
  });

  it("falls back to the base definition opening when the attempt has no variation", async () => {
    const prisma = createPrismaStub({ variationId: null });
    const repository = createPrismaTtsRepository(prisma);

    const result = await repository.findOwnedSpeechTurn(
      attemptId,
      "opening",
      userId,
    );

    expect(result).toEqual({
      assistantText: baseOpening,
      attemptStatus: "ACTIVE",
      language: "en",
      dialect: null,
      personaRole: "Hiring manager",
      personaGender: "FEMALE",
    });
  });

  it("falls back to the base definition opening for unknown variation ids", async () => {
    const prisma = createPrismaStub({ variationId: "does-not-exist" });
    const repository = createPrismaTtsRepository(prisma);

    const result = await repository.findOwnedSpeechTurn(
      attemptId,
      "opening",
      userId,
    );

    expect(result).toEqual({
      assistantText: baseOpening,
      attemptStatus: "ACTIVE",
      language: "en",
      dialect: null,
      personaRole: "Hiring manager",
      personaGender: "FEMALE",
    });
  });

  it("returns the stored assistant text and metadata for a regular turn", async () => {
    const prisma = createPrismaStub({
      variationId: "tight-budget",
      language: "ar",
      dialect: "GULF",
    });
    const repository = createPrismaTtsRepository(prisma);

    const result = await repository.findOwnedSpeechTurn(
      attemptId,
      turnId,
      userId,
    );

    expect(result).toEqual({
      assistantText: "Stored assistant reply.",
      attemptStatus: "ACTIVE",
      language: "ar",
      dialect: "GULF",
      personaRole: "Hiring manager",
      personaGender: "FEMALE",
    });
    expect(prisma.simulationAttempt.findFirst).not.toHaveBeenCalled();
  });
});
