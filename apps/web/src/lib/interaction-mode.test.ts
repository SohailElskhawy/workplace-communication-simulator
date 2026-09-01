import { describe, expect, it } from "vitest";

import { resolveEffectiveInteractionMode } from "./interaction-mode";

describe("resolveEffectiveInteractionMode", () => {
  it("keeps push-to-talk attempts on push-to-talk regardless of the flag", () => {
    expect(
      resolveEffectiveInteractionMode({
        persistedMode: "PUSH_TO_TALK",
        realtimeVoiceEnabled: false,
      }),
    ).toBe("PUSH_TO_TALK");
    expect(
      resolveEffectiveInteractionMode({
        persistedMode: "PUSH_TO_TALK",
        realtimeVoiceEnabled: true,
      }),
    ).toBe("PUSH_TO_TALK");
  });

  it("keeps realtime attempts on realtime when the flag is enabled", () => {
    expect(
      resolveEffectiveInteractionMode({
        persistedMode: "REALTIME",
        realtimeVoiceEnabled: true,
      }),
    ).toBe("REALTIME");
  });

  it("falls back to push-to-talk when realtime is disabled in the build", () => {
    expect(
      resolveEffectiveInteractionMode({
        persistedMode: "REALTIME",
        realtimeVoiceEnabled: false,
      }),
    ).toBe("PUSH_TO_TALK");
  });
});
