import { z } from "zod";

export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const PublicScenarioSummarySchema = z.object({
  key: z.string().min(1),
  version: z.int().min(1),
  title: z.string().min(1),
  titleAr: z.string().min(1).optional(),
  category: z.string().min(1),
  summary: z.string().min(1),
  summaryAr: z.string().min(1).optional(),
  isCustom: z.boolean().optional(),
});

export const PublicScenarioContextSchema = z.object({
  description: z.string().min(1),
  descriptionAr: z.string().min(1).optional(),
  userRole: z.string().min(1),
  userRoleAr: z.string().min(1).optional(),
  aiRole: z.string().min(1),
  aiRoleAr: z.string().min(1).optional(),
  userObjective: z.string().min(1),
  userObjectiveAr: z.string().min(1).optional(),
  stakes: z.string().min(1),
  stakesAr: z.string().min(1).optional(),
});

export const PublicScenarioDetailSchema = PublicScenarioSummarySchema.extend({
  context: PublicScenarioContextSchema,
  availableDifficulties: z.array(DifficultySchema).min(1),
});

export const ScenarioListResponseSchema = z.object({
  data: z.array(PublicScenarioSummarySchema),
});

export const ScenarioDetailResponseSchema = z.object({
  data: PublicScenarioDetailSchema,
});

export const CreateCustomScenarioRequestSchema = z.object({
  jobDescription: z.string().trim().min(50).max(20000),
});

export const CreateCustomScenarioResponseSchema = z.object({
  data: PublicScenarioDetailSchema,
});

export type Difficulty = z.infer<typeof DifficultySchema>;
export type PublicScenarioSummary = z.infer<typeof PublicScenarioSummarySchema>;
export type PublicScenarioDetail = z.infer<typeof PublicScenarioDetailSchema>;
export type ScenarioListResponse = z.infer<typeof ScenarioListResponseSchema>;
export type ScenarioDetailResponse = z.infer<
  typeof ScenarioDetailResponseSchema
>;
export type CreateCustomScenarioRequest = z.infer<
  typeof CreateCustomScenarioRequestSchema
>;
export type CreateCustomScenarioResponse = z.infer<
  typeof CreateCustomScenarioResponseSchema
>;
