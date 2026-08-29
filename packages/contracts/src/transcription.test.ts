import { describe, expect, it } from "vitest";

import {
  TranscriptionDataSchema,
  TranscriptionResponseSchema,
} from "./transcription.js";

describe("Transcription contracts", () => {
  it("validates a valid transcription response", () => {
    const payload = {
      data: {
        transcript: "I would like to discuss my salary expectations.",
      },
    };

    const parsed = TranscriptionResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.transcript).toBe(
        "I would like to discuss my salary expectations.",
      );
    }
  });

  it("validates empty transcript string", () => {
    const payload = {
      transcript: "",
    };

    const parsed = TranscriptionDataSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transcript).toBe("");
    }
  });

  it("rejects extra fields in strict schema", () => {
    const payload = {
      data: {
        transcript: "Hello",
        extraField: 123,
      },
    };

    const parsed = TranscriptionResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects non-string transcript", () => {
    const payload = {
      data: {
        transcript: null,
      },
    };

    const parsed = TranscriptionResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});
