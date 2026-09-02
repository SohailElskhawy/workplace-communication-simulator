import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS,
  isNonverbalNoise,
  normalizeElevenLabsTranscript,
  verifyElevenLabsWebhookSignature,
} from "./elevenlabs-webhook.js";

const secret = "elevenlabs-webhook-secret";
const currentTime = new Date("2026-08-31T10:00:00.000Z");
const timestamp = Math.floor(currentTime.getTime() / 1_000);
const rawBody = Buffer.from('{"type":"post_call_transcription"}');

function signature(value = timestamp, body = rawBody): string {
  return `t=${value},v0=${createHmac("sha256", secret)
    .update(`${value}.`)
    .update(body)
    .digest("hex")}`;
}

describe("verifyElevenLabsWebhookSignature", () => {
  it("accepts a current HMAC over the exact raw body", () => {
    expect(
      verifyElevenLabsWebhookSignature({
        currentTime,
        rawBody,
        secret,
        signatureHeader: signature(),
      }),
    ).toBe(true);
  });

  it("rejects invalid HMAC values with a timing-safe comparison", () => {
    expect(
      verifyElevenLabsWebhookSignature({
        currentTime,
        rawBody,
        secret,
        signatureHeader: `t=${timestamp},v0=${"0".repeat(64)}`,
      }),
    ).toBe(false);
  });

  it("rejects stale timestamps", () => {
    const stale = timestamp - ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS - 1;
    expect(
      verifyElevenLabsWebhookSignature({
        currentTime,
        rawBody,
        secret,
        signatureHeader: signature(stale),
      }),
    ).toBe(false);
  });
});

describe("isNonverbalNoise", () => {
  it("identifies pure nonverbal sounds and noise annotations as noise", () => {
    expect(isNonverbalNoise("*coughs*")).toBe(true);
    expect(isNonverbalNoise("[throat clearing]")).toBe(true);
    expect(isNonverbalNoise("(clears throat)")).toBe(true);
    expect(isNonverbalNoise("*sigh*")).toBe(true);
    expect(isNonverbalNoise("[laughter]")).toBe(true);
    expect(isNonverbalNoise("[gasp]")).toBe(true);
    expect(isNonverbalNoise("*snort*")).toBe(true);
    expect(isNonverbalNoise("...")).toBe(true);
    expect(isNonverbalNoise("   ")).toBe(true);
    expect(isNonverbalNoise("*cough* *cough*")).toBe(true);
  });

  it("preserves real speech, hesitation fillers, and intentional interruptions", () => {
    expect(isNonverbalNoise("Um, uh, well, I think we should talk.")).toBe(false);
    expect(isNonverbalNoise("Wait, hold on a second.")).toBe(false);
    expect(isNonverbalNoise("Uh-huh")).toBe(false);
    expect(isNonverbalNoise("No, that won't work.")).toBe(false);
    expect(isNonverbalNoise("*coughs* Excuse me, I want to clarify.")).toBe(false);
  });
});

describe("normalizeElevenLabsTranscript", () => {
  it("returns empty array for empty transcript", () => {
    expect(normalizeElevenLabsTranscript("conv_1", [])).toEqual([]);
  });

  it("groups consecutive same-role utterances and pairs cleanly", () => {
    const transcript = [
      { role: "agent" as const, message: "Opening message" },
      { role: "user" as const, message: "Part 1 of speech." },
      { role: "user" as const, message: "Part 2 of speech." },
      { role: "agent" as const, message: "Agent response 1." },
      { role: "agent" as const, message: "Agent response 2." },
    ];

    expect(normalizeElevenLabsTranscript("conv_1", transcript)).toEqual([
      {
        clientRequestId: "realtime:conv_1:1",
        userText: "Part 1 of speech. Part 2 of speech.",
        assistantText: "Agent response 1. Agent response 2.",
        status: "COMPLETED",
      },
    ]);
  });

  it("suppresses isolated nonverbal turns while keeping speech turns", () => {
    const transcript = [
      { role: "agent" as const, message: "Opening message" },
      { role: "user" as const, message: "*coughs*" },
      { role: "agent" as const, message: "Opening message continuation." },
      { role: "user" as const, message: "I'd like to discuss the project." },
      { role: "agent" as const, message: "Sure, let's discuss it." },
      { role: "user" as const, message: "[throat clearing]" },
    ];

    expect(normalizeElevenLabsTranscript("conv_1", transcript)).toEqual([
      {
        clientRequestId: "realtime:conv_1:3",
        userText: "I'd like to discuss the project.",
        assistantText: "Sure, let's discuss it.",
        status: "COMPLETED",
      },
    ]);
  });

  it("handles unmatched final user utterance as FAILED", () => {
    const transcript = [
      { role: "agent" as const, message: "Opening message" },
      { role: "user" as const, message: "Final user words" },
    ];

    expect(normalizeElevenLabsTranscript("conv_1", transcript)).toEqual([
      {
        clientRequestId: "realtime:conv_1:1",
        userText: "Final user words",
        assistantText: null,
        status: "FAILED",
      },
    ]);
  });
});
