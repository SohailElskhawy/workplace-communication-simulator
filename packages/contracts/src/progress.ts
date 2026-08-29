import { z } from "zod";

import { SkillScoresSchema, UniversalSkillSchema } from "./evaluation.js";

export const RecommendedScenarioSchema = z.strictObject({
  key: z.string().min(1),
  title: z.string().min(1),
});
export type RecommendedScenario = z.infer<typeof RecommendedScenarioSchema>;

export const ProgressDataSchema = z.strictObject({
  skills: SkillScoresSchema.nullable(),
  weakestSkill: UniversalSkillSchema.nullable(),
  recommendedScenario: RecommendedScenarioSchema.nullable(),
  eligibleSessionCount: z.number().int().nonnegative(),
});
export type ProgressData = z.infer<typeof ProgressDataSchema>;

export const ProgressResponseSchema = z.strictObject({
  data: ProgressDataSchema,
});
export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;
