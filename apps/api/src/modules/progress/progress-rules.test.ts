import { describe, expect, it } from "vitest";

import {
  calculateProgressProfile,
  CANONICAL_UNIVERSAL_SKILLS,
  getRecommendedScenario,
  SKILL_TO_RECOMMENDED_SCENARIO,
} from "./progress-rules.js";

describe("Progress rules", () => {
  it("returns null skills and weakestSkill for 0 evaluations", () => {
    const result = calculateProgressProfile([]);
    expect(result.skills).toBeNull();
    expect(result.weakestSkill).toBeNull();
  });

  it("calculates progress correctly for 1 evaluation", () => {
    const evaluation = {
      clarity: 80,
      assertiveness: 60,
      empathy: 90,
      structure: 75,
      conciseness: 85,
    };

    const result = calculateProgressProfile([evaluation]);
    expect(result.skills).toEqual({
      clarity: 80,
      assertiveness: 60,
      empathy: 90,
      structure: 75,
      conciseness: 85,
    });
    expect(result.weakestSkill).toBe("ASSERTIVENESS");
  });

  it("calculates rounded average across multiple evaluations", () => {
    const evaluations = [
      {
        clarity: 70,
        assertiveness: 60,
        empathy: 80,
        structure: 75,
        conciseness: 65,
      },
      {
        clarity: 75,
        assertiveness: 62,
        empathy: 82,
        structure: 78,
        conciseness: 68,
      },
      {
        clarity: 72,
        assertiveness: 59,
        empathy: 85,
        structure: 80,
        conciseness: 70,
      },
    ];

    // clarity: (70+75+72)/3 = 72.33 -> 72
    // assertiveness: (60+62+59)/3 = 60.33 -> 60
    // empathy: (80+82+85)/3 = 82.33 -> 82
    // structure: (75+78+80)/3 = 77.67 -> 78
    // conciseness: (65+68+70)/3 = 67.67 -> 68
    const result = calculateProgressProfile(evaluations);
    expect(result.skills).toEqual({
      clarity: 72,
      assertiveness: 60,
      empathy: 82,
      structure: 78,
      conciseness: 68,
    });
    expect(result.weakestSkill).toBe("ASSERTIVENESS");
  });

  it("applies deterministic tie-breaking when two or more skills have the same lowest score", () => {
    const evaluation = {
      clarity: 50,
      assertiveness: 50,
      empathy: 80,
      structure: 90,
      conciseness: 50,
    };

    // Tie between CLARITY, ASSERTIVENESS, and CONCISENESS (all 50).
    // Canonical order is CLARITY, ASSERTIVENESS, EMPATHY, STRUCTURE, CONCISENESS
    // CLARITY is the first in order and should win the tie.
    const result = calculateProgressProfile([evaluation]);
    expect(result.weakestSkill).toBe("CLARITY");
  });

  it("identifies other skills as weakest when they strictly have the lowest score", () => {
    for (const skill of CANONICAL_UNIVERSAL_SKILLS) {
      const evaluation = {
        clarity: 80,
        assertiveness: 80,
        empathy: 80,
        structure: 80,
        conciseness: 80,
      };

      const key = skill.toLowerCase() as keyof typeof evaluation;
      evaluation[key] = 40;

      const result = calculateProgressProfile([evaluation]);
      expect(result.weakestSkill).toBe(skill);
    }
  });

  it("returns recommended scenario for each skill", () => {
    for (const skill of CANONICAL_UNIVERSAL_SKILLS) {
      const recommended = getRecommendedScenario(skill);
      expect(recommended).toEqual(SKILL_TO_RECOMMENDED_SCENARIO[skill]);
      expect(recommended?.key).toBe("salary-negotiation");
    }
  });

  it("returns null recommended scenario when weakest skill is null", () => {
    expect(getRecommendedScenario(null)).toBeNull();
  });
});
