import type { SkillScores, UniversalSkill } from "@kalemny/contracts";

export const UNIVERSAL_SKILL_ENUMS: readonly UniversalSkill[] = [
  "CLARITY",
  "ASSERTIVENESS",
  "EMPATHY",
  "STRUCTURE",
  "CONCISENESS",
] as const;

export type SkillScoreKey = keyof SkillScores;

export const SKILL_SCORE_KEYS: readonly SkillScoreKey[] = [
  "clarity",
  "assertiveness",
  "empathy",
  "structure",
  "conciseness",
] as const;

export const DEFAULT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
