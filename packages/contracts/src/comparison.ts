import { z } from "zod";

import {
  ObjectiveStatusSchema,
  SkillScoresSchema,
  UniversalSkillSchema,
} from "./evaluation.js";
import { DifficultySchema } from "./scenario.js";

const ResourceIdSchema = z.uuid();

export const SkillDeltasSchema = z.strictObject({
  clarity: z.int(),
  assertiveness: z.int(),
  empathy: z.int(),
  structure: z.int(),
  conciseness: z.int(),
});

export const ObjectiveDeltaStatusSchema = z.enum([
  "IMPROVED",
  "REGRESSED",
  "UNCHANGED",
]);

export const ObjectiveDeltaSchema = z.strictObject({
  objectiveId: z.string().min(1),
  previousStatus: ObjectiveStatusSchema,
  currentStatus: ObjectiveStatusSchema,
  statusChanged: ObjectiveDeltaStatusSchema,
});

export const WeakAreaComparisonSchema = z.strictObject({
  skill: UniversalSkillSchema,
  previousScore: z.int().min(0).max(100),
  currentScore: z.int().min(0).max(100),
  delta: z.int(),
  improved: z.boolean(),
});

export const AttemptComparisonSchema = z.strictObject({
  previousAttemptId: ResourceIdSchema,
  previousDifficulty: DifficultySchema,
  currentDifficulty: DifficultySchema,
  comparable: z.boolean(),
  nonEquivalentReason: z.string().nullable(),
  previousOverallScore: z.int().min(0).max(100),
  currentOverallScore: z.int().min(0).max(100),
  overallDelta: z.int(),
  previousSkills: SkillScoresSchema,
  currentSkills: SkillScoresSchema,
  skillDeltas: SkillDeltasSchema,
  objectives: z.array(ObjectiveDeltaSchema),
  weakArea: WeakAreaComparisonSchema.nullable(),
});

export const AttemptComparisonResponseSchema = z.strictObject({
  data: AttemptComparisonSchema.nullable(),
});

export type SkillDeltas = z.infer<typeof SkillDeltasSchema>;
export type ObjectiveDeltaStatus = z.infer<typeof ObjectiveDeltaStatusSchema>;
export type ObjectiveDelta = z.infer<typeof ObjectiveDeltaSchema>;
export type WeakAreaComparison = z.infer<typeof WeakAreaComparisonSchema>;
export type AttemptComparison = z.infer<typeof AttemptComparisonSchema>;
export type AttemptComparisonResponse = z.infer<
  typeof AttemptComparisonResponseSchema
>;
