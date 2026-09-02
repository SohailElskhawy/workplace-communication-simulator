import { z } from "zod";

import { DifficultySchema } from "./scenario.js";

const ResourceIdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

/**
 * Response for `POST /api/v1/attempts/:attemptId/realtime-session`.
 *
 * Carries only public scenario data and short-lived credentials. Hidden
 * persona/objective/counterpart configuration is fetched separately by the
 * ElevenLabs agent through the tool-protected context endpoint and must
 * never be added here.
 */
export const RealtimeSessionResponseSchema = z.strictObject({
  data: z.strictObject({
    attemptId: ResourceIdSchema,
    agentId: z.string().min(1),
    conversationToken: z.string().min(1),
    contextToken: z.string().min(1),
    contextTokenExpiresAt: TimestampSchema,
    scenario: z.strictObject({
      key: z.string().min(1),
      version: z.int().min(1),
      title: z.string().min(1),
    }),
    difficulty: DifficultySchema,
    openingMessage: z.string().min(1),
    expiresAt: TimestampSchema,
  }),
});

export type RealtimeSessionResponse = z.infer<
  typeof RealtimeSessionResponseSchema
>;

/**
 * Upper bound for an ElevenLabs realtime conversation ID accepted by the
 * bind endpoint. Real ElevenLabs IDs (`conv_…`) are far shorter; the bound
 * keeps the deterministic webhook `clientRequestId` (`realtime:<id>:<index>`)
 * safely inside the 128-character `ConversationTurn.clientRequestId` column.
 */
export const MAX_REALTIME_CONVERSATION_ID_LENGTH = 64;

const RealtimeConversationIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REALTIME_CONVERSATION_ID_LENGTH);

/**
 * Request for `POST /api/v1/attempts/:attemptId/realtime-conversation`.
 *
 * Binds the ElevenLabs `conversationId` returned by a successful
 * `startSession()` to the authenticated attempt so the post-call
 * transcription webhook can resolve the attempt server-side. The attempt is
 * identified by the authenticated user and the path parameter only — the
 * browser never supplies user, scenario, variation, or difficulty.
 */
export const BindRealtimeConversationRequestSchema = z.strictObject({
  conversationId: RealtimeConversationIdSchema,
});

export const BindRealtimeConversationResponseSchema = z.strictObject({
  data: z.strictObject({
    attemptId: ResourceIdSchema,
    conversationId: RealtimeConversationIdSchema,
  }),
});

export type BindRealtimeConversationRequest = z.infer<
  typeof BindRealtimeConversationRequestSchema
>;
export type BindRealtimeConversationResponse = z.infer<
  typeof BindRealtimeConversationResponseSchema
>;

/**
 * Request for `POST /api/v1/attempts/:attemptId/realtime-transcript`.
 *
 * Submits the browser's live transcript as conversation turns before
 * finishing. Each entry pairs one learner utterance with the following
 * agent response (null when the agent did not reply).
 */
export const SubmitRealtimeTranscriptTurnSchema = z.strictObject({
  userText: z.string().trim().min(1),
  assistantText: z.string().trim().min(1).nullable(),
});

export const SubmitRealtimeTranscriptRequestSchema = z.strictObject({
  /** Must already be owner-bound to the attempt by the realtime SDK flow. */
  conversationId: RealtimeConversationIdSchema,
  turns: z.array(SubmitRealtimeTranscriptTurnSchema).max(100),
});

export type SubmitRealtimeTranscriptRequest = z.infer<
  typeof SubmitRealtimeTranscriptRequestSchema
>;
