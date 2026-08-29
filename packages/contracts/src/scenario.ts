import { z } from "zod";

export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const PublicScenarioSummarySchema = z.object({
  key: z.string().min(1),
  version: z.int().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  summary: z.string().min(1),
});

export const PublicScenarioContextSchema = z.object({
  description: z.string().min(1),
  userRole: z.string().min(1),
  aiRole: z.string().min(1),
  userObjective: z.string().min(1),
  stakes: z.string().min(1),
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

export type Difficulty = z.infer<typeof DifficultySchema>;
export type PublicScenarioSummary = z.infer<typeof PublicScenarioSummarySchema>;
export type PublicScenarioDetail = z.infer<typeof PublicScenarioDetailSchema>;
export type ScenarioListResponse = z.infer<typeof ScenarioListResponseSchema>;
export type ScenarioDetailResponse = z.infer<
  typeof ScenarioDetailResponseSchema
>;
