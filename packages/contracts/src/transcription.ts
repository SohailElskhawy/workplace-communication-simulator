import { z } from "zod";

export const TranscriptionDataSchema = z.strictObject({
  transcript: z.string(),
});

export const TranscriptionResponseSchema = z.strictObject({
  data: TranscriptionDataSchema,
});

export type TranscriptionData = z.infer<typeof TranscriptionDataSchema>;
export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;
