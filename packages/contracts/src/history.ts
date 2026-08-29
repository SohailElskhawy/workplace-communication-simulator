import { z } from "zod";

import { AttemptStatusSchema } from "./attempt.js";
import { DifficultySchema } from "./scenario.js";

export const HistoryItemScenarioSchema = z.strictObject({
  key: z.string().min(1),
  title: z.string().min(1),
});
export type HistoryItemScenario = z.infer<typeof HistoryItemScenarioSchema>;

export const HistoryItemSchema = z.strictObject({
  attemptId: z.string().uuid(),
  scenario: HistoryItemScenarioSchema,
  difficulty: DifficultySchema,
  status: AttemptStatusSchema,
  overallScore: z.number().int().min(0).max(100).nullable(),
  retryOfAttemptId: z.string().uuid().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type HistoryItem = z.infer<typeof HistoryItemSchema>;

export const HistoryPaginationMetaSchema = z.strictObject({
  nextCursor: z.string().nullable(),
});
export type HistoryPaginationMeta = z.infer<typeof HistoryPaginationMetaSchema>;

export const HistoryResponseSchema = z.strictObject({
  data: z.array(HistoryItemSchema),
  meta: HistoryPaginationMetaSchema,
});
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

export const HistoryQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
