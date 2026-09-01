import { z } from "zod";

import { AttemptComparisonSchema } from "./comparison.js";
import { EvaluationDataSchema } from "./evaluation.js";
import { DifficultySchema } from "./scenario.js";

export const MAX_TURN_TEXT_LENGTH = 1_000;

export const AttemptStatusSchema = z.enum([
  "ACTIVE",
  "EVALUATING",
  "COMPLETED",
  "EVALUATION_FAILED",
  "ABANDONED",
]);

export const InputMethodSchema = z.enum(["TEXT", "VOICE"]);
export const TurnStatusSchema = z.enum(["PENDING", "COMPLETED", "FAILED"]);

/**
 * Voice interaction mode chosen at simulation start. Push-to-talk is the
 * Release 1 default (record → transcribe → review → send); realtime is the
 * feature-flagged ElevenLabs live conversation mode.
 */
export const InteractionModeSchema = z.enum(["PUSH_TO_TALK", "REALTIME"]);

const ResourceIdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const CreateAttemptRequestSchema = z.strictObject({
  scenarioKey: z.string().trim().min(1),
  difficulty: DifficultySchema,
  retryOfAttemptId: ResourceIdSchema.nullable().optional().default(null),
  interactionMode: InteractionModeSchema.optional().default("PUSH_TO_TALK"),
});

export const AttemptScenarioSchema = z.strictObject({
  key: z.string().min(1),
  version: z.int().min(1),
  title: z.string().min(1),
  openingMessage: z.string().min(1).optional(),
});

export const ConversationTurnSchema = z.strictObject({
  id: ResourceIdSchema,
  sequence: z.int().min(1),
  inputMethod: InputMethodSchema,
  userText: z.string().min(1),
  assistantText: z.string().nullable(),
  status: TurnStatusSchema,
  createdAt: TimestampSchema,
  completedAt: TimestampSchema.nullable(),
});

export const CreateAttemptResponseSchema = z.strictObject({
  data: z.strictObject({
    id: ResourceIdSchema,
    status: z.literal("ACTIVE"),
    difficulty: DifficultySchema,
    interactionMode: InteractionModeSchema,
    scenario: AttemptScenarioSchema,
    openingMessage: z.string().min(1),
    startedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  }),
});

export const AttemptDetailResponseSchema = z.strictObject({
  data: z.strictObject({
    id: ResourceIdSchema,
    status: AttemptStatusSchema,
    difficulty: DifficultySchema,
    interactionMode: InteractionModeSchema,
    scenario: AttemptScenarioSchema,
    retryOfAttemptId: ResourceIdSchema.nullable(),
    turns: z.array(ConversationTurnSchema),
    evaluation: EvaluationDataSchema.nullable(),
    comparison: AttemptComparisonSchema.nullable().optional().default(null),
    startedAt: TimestampSchema,
    endedAt: TimestampSchema.nullable(),
    expiresAt: TimestampSchema,
  }),
});

export const CreateTurnRequestSchema = z.strictObject({
  clientRequestId: z.string().trim().min(1).max(128),
  text: z.string().trim().min(1).max(MAX_TURN_TEXT_LENGTH),
  inputMethod: InputMethodSchema,
});

export const TurnResponseSchema = z.strictObject({
  data: ConversationTurnSchema,
});

export const FinishAttemptResponseSchema = z.strictObject({
  data: z.strictObject({
    id: ResourceIdSchema,
    status: AttemptStatusSchema,
  }),
});

export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;
export type InputMethod = z.infer<typeof InputMethodSchema>;
export type InteractionMode = z.infer<typeof InteractionModeSchema>;
export type TurnStatus = z.infer<typeof TurnStatusSchema>;
export type CreateAttemptRequest = z.infer<typeof CreateAttemptRequestSchema>;
export type CreateAttemptResponse = z.infer<typeof CreateAttemptResponseSchema>;
export type AttemptDetailResponse = z.infer<typeof AttemptDetailResponseSchema>;
export type CreateTurnRequest = z.infer<typeof CreateTurnRequestSchema>;
export type TurnResponse = z.infer<typeof TurnResponseSchema>;
export type FinishAttemptResponse = z.infer<typeof FinishAttemptResponseSchema>;
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
