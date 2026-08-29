import { describe, expect, it } from "vitest";

import { MAX_RECORDING_DURATION_SECONDS } from "./use-voice-recorder.js";

describe("useVoiceRecorder constants and duration limits", () => {
  it("enforces maximum recording duration limit of 120 seconds", () => {
    expect(MAX_RECORDING_DURATION_SECONDS).toBe(120);
  });
});
