import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "INVALID_ATTEMPT_STATE",
  "SESSION_LIMIT_REACHED",
  "TURN_ALREADY_PENDING",
  "ROLEPLAY_FAILED",
  "EVALUATION_FAILED",
  "TRANSCRIPTION_FAILED",
  "TTS_FAILED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
