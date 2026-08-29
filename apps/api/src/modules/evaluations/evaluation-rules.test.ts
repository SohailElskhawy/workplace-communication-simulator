import { describe, expect, it } from "vitest";

import {
  calculateOverallScore,
  calculateScenarioScore,
  calculateUniversalScore,
  isProgressEligible,
  validateEvaluationReferences,
} from "./evaluation-rules.js";

describe("evaluation-rules", () => {
  it("calculates deterministic universal score as rounded average of 5 skills", () => {
    const scores = {
      clarity: 80,
      assertiveness: 65,
      empathy: 75,
      structure: 82,
      conciseness: 70,
    };
    // sum = 372, 372 / 5 = 74.4 -> 74
    expect(calculateUniversalScore(scores)).toBe(74);
  });

  it("calculates deterministic scenario score from normalized objective outcomes", () => {
    const objectives = [
      { status: "ACHIEVED" as const }, // 100
      { status: "PARTIALLY_ACHIEVED" as const }, // 50
      { status: "ACHIEVED" as const }, // 100
      { status: "MISSED" as const }, // 0
    ];
    // sum = 250, 250 / 4 = 62.5 -> 63
    expect(calculateScenarioScore(objectives)).toBe(63);
  });

  it("calculates deterministic overall score as 70% universal + 30% scenario", () => {
    const universalScore = 74;
    const scenarioScore = 75;
    // 74 * 0.7 + 75 * 0.3 = 51.8 + 22.5 = 74.3 -> 74
    expect(calculateOverallScore(universalScore, scenarioScore)).toBe(74);
  });

  it("determines progress eligibility only after at least 3 completed turns", () => {
    expect(isProgressEligible(0)).toBe(false);
    expect(isProgressEligible(1)).toBe(false);
    expect(isProgressEligible(2)).toBe(false);
    expect(isProgressEligible(3)).toBe(true);
    expect(isProgressEligible(5)).toBe(true);
  });

  describe("validateEvaluationReferences", () => {
    const validTurnIds = new Set([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    const scenarioObjectiveIds = new Set([
      "CLEAR_REQUEST",
      "EVIDENCE_BASED_CASE",
    ]);

    const baseRaw = {
      skills: {
        clarity: { score: 80, explanation: "..." },
        assertiveness: { score: 80, explanation: "..." },
        empathy: { score: 80, explanation: "..." },
        structure: { score: 80, explanation: "..." },
        conciseness: { score: 80, explanation: "..." },
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED" as const,
          explanation: "...",
          evidenceTurnIds: ["11111111-1111-4111-8111-111111111111"],
        },
        {
          objectiveId: "EVIDENCE_BASED_CASE",
          status: "PARTIALLY_ACHIEVED" as const,
          explanation: "...",
          evidenceTurnIds: ["22222222-2222-4222-8222-222222222222"],
        },
      ],
      strengths: [
        {
          title: "Clear opening",
          explanation: "...",
          turnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      improvements: [
        {
          title: "More evidence",
          explanation: "...",
          turnIds: ["22222222-2222-4222-8222-222222222222"],
        },
      ],
      moments: [
        {
          turnId: "11111111-1111-4111-8111-111111111111",
          type: "STRENGTH" as const,
          explanation: "...",
          betterResponse: null,
        },
      ],
      summary: "Good session",
      nextFocus: {
        skill: "ASSERTIVENESS" as const,
        reason: "...",
      },
    };

    it("passes when all turn IDs and objective IDs are valid", () => {
      const result = validateEvaluationReferences(
        baseRaw,
        validTurnIds,
        scenarioObjectiveIds,
      );
      expect(result.valid).toBe(true);
    });

    it("rejects when an objective references an invalid turn ID", () => {
      const raw = {
        ...baseRaw,
        objectives: [
          {
            ...baseRaw.objectives[0]!,
            evidenceTurnIds: ["99999999-9999-4999-8999-999999999999"],
          },
          baseRaw.objectives[1]!,
        ],
      };
      const result = validateEvaluationReferences(
        raw,
        validTurnIds,
        scenarioObjectiveIds,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("99999999-9999-4999-8999-999999999999");
    });

    it("rejects when an unknown objective ID is present", () => {
      const raw = {
        ...baseRaw,
        objectives: [
          baseRaw.objectives[0]!,
          {
            objectiveId: "UNKNOWN_OBJECTIVE",
            status: "ACHIEVED" as const,
            explanation: "...",
            evidenceTurnIds: ["11111111-1111-4111-8111-111111111111"],
          },
        ],
      };
      const result = validateEvaluationReferences(
        raw,
        validTurnIds,
        scenarioObjectiveIds,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("UNKNOWN_OBJECTIVE");
    });

    it("rejects when a required scenario objective is missing", () => {
      const raw = {
        ...baseRaw,
        objectives: [baseRaw.objectives[0]!], // missing EVIDENCE_BASED_CASE
      };
      const result = validateEvaluationReferences(
        raw,
        validTurnIds,
        scenarioObjectiveIds,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("EVIDENCE_BASED_CASE");
    });

    it("rejects when a moment references an invalid turn ID", () => {
      const raw = {
        ...baseRaw,
        moments: [
          {
            turnId: "99999999-9999-4999-8999-999999999999",
            type: "IMPROVEMENT" as const,
            explanation: "...",
            betterResponse: "...",
          },
        ],
      };
      const result = validateEvaluationReferences(
        raw,
        validTurnIds,
        scenarioObjectiveIds,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("99999999-9999-4999-8999-999999999999");
    });
  });
});
