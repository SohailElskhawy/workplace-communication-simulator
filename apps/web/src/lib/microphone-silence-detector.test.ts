import { describe, expect, it } from "vitest";

import {
  MicrophoneSilenceDetector,
  SILENCE_AUTO_STOP_MS,
  SPEECH_LEVEL_THRESHOLD,
} from "./microphone-silence-detector";

const SILENCE_LEVEL = SPEECH_LEVEL_THRESHOLD / 2;
const SPEECH_LEVEL = SPEECH_LEVEL_THRESHOLD + 0.01;

describe("MicrophoneSilenceDetector", () => {
  it("does not stop for initial silence before speech is detected", () => {
    const detector = new MicrophoneSilenceDetector();

    expect(detector.observe(SILENCE_LEVEL, 0)).toBe(false);
    expect(detector.observe(SILENCE_LEVEL, SILENCE_AUTO_STOP_MS * 2)).toBe(
      false,
    );
  });

  it("stops after detected speech is followed by sustained silence", () => {
    const detector = new MicrophoneSilenceDetector();

    expect(detector.observe(SPEECH_LEVEL, 0)).toBe(false);
    expect(detector.observe(SILENCE_LEVEL, 100)).toBe(false);
    expect(
      detector.observe(SILENCE_LEVEL, 100 + SILENCE_AUTO_STOP_MS - 1),
    ).toBe(false);
    expect(detector.observe(SILENCE_LEVEL, 100 + SILENCE_AUTO_STOP_MS)).toBe(
      true,
    );
  });

  it("does not stop for a brief pause when speech resumes", () => {
    const detector = new MicrophoneSilenceDetector();

    detector.observe(SPEECH_LEVEL, 0);
    expect(detector.observe(SILENCE_LEVEL, 100)).toBe(false);
    expect(detector.observe(SPEECH_LEVEL, 100 + SILENCE_AUTO_STOP_MS - 1)).toBe(
      false,
    );
    expect(detector.observe(SILENCE_LEVEL, 100 + SILENCE_AUTO_STOP_MS)).toBe(
      false,
    );
  });

  it("resets speech and silence state between recordings", () => {
    const detector = new MicrophoneSilenceDetector();

    detector.observe(SPEECH_LEVEL, 0);
    detector.observe(SILENCE_LEVEL, 100);
    detector.reset();

    expect(detector.observe(SILENCE_LEVEL, 100 + SILENCE_AUTO_STOP_MS)).toBe(
      false,
    );
  });

  it("does not trigger a late stop after cleanup or cancellation", () => {
    const detector = new MicrophoneSilenceDetector();

    detector.observe(SPEECH_LEVEL, 0);
    detector.observe(SILENCE_LEVEL, 100);
    detector.reset();

    expect(
      detector.observe(SILENCE_LEVEL, 100 + SILENCE_AUTO_STOP_MS * 2),
    ).toBe(false);
  });
});
