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
