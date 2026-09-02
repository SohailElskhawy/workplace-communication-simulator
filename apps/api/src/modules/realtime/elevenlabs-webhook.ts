import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS = 30 * 60;

const SignatureSchema = z.string().regex(/^[a-f0-9]{64}$/i);

const WebhookSignatureHeaderSchema = z
  .string()
  .min(1)
  .transform((header, context) => {
    const parts = new Map<string, string>();
    for (const part of header.split(",")) {
      const separator = part.indexOf("=");
      if (separator <= 0) continue;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (parts.has(key)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate signature field",
        });
        return z.NEVER;
      }
      parts.set(key, value);
    }
    const timestamp = parts.get("t");
    const signature = parts.get("v0");
    if (!timestamp || !/^[0-9]+$/.test(timestamp) || !signature) {
      context.addIssue({ code: "custom", message: "Invalid signature header" });
      return z.NEVER;
    }
    const parsedSignature = SignatureSchema.safeParse(signature);
    if (!parsedSignature.success) {
      context.addIssue({ code: "custom", message: "Invalid signature" });
      return z.NEVER;
    }
    return { timestamp: Number(timestamp), signature: parsedSignature.data };
  });

export interface VerifyElevenLabsWebhookSignatureInput {
  currentTime: Date;
  rawBody: Buffer;
  secret: string;
  signatureHeader: string | undefined;
}

export function verifyElevenLabsWebhookSignature({
  currentTime,
  rawBody,
  secret,
  signatureHeader,
}: VerifyElevenLabsWebhookSignatureInput): boolean {
  const parsed = WebhookSignatureHeaderSchema.safeParse(signatureHeader);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.timestamp))
    return false;
  if (
    Math.abs(
      Math.floor(currentTime.getTime() / 1_000) - parsed.data.timestamp,
    ) > ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS
  ) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(`${parsed.data.timestamp}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(parsed.data.signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(expected, received)
  );
}

const TranscriptEntrySchema = z
  .object({
    role: z.enum(["agent", "user"]),
    message: z.string().nullable().optional(),
    tool_calls: z.unknown().nullable().optional(),
    tool_results: z.unknown().nullable().optional(),
  })
  .passthrough();

export const ElevenLabsPostCallTranscriptionSchema = z
  .object({
    type: z.literal("post_call_transcription"),
    event_timestamp: z.union([z.number(), z.string()]),
    data: z
      .object({
        agent_id: z.string().trim().min(1).max(128),
        conversation_id: z.string().trim().min(1).max(64),
        transcript: z.array(TranscriptEntrySchema).max(1_000),
      })
      .passthrough(),
  })
  .passthrough();

export type ElevenLabsPostCallTranscription = z.infer<
  typeof ElevenLabsPostCallTranscriptionSchema
>;

export interface NormalizedRealtimeTranscriptTurn {
  clientRequestId: string;
  assistantText: string | null;
  status: "COMPLETED" | "FAILED";
  userText: string;
}

const NONVERBAL_NOISE_TOKENS = [
  "cough",
  "coughs",
  "coughing",
  "throat clearing",
  "clears throat",
  "cleared throat",
  "throat clear",
  "sigh",
  "sighs",
  "sighing",
  "sneeze",
  "sneezes",
  "sneezing",
  "snort",
  "snorts",
  "sniffle",
  "sniffles",
  "laughter",
  "laughing",
  "chuckle",
  "chuckles",
  "gasp",
  "gasps",
  "applause",
  "music",
  "noise",
  "silence",
  "inaudible",
  "groan",
  "groans",
  "yawn",
  "yawns",
  "breath",
  "breathing",
  "heavy breathing",
];

const NONVERBAL_REGEX = new RegExp(
  `(?:\\[|\\(|\\*)(?:${NONVERBAL_NOISE_TOKENS.map((t) => t.replace(/\s+/g, "\\s+")).join("|")})(?:\\]|\\)|\\*)`,
  "gi",
);

/**
 * Detects whether an utterance consists entirely of nonverbal sound annotations
 * (e.g. *coughs*, [throat clearing], (sighs), [laughter]) or punctuation/whitespace
 * with no spoken words or communicative fillers.
 */
export function isNonverbalNoise(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Strip nonverbal bracketed/parenthesized/asterisked annotations
  const stripped = trimmed
    .replace(NONVERBAL_REGEX, "")
    .replace(/^[\p{P}\p{S}\s]+$/gu, "")
    .trim();

  // If nothing remains or only punctuation/symbols, it's pure nonverbal noise
  return !stripped || /^[\p{P}\p{S}\s]+$/u.test(stripped);
}

export function normalizeElevenLabsTranscript(
  conversationId: string,
  transcript: ElevenLabsPostCallTranscription["data"]["transcript"],
): NormalizedRealtimeTranscriptTurn[] {
  const spoken = transcript.flatMap((entry, position) => {
    const message = entry.message?.trim() ?? "";
    return message ? [{ role: entry.role, message, position }] : [];
  });
  if (spoken.length === 0) return [];

  const chunks: Array<{
    role: "user" | "agent";
    message: string;
    position: number;
  }> = [];
  for (const entry of spoken) {
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && lastChunk.role === entry.role) {
      lastChunk.message = `${lastChunk.message} ${entry.message}`.trim();
    } else {
      chunks.push({
        role: entry.role,
        message: entry.message,
        position: entry.position,
      });
    }
  }

  if (chunks[0]?.role === "agent") chunks.shift();

  const turns: NormalizedRealtimeTranscriptTurn[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const learner = chunks[index];
    if (!learner || learner.role !== "user") continue;

    // Suppress isolated nonverbal noise
    if (isNonverbalNoise(learner.message)) continue;

    const following = chunks[index + 1];
    const assistantText =
      following?.role === "agent" && !isNonverbalNoise(following.message)
        ? following.message
        : null;
    turns.push({
      clientRequestId: `realtime:${conversationId}:${learner.position}`,
      userText: learner.message,
      assistantText,
      status: assistantText === null ? "FAILED" : "COMPLETED",
    });
    if (following?.role === "agent") index += 1;
  }
  return turns;
}
