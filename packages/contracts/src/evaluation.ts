import { z } from "zod";

export const UniversalSkillSchema = z.enum([
  "CLARITY",
  "ASSERTIVENESS",
  "EMPATHY",
  "STRUCTURE",
  "CONCISENESS",
]);

export const ObjectiveStatusSchema = z.enum([
  "ACHIEVED",
  "PARTIALLY_ACHIEVED",
  "MISSED",
]);

export const CoachingMomentTypeSchema = z.enum([
  "STRENGTH",
  "IMPROVEMENT",
  "MISSED_OPPORTUNITY",
]);

const ResourceIdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const SkillScoresSchema = z.strictObject({
  clarity: z.int().min(0).max(100),
  assertiveness: z.int().min(0).max(100),
  empathy: z.int().min(0).max(100),
  structure: z.int().min(0).max(100),
  conciseness: z.int().min(0).max(100),
});

export const ObjectiveResultSchema = z.strictObject({
  objectiveId: z.string().min(1),
  status: ObjectiveStatusSchema,
  explanation: z.string().min(1),
  evidenceTurnIds: z.array(ResourceIdSchema),
});

export const StrengthFeedbackSchema = z.strictObject({
  title: z.string().min(1),
  explanation: z.string().min(1),
  turnIds: z.array(ResourceIdSchema),
});

export const ImprovementFeedbackSchema = z.strictObject({
  title: z.string().min(1),
  explanation: z.string().min(1),
  turnIds: z.array(ResourceIdSchema),
});

export const CoachingMomentSchema = z.strictObject({
  turnId: ResourceIdSchema,
  type: CoachingMomentTypeSchema,
  explanation: z.string().min(1),
  betterResponse: z.string().nullable().optional().default(null),
});

export const NextFocusSchema = z.strictObject({
  skill: UniversalSkillSchema,
  reason: z.string().min(1),
});

export const EvaluationDataSchema = z.strictObject({
  attemptId: ResourceIdSchema,
  skills: SkillScoresSchema,
  universalScore: z.int().min(0).max(100),
  scenarioScore: z.int().min(0).max(100),
  overallScore: z.int().min(0).max(100),
  objectives: z.array(ObjectiveResultSchema),
  strengths: z.array(StrengthFeedbackSchema),
  improvements: z.array(ImprovementFeedbackSchema),
  moments: z.array(CoachingMomentSchema),
  summary: z.string().min(1),
  nextFocus: NextFocusSchema,
  createdAt: TimestampSchema,
});

export const EvaluationResponseSchema = z.strictObject({
  data: EvaluationDataSchema,
});

export type UniversalSkill = z.infer<typeof UniversalSkillSchema>;
export type ObjectiveStatus = z.infer<typeof ObjectiveStatusSchema>;
export type CoachingMomentType = z.infer<typeof CoachingMomentTypeSchema>;
export type SkillScores = z.infer<typeof SkillScoresSchema>;
export type ObjectiveResult = z.infer<typeof ObjectiveResultSchema>;
export type StrengthFeedback = z.infer<typeof StrengthFeedbackSchema>;
export type ImprovementFeedback = z.infer<typeof ImprovementFeedbackSchema>;
export type CoachingMoment = z.infer<typeof CoachingMomentSchema>;
export type NextFocus = z.infer<typeof NextFocusSchema>;
export type EvaluationData = z.infer<typeof EvaluationDataSchema>;
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;
