import type {
  RecommendedScenario,
  SkillScores,
  UniversalSkill,
} from "@kalemny/contracts";

export interface EvaluationSkillRecord {
  clarity: number;
  assertiveness: number;
  empathy: number;
  structure: number;
  conciseness: number;
}

export const CANONICAL_UNIVERSAL_SKILLS: readonly UniversalSkill[] = [
  "CLARITY",
  "ASSERTIVENESS",
  "EMPATHY",
  "STRUCTURE",
  "CONCISENESS",
] as const;

export const SKILL_TO_RECOMMENDED_SCENARIO: Record<
  UniversalSkill,
  RecommendedScenario
> = {
  CLARITY: {
    key: "salary-negotiation",
    title: "Salary Negotiation",
  },
  ASSERTIVENESS: {
    key: "salary-negotiation",
    title: "Salary Negotiation",
  },
  EMPATHY: {
    key: "salary-negotiation",
    title: "Salary Negotiation",
  },
  STRUCTURE: {
    key: "salary-negotiation",
    title: "Salary Negotiation",
  },
  CONCISENESS: {
    key: "salary-negotiation",
    title: "Salary Negotiation",
  },
};

export interface ProgressProfileResult {
  skills: SkillScores | null;
  weakestSkill: UniversalSkill | null;
}

export function calculateProgressProfile(
  evaluations: readonly EvaluationSkillRecord[],
): ProgressProfileResult {
  if (evaluations.length === 0) {
    return {
      skills: null,
      weakestSkill: null,
    };
  }

  const count = evaluations.length;
  const clarity = Math.round(
    evaluations.reduce((sum, e) => sum + e.clarity, 0) / count,
  );
  const assertiveness = Math.round(
    evaluations.reduce((sum, e) => sum + e.assertiveness, 0) / count,
  );
  const empathy = Math.round(
    evaluations.reduce((sum, e) => sum + e.empathy, 0) / count,
  );
  const structure = Math.round(
    evaluations.reduce((sum, e) => sum + e.structure, 0) / count,
  );
  const conciseness = Math.round(
    evaluations.reduce((sum, e) => sum + e.conciseness, 0) / count,
  );

  const skills: SkillScores = {
    clarity,
    assertiveness,
    empathy,
    structure,
    conciseness,
  };

  const skillScoreMap: Record<UniversalSkill, number> = {
    CLARITY: clarity,
    ASSERTIVENESS: assertiveness,
    EMPATHY: empathy,
    STRUCTURE: structure,
    CONCISENESS: conciseness,
  };

  let weakestSkill: UniversalSkill = "CLARITY";
  let minScore = skillScoreMap.CLARITY;

  for (const skill of CANONICAL_UNIVERSAL_SKILLS) {
    const score = skillScoreMap[skill];
    if (score < minScore) {
      minScore = score;
      weakestSkill = skill;
    }
  }

  return {
    skills,
    weakestSkill,
  };
}

export function getRecommendedScenario(
  weakestSkill: UniversalSkill | null,
): RecommendedScenario | null {
  if (!weakestSkill) {
    return null;
  }

  return SKILL_TO_RECOMMENDED_SCENARIO[weakestSkill] ?? null;
}
