import { describe, expect, it } from "vitest";

import {
  appendLiveTranscriptEntry,
  isLiveConversationActive,
  LIVE_TRANSCRIPT_MAX_ENTRIES,
  resolveLiveConversationUiState,
  type LiveTranscriptEntry,
} from "./live-conversation-state.js";

describe("resolveLiveConversationUiState", () => {
  it("reports disconnected before a session starts", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "disconnected",
        sdkMode: "listening",
        awaitingConnection: false,
      }),
    ).toBe("disconnected");
  });

  it("reports connecting while the start request is in flight", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "disconnected",
        sdkMode: "listening",
        awaitingConnection: true,
      }),
    ).toBe("connecting");
  });

  it("keeps showing connecting over a stale SDK error until it settles", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "error",
        sdkMode: "listening",
        awaitingConnection: true,
      }),
    ).toBe("connecting");
  });

  it("reports connecting from the SDK status", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "connecting",
        sdkMode: "listening",
        awaitingConnection: false,
      }),
    ).toBe("connecting");
  });

  it("maps connected + listening mode to listening", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "connected",
        sdkMode: "listening",
        awaitingConnection: false,
      }),
    ).toBe("listening");
  });

  it("maps connected + speaking mode to speaking", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "connected",
        sdkMode: "speaking",
        awaitingConnection: false,
      }),
    ).toBe("speaking");
  });

  it("reports error from the SDK status", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "error",
        sdkMode: "listening",
        awaitingConnection: false,
      }),
    ).toBe("error");
  });

  it("reports disconnected after a clean end", () => {
    expect(
      resolveLiveConversationUiState({
        sdkStatus: "disconnected",
        sdkMode: "listening",
        awaitingConnection: false,
      }),
    ).toBe("disconnected");
  });
});

describe("isLiveConversationActive", () => {
  it.each([
    ["disconnected", false],
    ["connecting", true],
    ["listening", true],
    ["speaking", true],
    ["error", false],
  ] as const)("treats %s as active=%s", (state, expected) => {
    expect(isLiveConversationActive(state)).toBe(expected);
  });
});

describe("appendLiveTranscriptEntry", () => {
  it("appends finalized user and agent messages in order", () => {
    let transcript = appendLiveTranscriptEntry([], {
      source: "user",
      message: "  I'd like to discuss the offer.  ",
      event_id: 1,
    });
    transcript = appendLiveTranscriptEntry(transcript, {
      source: "ai",
      message: "Happy to walk through it.",
      event_id: 2,
    });

    expect(transcript).toEqual([
      { id: "user:1", role: "user", text: "I'd like to discuss the offer." },
      { id: "agent:2", role: "agent", text: "Happy to walk through it." },
    ]);
  });

  it("ignores empty or whitespace-only messages", () => {
    const transcript = appendLiveTranscriptEntry([], {
      source: "user",
      message: "   ",
      event_id: 1,
    });
    expect(transcript).toEqual([]);
  });

  it("dedupes a redelivered event by role and event id", () => {
    const first = appendLiveTranscriptEntry([], {
      source: "user",
      message: "Same utterance",
      event_id: 7,
    });
    const second = appendLiveTranscriptEntry(first, {
      source: "user",
      message: "Same utterance",
      event_id: 7,
    });
    expect(second).toEqual(first);
  });

  it("keeps identical event ids across different roles", () => {
    let transcript = appendLiveTranscriptEntry([], {
      source: "user",
      message: "Hello",
      event_id: 1,
    });
    transcript = appendLiveTranscriptEntry(transcript, {
      source: "ai",
      message: "Hi there",
      event_id: 1,
    });
    expect(transcript.map((entry) => entry.role)).toEqual(["user", "agent"]);
  });

  it("drops a same-role repeat of the previous text when no event id exists", () => {
    const first = appendLiveTranscriptEntry([], {
      source: "ai",
      message: "Repeated line",
    });
    const second = appendLiveTranscriptEntry(first, {
      source: "ai",
      message: "Repeated line",
    });
    expect(second).toEqual(first);
  });

  it("keeps alternating same texts from different roles", () => {
    let transcript = appendLiveTranscriptEntry([], {
      source: "user",
      message: "Yes",
    });
    transcript = appendLiveTranscriptEntry(transcript, {
      source: "ai",
      message: "Yes",
    });
    expect(transcript).toHaveLength(2);
  });

  it("caps the transcript at the maximum entry count, dropping oldest", () => {
    let transcript: LiveTranscriptEntry[] = [];
    for (let index = 0; index < LIVE_TRANSCRIPT_MAX_ENTRIES + 5; index += 1) {
      transcript = appendLiveTranscriptEntry(transcript, {
        source: "user",
        message: `Message ${index}`,
        event_id: index,
      });
    }
    expect(transcript).toHaveLength(LIVE_TRANSCRIPT_MAX_ENTRIES);
    expect(transcript[0]?.text).toBe("Message 5");
    expect(transcript.at(-1)?.text).toBe(
      `Message ${LIVE_TRANSCRIPT_MAX_ENTRIES + 4}`,
    );
  });
});
