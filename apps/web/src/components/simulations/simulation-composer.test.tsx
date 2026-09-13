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

let mockVoiceRecorderState = {
  status: "idle" as
    | "idle"
    | "requesting_permission"
    | "recording"
    | "transcribing"
    | "error",
  durationSeconds: 0,
  microphoneLevel: 0,
  errorMessage: null as string | null,
  isSupported: true,
  startRecording: mockStartRecording,
  stopAndTranscribe: mockStopAndTranscribe,
  cancelRecording: mockCancelRecording,
  clearError: mockClearError,
};

vi.mock("@/hooks/use-voice-recorder", () => ({
  MAX_RECORDING_DURATION_SECONDS: 120,
  useVoiceRecorder: vi.fn((callbacks: VoiceRecorderCallbacks) => {
    capturedVoiceRecorderCallbacks = callbacks;
    return mockVoiceRecorderState;
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
    language: "en",
    onChangeText: vi.fn(),
    onSendTurn: vi.fn(),
    onVoiceStatusChange: vi.fn(),
    onVoiceTranscriptReady: vi.fn(),
    onMicrophoneLevelChange: vi.fn(),
    isCounterpartSpeaking: false,
    onInterruptAudio: vi.fn(),
    isKeyboardOpen: false,
    ...overrides,
  };
}

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("SimulationComposer", () => {
  beforeEach(() => {
    storageMap.clear();
    capturedVoiceRecorderCallbacks = null;
    mockVoiceRecorderState = {
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Row 1: Text Composer & Warm Coral Tokens", () => {
    it("renders full-width textarea and inline send button with Warm Coral styling", () => {
      const props = createProps({ composerText: "Hello there" });
      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });
      expect(textarea).toBeDefined();
      expect(textarea.getAttribute("placeholder")).toBe("Type your response here…");
      expect(textarea.className).toContain("rounded-control");
      expect(textarea.className).toContain("border-border");
      expect(textarea.className).toContain("bg-background");
      expect(textarea.className).toContain("min-h-[44px]");

      const sendButton = screen.getByRole("button", { name: /send response/i });
      expect(sendButton).toBeDefined();
      expect(sendButton.className).toContain("bg-primary");
      expect(sendButton.className).toContain("text-primary-foreground");
      expect(sendButton.className).toContain("min-h-[44px]");
      expect(sendButton.className).toContain("min-w-[44px]");
    });

    it("allows user to type text and click inline send button", () => {
      const onSendTurn = vi.fn();
      const onChangeText = vi.fn();
      const props = createProps({
        composerText: "Ready to submit",
        onChangeText,
        onSendTurn,
      });
      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });
      fireEvent.change(textarea, { target: { value: "Updated response" } });
      expect(onChangeText).toHaveBeenCalledWith("Updated response");

      const sendButton = screen.getByRole("button", { name: /send response/i });
      fireEvent.click(sendButton);
      expect(onSendTurn).toHaveBeenCalledTimes(1);
    });

    it("disables send button when text is empty", () => {
      const onSendTurn = vi.fn();
      const props = createProps({ composerText: "   ", onSendTurn });
      render(<SimulationComposer {...props} />);

      const sendButton = screen.getByRole("button", { name: /send response/i });
      expect(sendButton.hasAttribute("disabled")).toBe(true);
      fireEvent.click(sendButton);
      expect(onSendTurn).not.toHaveBeenCalled();
    });
  });

  describe("Row 2: Dedicated Microphone Row", () => {
    it("renders dedicated microphone row in idle state with 'Tap to talk'", () => {
      const props = createProps();
      render(<SimulationComposer {...props} />);

      const micRow = screen.getByTestId("dedicated-mic-row");
      expect(micRow).toBeDefined();

      const tapToTalkBtn = screen.getByRole("button", { name: /tap to talk/i });
      expect(tapToTalkBtn).toBeDefined();
      expect(tapToTalkBtn.className).toContain("min-h-[44px]");
      expect(tapToTalkBtn.className).toContain("rounded-full");
      expect(tapToTalkBtn.className).toContain("bg-primary");

      fireEvent.click(tapToTalkBtn);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    it("renders 'Tap to interrupt' when isCounterpartSpeaking is true and invokes onInterruptAudio", () => {
      const onInterruptAudio = vi.fn();
      const props = createProps({
        isCounterpartSpeaking: true,
        onInterruptAudio,
      });
      render(<SimulationComposer {...props} />);

      const interruptBtn = screen.getByRole("button", {
        name: /tap to interrupt/i,
      });
      expect(interruptBtn).toBeDefined();

      fireEvent.click(interruptBtn);
      expect(onInterruptAudio).toHaveBeenCalledTimes(1);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    it("renders recording timer, audio visualizer, Done, and Cancel buttons during voice recording", () => {
      mockVoiceRecorderState.status = "recording";
      mockVoiceRecorderState.durationSeconds = 14;
      mockVoiceRecorderState.microphoneLevel = 0.6;

      const props = createProps({ microphoneLevel: 0.6 });
      render(<SimulationComposer {...props} />);

      // Live timer formatted 0:14 / 2:00
      const timer = screen.getByTestId("recording-timer");
      expect(timer.textContent).toContain("0:14 / 2:00");

      // Audio level visualizer bar
      const meter = screen.getByRole("meter", { name: /audio level/i });
      expect(meter).toBeDefined();
      expect(meter.getAttribute("aria-valuenow")).toBe("60");

      const levelBar = screen.getByTestId("audio-level-bar");
      expect(levelBar.style.width).toBe("60%");

      // Primary Done button
      const doneBtn = screen.getByRole("button", { name: /done speaking|done/i });
      expect(doneBtn.className).toContain("min-h-[44px]");
      expect(doneBtn.className).toContain("rounded-full");
      expect(doneBtn.className).toContain("bg-primary");
      fireEvent.click(doneBtn);
      expect(mockStopAndTranscribe).toHaveBeenCalledTimes(1);

      // Secondary Cancel button
      const cancelBtn = screen.getByRole("button", {
        name: /cancel recording|cancel/i,
      });
      expect(cancelBtn.className).toContain("min-h-[44px]");
      expect(cancelBtn.className).toContain("rounded-full");
      fireEvent.click(cancelBtn);
      expect(mockCancelRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe("Mobile Keyboard Collapse Behavior", () => {
    it("folds dedicated mic row and reveals inline mic button when isKeyboardOpen is true", () => {
      const props = createProps({ isKeyboardOpen: true });
      render(<SimulationComposer {...props} />);

      // Dedicated mic row is folded
      expect(screen.queryByTestId("dedicated-mic-row")).toBeNull();
      expect(screen.queryByRole("button", { name: /tap to talk/i })).toBeNull();

      // Inline mic button is visible inside composer row
      const inlineMicBtn = screen.getByRole("button", { name: /record voice/i });
      expect(inlineMicBtn).toBeDefined();
      expect(inlineMicBtn.className).toContain("min-h-[44px]");
      expect(inlineMicBtn.className).toContain("min-w-[44px]");

      fireEvent.click(inlineMicBtn);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    it("stops and transcribes when inline mic is clicked while recording with keyboard open", () => {
      mockVoiceRecorderState.status = "recording";
      const props = createProps({ isKeyboardOpen: true });
      render(<SimulationComposer {...props} />);

      const stopBtn = screen.getByRole("button", { name: /done speaking/i });
      fireEvent.click(stopBtn);
      expect(mockStopAndTranscribe).toHaveBeenCalledTimes(1);
    });
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
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

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
      const props = createProps();
      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("true");
      expect(
        screen.getByText(/Hold Space to talk, release to review/i),
      ).toBeDefined();
    });

    it("switches state and writes to localStorage when clicked", () => {
      const props = createProps();
      render(<SimulationComposer {...props} />);

      const toggle = screen.getByRole("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-checked")).toBe("false");
      expect(
        window.localStorage.getItem("kalemny_voice_review_before_send"),
      ).toBe("false");
      expect(
        screen.getByText(/Hold Space to talk, release to send/i),
      ).toBeDefined();

      fireEvent.click(toggle);

      expect(toggle.getAttribute("aria-checked")).toBe("true");
      expect(
        window.localStorage.getItem("kalemny_voice_review_before_send"),
      ).toBe("true");
      expect(
        screen.getByText(/Hold Space to talk, release to review/i),
      ).toBeDefined();
    });

    it("initializes reviewBeforeSend from localStorage when set to 'false'", async () => {
      window.localStorage.setItem("kalemny_voice_review_before_send", "false");

      const props = createProps();
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

      window.localStorage.setItem("kalemny_voice_review_before_send", "false");

      const props = createProps({
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

  describe("Arabic RTL support", () => {
    it("renders textarea with dir='rtl', Arabic placeholder, and text-right alignment", () => {
      const props = createProps({
        language: "ar",
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /اكتب ردك/i,
      });

      expect(textarea.getAttribute("dir")).toBe("rtl");
      expect(textarea.getAttribute("placeholder")).toBe("اكتب ردك هنا…");
      expect(textarea.className).toContain("text-right");
      expect(screen.getByRole("button", { name: /إرسال الرد/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /اضغط للتحدث/i })).toBeTruthy();
    });

    it("renders voice review textarea with Arabic direction and placeholders", () => {
      const props = createProps({
        language: "ar",
        hasVoiceDraft: true,
        composerText: "مسودة صوتية",
      });

      render(<SimulationComposer {...props} />);

      const textarea = screen.getByRole("textbox", {
        name: /راجع وعدّل ردك قبل الإرسال/i,
      });

      expect(textarea.getAttribute("dir")).toBe("rtl");
      expect(textarea.getAttribute("placeholder")).toBe("اكتب ردك هنا…");
      expect(textarea.className).toContain("text-right");
    });

    it("renders 'اضغط للمقاطعة' when counterpart is speaking in Arabic", () => {
      const onInterruptAudio = vi.fn();
      const props = createProps({
        language: "ar",
        isCounterpartSpeaking: true,
        onInterruptAudio,
      });

      render(<SimulationComposer {...props} />);

      const interruptBtn = screen.getByRole("button", {
        name: /اضغط للمقاطعة/i,
      });
      expect(interruptBtn).toBeTruthy();

      fireEvent.click(interruptBtn);
      expect(onInterruptAudio).toHaveBeenCalledTimes(1);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe("Focus, Blur, and hideMicRow Behavior", () => {
    it("calls onFocus and onBlur when textarea focus state changes", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const props = createProps({ onFocus, onBlur });

      render(<SimulationComposer {...props} />);
      const textarea = screen.getByRole("textbox", {
        name: /type your response/i,
      });

      fireEvent.focus(textarea);
      expect(onFocus).toHaveBeenCalledTimes(1);

      fireEvent.blur(textarea);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("hides both dedicated mic row and inline mobile mic button when hideMicRow is true", () => {
      // 1. Normal state: dedicated mic row visible
      const { rerender } = render(
        <SimulationComposer {...createProps({ hideMicRow: true })} />,
      );
      expect(screen.queryByTestId("dedicated-mic-row")).toBeNull();
      expect(screen.queryByRole("button", { name: /record voice/i })).toBeNull();

      // 2. Mobile keyboard open state: inline mic button also hidden when hideMicRow is true
      rerender(
        <SimulationComposer
          {...createProps({ hideMicRow: true, isKeyboardOpen: true })}
        />,
      );
      expect(screen.queryByTestId("dedicated-mic-row")).toBeNull();
      expect(screen.queryByRole("button", { name: /record voice/i })).toBeNull();
    });
  });
});

