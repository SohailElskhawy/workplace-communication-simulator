import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS,
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
