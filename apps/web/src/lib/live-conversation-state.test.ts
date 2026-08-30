import { describe, expect, it } from "vitest";

import {
  isLiveConversationActive,
  resolveLiveConversationUiState,
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
