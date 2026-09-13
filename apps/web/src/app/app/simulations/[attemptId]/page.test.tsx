// @vitest-environment happy-dom
import type { AttemptDetailResponse, ConversationTurn } from "@kalemny/contracts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SimulationPage from "./page";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ attemptId: "attempt-123" }),
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockGetToken = vi.fn().mockResolvedValue("test-token");
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    isLoaded: true,
    isSignedIn: true,
  }),
}));

const mockFetchAttempt = vi.fn();
const mockFetchScenarioDetail = vi.fn();
const mockCreateTurn = vi.fn();
const mockRetryTurn = vi.fn();
const mockFinishAttempt = vi.fn();
const mockGenerateSpeech = vi.fn();

vi.mock("@/lib/api-client", () => ({
  ApiClientError: class ApiClientError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  createApiClient: () => ({
    fetchAttempt: mockFetchAttempt,
    fetchScenarioDetail: mockFetchScenarioDetail,
    createTurn: mockCreateTurn,
    retryTurn: mockRetryTurn,
    finishAttempt: mockFinishAttempt,
    generateSpeech: mockGenerateSpeech,
  }),
}));

const mockStartCall = vi.fn();
const mockToggleMute = vi.fn();
const mockInterruptAi = vi.fn();
const mockEndCall = vi.fn();

let mockLiveCallState = {
  callState: "LISTENING" as
    | "CONNECTING"
    | "LISTENING"
    | "USER_SPEAKING"
    | "AI_THINKING"
    | "AI_SPEAKING"
    | "MUTED"
    | "ERROR",
  microphoneLevel: 0.2,
  isMuted: false,
  isConnected: true,
  interruptionCount: 0,
  startCall: mockStartCall,
  toggleMute: mockToggleMute,
  interruptAi: mockInterruptAi,
  endCall: mockEndCall,
};

vi.mock("@/hooks/use-continuous-live-call", () => ({
  useContinuousLiveCall: () => mockLiveCallState,
}));

function createAttemptData(
  overrides: Partial<AttemptDetailResponse["data"]> = {},
): AttemptDetailResponse["data"] {
  return {
    id: "attempt-123",
    status: "ACTIVE",
    difficulty: "MEDIUM",
    language: "ar",
    dialect: "EGYPTIAN",
    interactionMode: "PUSH_TO_TALK",
    scenario: {
      key: "salary-negotiation",
      title: "مفاوضة الراتب",
      version: 1,
      openingMessage: "شكراً لحضورك. نود مناقشة تفاصيل العرض.",
    },
    retryOfAttemptId: null,
    turns: [],
    evaluation: null,
    comparison: null,
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    endedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  };
}

describe("SimulationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollTo = vi.fn();
    mockGenerateSpeech.mockResolvedValue(new Blob(["audio-data"]));
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-audio");
    window.URL.revokeObjectURL = vi.fn();
    class MockAudio {
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }
    window.Audio = MockAudio as unknown as typeof Audio;
    mockLiveCallState = {
      callState: "LISTENING",
      microphoneLevel: 0.2,
      isMuted: false,
      isConnected: true,
      interruptionCount: 0,
      startCall: mockStartCall,
      toggleMute: mockToggleMute,
      interruptAi: mockInterruptAi,
      endCall: mockEndCall,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("1. renders Arabic RTL layout with CounterpartStage and VisibleTranscriptView", async () => {
    const arabicAttempt = createAttemptData({ language: "ar" });
    mockFetchAttempt.mockResolvedValue(arabicAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "مفاوضة الراتب",
      summary: "تفاوض على الراتب",
      difficulty: "MEDIUM",
      context: {
        aiRole: "مدير التوظيف",
        userRole: "المرشح للوظيفة",
        userObjective: "الحصول على زيادة في الراتب الأساسي.",
      },
    });

    render(<SimulationPage />);

    expect(screen.getByText(/Preparing simulation workspace/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId("counterpart-stage")).toBeTruthy();
      expect(screen.getByTestId("visible-transcript-view")).toBeTruthy();
    });

    // Check RTL direction
    const rootContainer = document.querySelector('[dir="rtl"]');
    expect(rootContainer).toBeTruthy();

    // Check persona mapped Arabic name "سارة تشن" and counterpart role
    expect(screen.getAllByText("سارة تشن").length).toBeGreaterThan(0);
    expect(screen.getAllByText("مدير التوظيف").length).toBeGreaterThan(0);

    // Check CounterpartStage elements (state badge in Arabic)
    expect(screen.getByText("دورك في الحديث")).toBeTruthy();

    // Check opening message bubble in VisibleTranscriptView
    expect(
      screen.getByText("شكراً لحضورك. نود مناقشة تفاصيل العرض."),
    ).toBeTruthy();
  });

  it("2. renders English LTR layout with CounterpartStage and VisibleTranscriptView", async () => {
    const englishAttempt = createAttemptData({
      language: "en",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(englishAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userRole: "Job Candidate",
        userObjective: "Secure an increase in base compensation.",
      },
    });

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("counterpart-stage")).toBeTruthy();
      expect(screen.getByTestId("visible-transcript-view")).toBeTruthy();
    });

    // Check LTR direction
    const rootContainer = document.querySelector('[dir="ltr"]');
    expect(rootContainer).toBeTruthy();

    // Check persona mapped English name "Sarah Chen" and role
    expect(screen.getAllByText("Sarah Chen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hiring Manager").length).toBeGreaterThan(0);

    // Check CounterpartStage state badge in English
    expect(screen.getByText("Your turn to speak")).toBeTruthy();

    // Check opening message in transcript
    expect(screen.getByText("Thanks for making time to talk.")).toBeTruthy();
  });

  it("3. renders SimulationComposer in PTT mode, handles sending turns via text", async () => {
    const pttAttempt = createAttemptData({
      language: "en",
      interactionMode: "PUSH_TO_TALK",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(pttAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userObjective: "Secure an increase in base compensation.",
      },
    });

    const newTurn: ConversationTurn = {
      id: "turn-1",
      sequence: 1,
      inputMethod: "TEXT",
      userText: "I am proposing a 10% base compensation increase.",
      assistantText: "I appreciate you bringing this up. What is your rationale?",
      status: "COMPLETED",
      createdAt: "2026-09-05T12:05:00Z",
      completedAt: "2026-09-05T12:05:05Z",
    };
    mockCreateTurn.mockResolvedValue(newTurn);

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("simulation-composer")).toBeTruthy();
    });

    // Check composer textarea
    const textarea = screen.getByRole("textbox", {
      name: /type your response/i,
    });
    expect(textarea).toBeTruthy();

    // Type a response
    fireEvent.change(textarea, {
      target: { value: "I am proposing a 10% base compensation increase." },
    });

    // Submit response
    const sendButton = screen.getByRole("button", { name: /send response/i });
    await waitFor(() => {
      expect((sendButton as HTMLButtonElement).disabled).toBe(false);
    });
    const form = sendButton.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockCreateTurn).toHaveBeenCalledWith(
        "test-token",
        "attempt-123",
        expect.objectContaining({
          text: "I am proposing a 10% base compensation increase.",
          inputMethod: "TEXT",
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("I am proposing a 10% base compensation increase."),
      ).toBeTruthy();
      expect(
        screen.getByText(
          "I appreciate you bringing this up. What is your rationale?",
        ),
      ).toBeTruthy();
    });
  });

  it("4. renders LiveCallBar in REALTIME mode, supports mute toggle and hybrid typing toggle", async () => {
    const realtimeAttempt = createAttemptData({
      language: "en",
      interactionMode: "REALTIME",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(realtimeAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userObjective: "Secure an increase in base compensation.",
      },
    });

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("live-call-bar")).toBeTruthy();
    });

    // Verify mute toggle button is present and clickable
    const muteButton = screen.getByTestId("mute-toggle-button");
    expect(muteButton).toBeTruthy();
    fireEvent.click(muteButton);
    expect(mockToggleMute).toHaveBeenCalledTimes(1);

    // Verify composer is NOT rendered initially before toggling typing
    expect(screen.queryByTestId("simulation-composer")).toBeNull();

    // Toggle hybrid typing open
    const typingButton = screen.getByTestId("typing-toggle-button");
    expect(typingButton).toBeTruthy();
    fireEvent.click(typingButton);

    // Verify SimulationComposer is now rendered above LiveCallBar
    await waitFor(() => {
      expect(screen.getByTestId("simulation-composer")).toBeTruthy();
    });

    // Toggle hybrid typing closed
    fireEvent.click(typingButton);
    await waitFor(() => {
      expect(screen.queryByTestId("simulation-composer")).toBeNull();
    });
  });

  it("5. opens and submits FinishSimulationDialog, navigating to results", async () => {
    const attemptData = createAttemptData({
      language: "en",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(attemptData);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userObjective: "Secure an increase in base compensation.",
      },
    });
    mockFinishAttempt.mockResolvedValue({ status: "EVALUATING" });

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("counterpart-stage")).toBeTruthy();
    });

    // Click finish button in header
    const finishHeaderBtn = screen.getByRole("button", {
      name: /finish rehearsal session/i,
    });
    fireEvent.click(finishHeaderBtn);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Finish Rehearsal Session?")).toBeTruthy();
    });

    // Click confirm in dialog
    const confirmButton = screen.getByRole("button", {
      name: /finish & evaluate/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFinishAttempt).toHaveBeenCalledWith(
        "test-token",
        "attempt-123",
      );
      expect(mockRouterPush).toHaveBeenCalledWith("/app/results/attempt-123");
    });
  });

  it("6. supports barge-in interruption stopping counterpart audio", async () => {
    mockLiveCallState.callState = "AI_SPEAKING";
    const realtimeAttempt = createAttemptData({
      language: "en",
      interactionMode: "REALTIME",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(realtimeAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userObjective: "Secure an increase in base compensation.",
      },
    });

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("counterpart-stage")).toBeTruthy();
    });

    // 1. CounterpartStage Stop Audio button (Anchor 1)
    const stopAudioBtn = screen.getByRole("button", { name: /stop audio/i });
    expect(stopAudioBtn).toBeTruthy();
    fireEvent.click(stopAudioBtn);
    expect(mockInterruptAi).toHaveBeenCalledTimes(1);

    // 2. LiveCallBar Interrupt button (Anchor 2)
    const interruptBtn = screen.getByTestId("interrupt-button");
    expect(interruptBtn).toBeTruthy();
    fireEvent.click(interruptBtn);
    expect(mockInterruptAi).toHaveBeenCalledTimes(2);
  });
});
