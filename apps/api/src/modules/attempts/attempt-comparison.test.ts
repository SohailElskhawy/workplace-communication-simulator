import type { EvaluationData } from "@kalemny/contracts";
import { describe, expect, it } from "vitest";

import {
  calculateAttemptComparison,
  objectiveStatusToNumeric,
} from "./attempt-comparison.js";

function createMockEvaluation(
  overrides: Partial<EvaluationData> = {},
): EvaluationData {
  return {
    attemptId: "11111111-1111-4111-8111-111111111111",
    skills: {
      clarity: 70,
      assertiveness: 60,
      empathy: 80,
      structure: 65,
      conciseness: 75,
    },
    universalScore: 70,
    scenarioScore: 50,
    overallScore: 64,
    objectives: [
      {
        objectiveId: "CLEAR_REQUEST",
        status: "PARTIALLY_ACHIEVED",
        explanation: "Partial explanation",
        evidenceTurnIds: [],
      },
      {
        objectiveId: "VALUE_PROPOSITION",
        status: "MISSED",
        explanation: "Missed explanation",
        evidenceTurnIds: [],
      },
    ],
    strengths: [],
    improvements: [],
    moments: [],
    summary: "Summary text",
    nextFocus: {
      skill: "ASSERTIVENESS",
      reason: "Focus on assertiveness",
    },
    createdAt: new Date("2026-08-29T12:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("attempt-comparison", () => {
  it("converts objective status to numeric accurately", () => {
    expect(objectiveStatusToNumeric("ACHIEVED")).toBe(100);
    expect(objectiveStatusToNumeric("PARTIALLY_ACHIEVED")).toBe(50);
    expect(objectiveStatusToNumeric("MISSED")).toBe(0);
  });

  it("returns null when previous attempt or evaluation is missing", () => {
    const current = {
      id: "22222222-2222-4222-8222-222222222222",
      difficulty: "MEDIUM" as const,
      evaluation: createMockEvaluation(),
    };

    expect(calculateAttemptComparison(current, null)).toBeNull();
    expect(
      calculateAttemptComparison(current, {
        id: "11111111-1111-4111-8111-111111111111",
        difficulty: "MEDIUM",
        evaluation: null,
      }),
    ).toBeNull();
  });

  it("returns null when current evaluation is missing", () => {
    const current = {
      id: "22222222-2222-4222-8222-222222222222",
      difficulty: "MEDIUM" as const,
      evaluation: null,
    };
    const previous = {
      id: "11111111-1111-4111-8111-111111111111",
      difficulty: "MEDIUM" as const,
      evaluation: createMockEvaluation(),
    };

    expect(calculateAttemptComparison(current, previous)).toBeNull();
  });

  it("calculates same-difficulty comparison accurately with improvements", () => {
    const prevEval = createMockEvaluation({
      overallScore: 64,
      skills: {
        clarity: 70,
        assertiveness: 60,
        empathy: 80,
        structure: 65,
        conciseness: 75,
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "PARTIALLY_ACHIEVED",
          explanation: "Partial explanation",
          evidenceTurnIds: [],
        },
        {
          objectiveId: "VALUE_PROPOSITION",
          status: "MISSED",
          explanation: "Missed explanation",
          evidenceTurnIds: [],
        },
      ],
      nextFocus: {
        skill: "ASSERTIVENESS",
        reason: "Need more assertiveness",
      },
    });

    const currEval = createMockEvaluation({
      attemptId: "22222222-2222-4222-8222-222222222222",
      overallScore: 78,
      skills: {
        clarity: 80,
        assertiveness: 75,
        empathy: 80,
        structure: 70,
        conciseness: 70,
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED",
          explanation: "Achieved explanation",
          evidenceTurnIds: [],
        },
        {
          objectiveId: "VALUE_PROPOSITION",
          status: "PARTIALLY_ACHIEVED",
          explanation: "Partially achieved explanation",
          evidenceTurnIds: [],
        },
      ],
      nextFocus: {
        skill: "STRUCTURE",
        reason: "Next focus",
      },
    });

    const result = calculateAttemptComparison(
      {
        id: "22222222-2222-4222-8222-222222222222",
        difficulty: "MEDIUM",
        evaluation: currEval,
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        difficulty: "MEDIUM",
        evaluation: prevEval,
      },
    );

    expect(result).not.toBeNull();
    expect(result!.comparable).toBe(true);
    expect(result!.nonEquivalentReason).toBeNull();
    expect(result!.previousOverallScore).toBe(64);
    expect(result!.currentOverallScore).toBe(78);
    expect(result!.overallDelta).toBe(14);

    expect(result!.skillDeltas).toEqual({
      clarity: 10,
      assertiveness: 15,
      empathy: 0,
      structure: 5,
      conciseness: -5,
    });

    expect(result!.objectives).toEqual([
      {
        objectiveId: "CLEAR_REQUEST",
        previousStatus: "PARTIALLY_ACHIEVED",
        currentStatus: "ACHIEVED",
        statusChanged: "IMPROVED",
      },
      {
        objectiveId: "VALUE_PROPOSITION",
        previousStatus: "MISSED",
        currentStatus: "PARTIALLY_ACHIEVED",
        statusChanged: "IMPROVED",
      },
    ]);

    expect(result!.weakArea).toEqual({
      skill: "ASSERTIVENESS",
      previousScore: 60,
      currentScore: 75,
      delta: 15,
      improved: true,
    });
  });

  it("marks cross-difficulty comparison as non-equivalent", () => {
    const prevEval = createMockEvaluation();
    const currEval = createMockEvaluation({
      attemptId: "22222222-2222-4222-8222-222222222222",
    });

    const result = calculateAttemptComparison(
      {
        id: "22222222-2222-4222-8222-222222222222",
        difficulty: "HARD",
        evaluation: currEval,
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        difficulty: "EASY",
        evaluation: prevEval,
      },
    );

    expect(result).not.toBeNull();
    expect(result!.comparable).toBe(false);
    expect(result!.nonEquivalentReason).toBe(
      "Difficulty changed from EASY to HARD. Cross-difficulty comparisons are not directly equivalent because difficulty levels alter counterpart resistance and conversational expectations.",
    );
  });

  it("handles regressions in objectives and weak areas correctly", () => {
    const prevEval = createMockEvaluation({
      skills: {
        clarity: 80,
        assertiveness: 70,
        empathy: 80,
        structure: 80,
        conciseness: 80,
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED",
          explanation: "",
          evidenceTurnIds: [],
        },
      ],
      nextFocus: {
        skill: "CLARITY",
        reason: "Improve clarity",
      },
    });

    const currEval = createMockEvaluation({
      attemptId: "22222222-2222-4222-8222-222222222222",
      skills: {
        clarity: 65,
        assertiveness: 70,
        empathy: 80,
        structure: 80,
        conciseness: 80,
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "PARTIALLY_ACHIEVED",
          explanation: "",
          evidenceTurnIds: [],
        },
      ],
    });

    const result = calculateAttemptComparison(
      {
        id: "22222222-2222-4222-8222-222222222222",
        difficulty: "MEDIUM",
        evaluation: currEval,
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        difficulty: "MEDIUM",
        evaluation: prevEval,
      },
    );

    expect(result?.objectives[0]?.statusChanged).toBe("REGRESSED");
    expect(result!.weakArea).toEqual({
      skill: "CLARITY",
      previousScore: 80,
      currentScore: 65,
      delta: -15,
      improved: false,
    });
  });
});
