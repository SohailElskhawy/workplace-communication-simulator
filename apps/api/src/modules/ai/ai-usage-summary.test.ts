import { describe, expect, it } from "vitest";

import { summarizeAiUsage } from "./ai-usage-summary.js";

describe("summarizeAiUsage", () => {
  it("totals safe cost metadata by operation and attempt", () => {
    expect(
      summarizeAiUsage([
        {
          attemptId: "attempt-1",
          operation: "ROLEPLAY",
          estimatedCost: "0.001",
        },
        {
          attemptId: "attempt-1",
          operation: "EVALUATION",
          estimatedCost: 0.004,
        },
        { attemptId: "attempt-2", operation: "TTS", estimatedCost: null },
      ]),
    ).toEqual({
      byOperation: {
        ROLEPLAY: 0.001,
        EVALUATION: 0.004,
        TRANSCRIPTION: 0,
        TTS: 0,
      },
      byAttempt: { "attempt-1": 0.005, "attempt-2": 0 },
      total: 0.005,
    });
  });
});
