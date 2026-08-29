import { describe, expect, it } from "vitest";

import {
  EvaluationDataSchema,
  EvaluationResponseSchema,
  ObjectiveResultSchema,
  SkillScoresSchema,
} from "./evaluation.js";

describe("evaluation contracts", () => {
  const validScores = {
    clarity: 85,
    assertiveness: 70,
    empathy: 80,
    structure: 90,
    conciseness: 75,
  };

  const validEvaluation = {
    attemptId: "11111111-1111-4111-8111-111111111111",
    skills: validScores,
    universalScore: 80,
    scenarioScore: 75,
    overallScore: 79,
    objectives: [
      {
        objectiveId: "CLEAR_REQUEST",
        status: "ACHIEVED",
        explanation: "Stated the desired compensation clearly.",
        evidenceTurnIds: ["22222222-2222-4222-8222-222222222222"],
      },
    ],
    strengths: [
      {
        title: "Clear opening",
        explanation: "Brought up compensation directly and professionally.",
        turnIds: ["22222222-2222-4222-8222-222222222222"],
      },
    ],
    improvements: [
      {
        title: "Support claims with evidence",
        explanation: "Provide specific market or performance data.",
        turnIds: ["22222222-2222-4222-8222-222222222222"],
      },
    ],
    moments: [
      {
        turnId: "22222222-2222-4222-8222-222222222222",
        type: "IMPROVEMENT",
        explanation: "Could have anchored with a specific number earlier.",
        betterResponse:
          "Based on my market research, I am looking for $120,000.",
      },
    ],
    summary: "Overall solid negotiation attempt with clear communication.",
    nextFocus: {
      skill: "ASSERTIVENESS",
      reason: "Anchor your salary expectations more firmly.",
    },
    createdAt: "2026-08-29T12:00:00.000Z",
  };

  it("validates valid skill scores within 0-100 range", () => {
    expect(SkillScoresSchema.safeParse(validScores).success).toBe(true);
    expect(
      SkillScoresSchema.safeParse({ ...validScores, clarity: -1 }).success,
    ).toBe(false);
    expect(
      SkillScoresSchema.safeParse({ ...validScores, clarity: 101 }).success,
    ).toBe(false);
  });

  it("validates complete evaluation data and response wrapper", () => {
    const dataParsed = EvaluationDataSchema.safeParse(validEvaluation);
    expect(dataParsed.success).toBe(true);

    const responseParsed = EvaluationResponseSchema.safeParse({
      data: validEvaluation,
    });
    expect(responseParsed.success).toBe(true);
  });

  it("rejects unknown extra properties in strict schema", () => {
    const invalidObjective = {
      objectiveId: "CLEAR_REQUEST",
      status: "ACHIEVED",
      explanation: "Good job",
      evidenceTurnIds: ["22222222-2222-4222-8222-222222222222"],
      extraField: "not allowed",
    };
    expect(ObjectiveResultSchema.safeParse(invalidObjective).success).toBe(
      false,
    );
  });
});
