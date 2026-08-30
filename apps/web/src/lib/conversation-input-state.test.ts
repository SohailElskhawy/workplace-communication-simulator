import { describe, expect, it } from "vitest";

import { isConversationInputDisabled } from "./conversation-input-state";

describe("isConversationInputDisabled", () => {
  const availableTurn = {
    finishing: false,
    isExpired: false,
    isLimitReached: false,
    sendingTurn: false,
  };

  it("keeps learner input disabled while the counterpart TTS is loading or playing", () => {
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "loading",
      }),
    ).toBe(true);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "playing",
      }),
    ).toBe(true);
  });

  it("returns control to the learner after playback ends or fails", () => {
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "idle",
      }),
    ).toBe(false);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "error",
      }),
    ).toBe(false);
  });
});
