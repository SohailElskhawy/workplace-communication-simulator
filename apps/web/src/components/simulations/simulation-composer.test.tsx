// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SimulationComposer,
  type SimulationComposerProps,
} from "./simulation-composer";

// Mock Clerk useAuth
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-clerk-token"),
  }),
}));

// Mock usePrefersReducedMotion
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => false,
}));

interface VoiceRecorderCallbacks {
  onTranscriptReady: (transcript: string) => void;
  onTranscribeAudio: (
    audioBlob: Blob,
    durationMs: number,
  ) => Promise<{ transcript: string }>;
}

let capturedVoiceRecorderCallbacks: VoiceRecorderCallbacks | null = null;
const mockStartRecording = vi.fn().mockResolvedValue(undefined);
const mockStopAndTranscribe = vi.fn().mockResolvedValue(undefined);
const mockCancelRecording = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/hooks/use-voice-recorder", () => ({
  MAX_RECORDING_DURATION_SECONDS: 120,
  useVoiceRecorder: vi.fn((callbacks: VoiceRecorderCallbacks) => {
    capturedVoiceRecorderCallbacks = callbacks;
    return {
      status: "idle",
      durationSeconds: 0,
      microphoneLevel: 0,
      errorMessage: null,
      isSupported: true,
      startRecording: mockStartRecording,
      stopAndTranscribe: mockStopAndTranscribe,
      cancelRecording: mockCancelRecording,
      clearError: mockClearError,
    };
  }),
}));

function createProps(
  overrides: Partial<SimulationComposerProps> = {},
): SimulationComposerProps {
  const textareaRef = overrides.textareaRef ?? createRef<HTMLTextAreaElement>();
  return {
    attemptId: "attempt-123",
    composerText: "",
    sendingTurn: false,
    isComposerDisabled: false,
    isExpired: false,
    isLimitReached: false,
    turnCount: 1,
    generalError: null,
    textareaRef,
    inputMode: "TEXT",
    onInputModeChange: vi.fn(),
    hasVoiceDraft: false,
    microphoneLevel: 0,
    onChangeText: vi.fn(),
    onSendTurn: vi.fn(),
    onVoiceStatusChange: vi.fn(),
    onVoiceTranscriptReady: vi.fn(),
    onMicrophoneLevelChange: vi.fn(),
    ...overrides,
  };
}

describe("SimulationComposer", () => {
  beforeEach(() => {
    localStorage.clear();
    capturedVoiceRecorderCallbacks = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Enter and Shift+Enter keyboard shortcuts", () => {
    it("submits the turn when Enter is pressed with text and shiftKey is false", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        composerText: "Hello counterpart, let us talk.",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });

      const enterEvent = fireEvent.keyDown(textarea, {
        key: "Enter",
        shiftKey: false,
      });

      // Default should be prevented for unshifted Enter submission
      expect(enterEvent).toBe(false);
      expect(onSendTurn).toHaveBeenCalledTimes(1);
    });

    it("submits the turn via Enter in voice review draft mode", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Here is my voice draft for review.",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /review and edit your response before sending/i,
      });

      const enterEvent = fireEvent.keyDown(textarea, {
        key: "Enter",
        shiftKey: false,
      });

      expect(enterEvent).toBe(false);
      expect(onSendTurn).toHaveBeenCalledTimes(1);
    });

    it("does not submit when composerText is empty or whitespace-only", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        composerText: "   ",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });

      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("does not submit when isComposerDisabled is true", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        composerText: "Valid text",
        isComposerDisabled: true,
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });

      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("does not submit and preserves multiline input when Shift+Enter is pressed", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        composerText: "First line of text",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });

      // When shiftKey is true, the event default must not be prevented so textarea inserts newline
      const notPrevented = fireEvent.keyDown(textarea, {
        key: "Enter",
        shiftKey: true,
      });

      expect(notPrevented).toBe(true);
      expect(onSendTurn).not.toHaveBeenCalled();
    });
  });

  describe("Textarea auto-focus on voice draft arrival", () => {
    it("auto-focuses textarea and moves cursor to the end on mount when hasVoiceDraft is true", () => {
      const textareaRef = createRef<HTMLTextAreaElement>();
      const composerText = "Transcript text ready for review";
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = textareaRef.current;
      expect(textarea).not.toBeNull();
      expect(document.activeElement).toBe(textarea);
      expect(textarea?.selectionStart).toBe(composerText.length);
      expect(textarea?.selectionEnd).toBe(composerText.length);
    });

    it("auto-focuses textarea and places cursor at the end when hasVoiceDraft transitions to true", () => {
      const textareaRef = createRef<HTMLTextAreaElement>();
      const initialProps = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
        composerText: "",
        textareaRef,
      });

      const { rerender } = render(<SimulationComposer {...initialProps} />);
      expect(document.activeElement).not.toBe(textareaRef.current);

      const draftText = "Transcribed speech arrived";
      rerender(
        <SimulationComposer
          {...initialProps}
          hasVoiceDraft={true}
          composerText={draftText}
        />,
      );

      const textarea = textareaRef.current;
      expect(textarea).not.toBeNull();
      expect(document.activeElement).toBe(textarea);
      expect(textarea?.selectionStart).toBe(draftText.length);
      expect(textarea?.selectionEnd).toBe(draftText.length);
    });
  });

  describe("Global Enter key listener", () => {
    it("invokes onSendTurn when hasVoiceDraft is true and Enter is pressed globally", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Draft ready to send",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(onSendTurn).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("ignores global Enter when hasVoiceDraft is false", () => {
      const onSendTurn = vi.fn();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
        composerText: "",
        onSendTurn,
      });

      render(<SimulationComposer {...props} />);

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("ignores global Enter when a dialog is open in the DOM", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Draft ready to send",
        onSendTurn,
        textareaRef,
      });

      render(
        <div>
          <SimulationComposer {...props} />
          <div role="dialog" aria-modal="true">
            <h2>Finish Rehearsal Confirmation</h2>
            <button type="button">Cancel</button>
          </div>
        </div>,
      );

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("ignores global Enter when another editable input is focused", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Draft ready to send",
        onSendTurn,
        textareaRef,
      });

      render(
        <div>
          <input data-testid="other-input" type="text" />
          <SimulationComposer {...props} />
        </div>,
      );

      const otherInput = screen.getByTestId("other-input");
      otherInput.focus();
      expect(document.activeElement).toBe(otherInput);

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("ignores global Enter when shiftKey is true", () => {
      const onSendTurn = vi.fn();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Draft text",
        onSendTurn,
      });

      render(<SimulationComposer {...props} />);

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("ignores global Enter when composer is disabled", () => {
      const onSendTurn = vi.fn();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        isComposerDisabled: true,
        composerText: "Draft text",
        onSendTurn,
      });

      render(<SimulationComposer {...props} />);

      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(onSendTurn).not.toHaveBeenCalled();
    });

    it("deduplicates Enter key so onSendTurn is called only once when textarea handles Enter", () => {
      const onSendTurn = vi.fn();
      const textareaRef = createRef<HTMLTextAreaElement>();
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: true,
        composerText: "Draft text",
        onSendTurn,
        textareaRef,
      });

      render(<SimulationComposer {...props} />);

      const textarea = textareaRef.current!;
      // Textarea handleKeyDown is invoked
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      // Native bubble to window right after
      const globalEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(globalEvent);

      expect(onSendTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Review before sending toggle and localStorage persistence", () => {
    it("defaults to reviewBeforeSend: true when localStorage is empty", () => {
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
      });

      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("true");
      expect(
        screen.getByText(/Hold Space to talk, release to review/i),
      ).toBeDefined();
    });

    it("switches state and writes to localStorage when clicked", () => {
      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
      });

      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("true");

      // First click: turn OFF review before sending (auto-send on release)
      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-checked")).toBe("false");
      expect(
        localStorage.getItem("kalemny_voice_review_before_send"),
      ).toBe("false");
      expect(
        screen.getByText(/Hold Space to talk, release to send/i),
      ).toBeDefined();

      // Second click: turn ON review before sending
      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-checked")).toBe("true");
      expect(
        localStorage.getItem("kalemny_voice_review_before_send"),
      ).toBe("true");
      expect(
        screen.getByText(/Hold Space to talk, release to review/i),
      ).toBeDefined();
    });

    it("initializes reviewBeforeSend from localStorage when set to 'false'", async () => {
      localStorage.setItem("kalemny_voice_review_before_send", "false");

      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
      });

      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      await waitFor(() => {
        expect(toggle.getAttribute("aria-checked")).toBe("false");
      });
      expect(
        screen.getByText(/Hold Space to talk, release to send/i),
      ).toBeDefined();
    });

    it("directly sends turn on transcript arrival when reviewBeforeSend is false", async () => {
      const onSendTurn = vi.fn();
      const onVoiceTranscriptReady = vi.fn();
      const onChangeText = vi.fn();

      localStorage.setItem("kalemny_voice_review_before_send", "false");

      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
        onSendTurn,
        onVoiceTranscriptReady,
        onChangeText,
      });

      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      await waitFor(() => {
        expect(toggle.getAttribute("aria-checked")).toBe("false");
      });

      expect(capturedVoiceRecorderCallbacks).not.toBeNull();
      capturedVoiceRecorderCallbacks!.onTranscriptReady(
        "Auto-sent voice message",
      );

      expect(onSendTurn).toHaveBeenCalledWith(
        "Auto-sent voice message",
        "VOICE",
      );
      expect(onVoiceTranscriptReady).not.toHaveBeenCalled();
      expect(onChangeText).not.toHaveBeenCalled();
    });

    it("stages transcript for review on transcript arrival when reviewBeforeSend is true", () => {
      const onSendTurn = vi.fn();
      const onVoiceTranscriptReady = vi.fn();
      const onChangeText = vi.fn();

      const props = createProps({
        inputMode: "VOICE",
        hasVoiceDraft: false,
        composerText: "",
        onSendTurn,
        onVoiceTranscriptReady,
        onChangeText,
      });

      render(<SimulationComposer {...props} />);

      expect(capturedVoiceRecorderCallbacks).not.toBeNull();
      capturedVoiceRecorderCallbacks!.onTranscriptReady(
        "Reviewable voice message",
      );

      expect(onSendTurn).not.toHaveBeenCalled();
      expect(onVoiceTranscriptReady).toHaveBeenCalledTimes(1);
      expect(onChangeText).toHaveBeenCalledWith("Reviewable voice message");
    });
  });
});
