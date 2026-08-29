import { describe, expect, it } from "vitest";

import {
  AttemptComparisonResponseSchema,
  AttemptComparisonSchema,
} from "./comparison.js";

describe("comparison contracts", () => {
  const validComparison = {
    previousAttemptId: "11111111-1111-4111-8111-111111111111",
    previousDifficulty: "MEDIUM",
    currentDifficulty: "MEDIUM",
    comparable: true,
    nonEquivalentReason: null,
    previousOverallScore: 70,
    currentOverallScore: 78,
    overallDelta: 8,
    previousSkills: {
      clarity: 65,
      assertiveness: 60,
      empathy: 75,
      structure: 70,
      conciseness: 80,
    },
    currentSkills: {
      clarity: 75,
      assertiveness: 72,
      empathy: 75,
      structure: 80,
      conciseness: 88,
    },
    skillDeltas: {
      clarity: 10,
      assertiveness: 12,
      empathy: 0,
      structure: 10,
      conciseness: 8,
    },
    objectives: [
      {
        objectiveId: "CLEAR_REQUEST",
        previousStatus: "PARTIALLY_ACHIEVED",
        currentStatus: "ACHIEVED",
        statusChanged: "IMPROVED",
      },
      {
        objectiveId: "PROFESSIONAL_TONE",
        previousStatus: "ACHIEVED",
        currentStatus: "ACHIEVED",
        statusChanged: "UNCHANGED",
      },
    ],
    weakArea: {
      skill: "ASSERTIVENESS",
      previousScore: 60,
      currentScore: 72,
      delta: 12,
      improved: true,
    },
  };

  it("validates valid comparable attempt comparison", () => {
    const parsed = AttemptComparisonSchema.parse(validComparison);
    expect(parsed.comparable).toBe(true);
    expect(parsed.overallDelta).toBe(8);
    expect(parsed.weakArea?.improved).toBe(true);
  });

  it("validates cross-difficulty non-equivalent comparison", () => {
    const nonEquivalent = {
      ...validComparison,
      previousDifficulty: "EASY",
      currentDifficulty: "HARD",
      comparable: false,
      nonEquivalentReason:
        "Difficulty changed from EASY to HARD. Cross-difficulty comparisons are not directly equivalent.",
    };
    const parsed = AttemptComparisonSchema.parse(nonEquivalent);
    expect(parsed.comparable).toBe(false);
    expect(parsed.nonEquivalentReason).toContain("Cross-difficulty");
  });

  it("validates comparison response schema with null data", () => {
    const parsed = AttemptComparisonResponseSchema.parse({ data: null });
    expect(parsed.data).toBeNull();
  });
});
