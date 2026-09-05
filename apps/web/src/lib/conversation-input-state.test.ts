import { describe, expect, it } from "vitest";

import { isConversationInputDisabled } from "./conversation-input-state";

describe("isConversationInputDisabled", () => {
  const availableTurn = {
    finishing: false,
    isExpired: false,
    isLimitReached: false,
    sendingTurn: false,
  };

  it("keeps learner input available while counterpart audio loads or plays", () => {
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "loading",
      }),
    ).toBe(false);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        counterpartSpeechStatus: "playing",
      }),
    ).toBe(false);
  });

  it("keeps learner input available after playback ends or fails", () => {
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

  it("disables learner input only for terminal or in-flight turn states", () => {
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        sendingTurn: true,
        counterpartSpeechStatus: "idle",
      }),
    ).toBe(true);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        finishing: true,
        counterpartSpeechStatus: "playing",
      }),
    ).toBe(true);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        isExpired: true,
        counterpartSpeechStatus: "idle",
      }),
    ).toBe(true);
    expect(
      isConversationInputDisabled({
        ...availableTurn,
        isLimitReached: true,
        counterpartSpeechStatus: "idle",
      }),
    ).toBe(true);
  });
});
