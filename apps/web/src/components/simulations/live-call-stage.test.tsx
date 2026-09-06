// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LiveCallUiState } from "@/hooks/use-continuous-live-call";
import {
  LiveCallStage,
  type LiveCallStageProps,
} from "./live-call-stage";

// Mock the useContinuousLiveCall hook
const mockStartCall = vi.fn();
const mockToggleMute = vi.fn();
const mockInterruptAi = vi.fn();
const mockEndCall = vi.fn();

let mockHookReturn: {
  callState: LiveCallUiState;
  microphoneLevel: number;
  isMuted: boolean;
  isConnected: boolean;
  interruptionCount: number;
  startCall: typeof mockStartCall;
  toggleMute: typeof mockToggleMute;
  interruptAi: typeof mockInterruptAi;
  endCall: typeof mockEndCall;
} = {
  callState: "CONNECTING",
  microphoneLevel: 0.2,
  isMuted: false,
  isConnected: false,
  interruptionCount: 0,
  startCall: mockStartCall,
  toggleMute: mockToggleMute,
  interruptAi: mockInterruptAi,
  endCall: mockEndCall,
};

vi.mock("@/hooks/use-continuous-live-call", () => ({
  useContinuousLiveCall: () => mockHookReturn,
}));

describe("LiveCallStage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultProps: LiveCallStageProps = {
    attemptId: "att-123",
    counterpartRole: "Engineering Director",
    language: "en",
    latestMessage: null,
    turnCount: 0,
    hasOpeningMessage: true,
    onFinish: vi.fn(),
    onOpenTranscript: vi.fn(),
    onTranscribeAudio: vi.fn(),
    onSendTurn: vi.fn(),
    onRequestAudioStream: vi.fn(),
  };

  it("renders the lobby screen when not connected", () => {
    mockHookReturn = {
      ...mockHookReturn,
      isConnected: false,
    };

    render(<LiveCallStage {...defaultProps} />);

    expect(
      screen.getByRole("heading", {
        name: /ready to talk with engineering director\?/i,
      }),
    ).toBeDefined();

    const startBtn = screen.getByRole("button", {
      name: /start live call/i,
    });
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    expect(mockStartCall).toHaveBeenCalledTimes(1);
  });

  it("renders Arabic RTL lobby when language is ar", () => {
    mockHookReturn = {
      ...mockHookReturn,
      isConnected: false,
    };

    render(<LiveCallStage {...defaultProps} language="ar" />);

    expect(
      screen.getByRole("heading", {
        name: /جاهز للمكالمة مع Engineering Director؟/i,
      }),
    ).toBeDefined();

    const startBtn = screen.getByRole("button", {
      name: /بدء المكالمة الآن/i,
    });
    expect(startBtn).toBeDefined();
  });

  it("renders the active call screen when connected", () => {
    mockHookReturn = {
      ...mockHookReturn,
      isConnected: true,
      callState: "AI_SPEAKING",
      isMuted: false,
      interruptionCount: 1,
    };

    render(
      <LiveCallStage
        {...defaultProps}
        latestMessage={{
          role: "assistant",
          text: "We appreciate your hard work this sprint.",
        }}
      />,
    );

    // Call state label
    expect(screen.getByText(/AI Speaking — You can interrupt/i)).toBeDefined();

    // Latest message subtitle
    expect(
      screen.getByText("We appreciate your hard work this sprint."),
    ).toBeDefined();

    // Mute button
    const muteBtn = screen.getByRole("button", { name: /mute/i });
    expect(muteBtn).toBeDefined();
    fireEvent.click(muteBtn);
    expect(mockToggleMute).toHaveBeenCalledTimes(1);

    // Interrupt button
    const interruptBtn = screen.getByRole("button", { name: /interrupt/i });
    expect(interruptBtn).toBeDefined();
    fireEvent.click(interruptBtn);
    expect(mockInterruptAi).toHaveBeenCalledTimes(1);

    // Transcript button
    const transcriptBtn = screen.getByRole("button", {
      name: /transcript/i,
    });
    expect(transcriptBtn).toBeDefined();
    fireEvent.click(transcriptBtn);
    expect(defaultProps.onOpenTranscript).toHaveBeenCalledTimes(1);

    // End call button
    const endCallBtn = screen.getByRole("button", { name: /end call/i });
    expect(endCallBtn).toBeDefined();
    fireEvent.click(endCallBtn);
    expect(mockEndCall).toHaveBeenCalledTimes(1);
    expect(defaultProps.onFinish).toHaveBeenCalledTimes(1);
  });
});
