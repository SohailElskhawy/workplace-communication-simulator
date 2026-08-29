import { describe, expect, it } from "vitest";

import {
  ProgressDataSchema,
  ProgressResponseSchema,
  RecommendedScenarioSchema,
} from "./progress.js";

describe("Progress contracts", () => {
  it("validates populated progress data with active skill profile", () => {
    const data = {
      skills: {
        clarity: 80,
        assertiveness: 65,
        empathy: 85,
        structure: 70,
        conciseness: 75,
      },
      weakestSkill: "ASSERTIVENESS",
      recommendedScenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
      },
      eligibleSessionCount: 4,
    };

    const parsed = ProgressDataSchema.safeParse(data);
    expect(parsed.success).toBe(true);

    const responseParsed = ProgressResponseSchema.safeParse({ data });
    expect(responseParsed.success).toBe(true);
  });

  it("validates empty progress state when 0 eligible sessions exist", () => {
    const data = {
      skills: null,
      weakestSkill: null,
      recommendedScenario: null,
      eligibleSessionCount: 0,
    };

    const parsed = ProgressDataSchema.safeParse(data);
    expect(parsed.success).toBe(true);

    const responseParsed = ProgressResponseSchema.safeParse({ data });
    expect(responseParsed.success).toBe(true);
  });

  it("rejects negative eligibleSessionCount", () => {
    const data = {
      skills: null,
      weakestSkill: null,
      recommendedScenario: null,
      eligibleSessionCount: -1,
    };

    const parsed = ProgressDataSchema.safeParse(data);
    expect(parsed.success).toBe(false);
  });

  it("validates recommended scenario schema", () => {
    const valid = RecommendedScenarioSchema.safeParse({
      key: "salary-negotiation",
      title: "Salary Negotiation",
    });
    expect(valid.success).toBe(true);

    const invalid = RecommendedScenarioSchema.safeParse({
      key: "",
      title: "Salary Negotiation",
    });
    expect(invalid.success).toBe(false);
  });
});
