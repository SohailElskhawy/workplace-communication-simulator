"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  AttemptDetailResponse,
  ConversationTurn,
  InputMethod,
  PublicScenarioDetail,
} from "@kalemny/contracts";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/route-state";
import { BriefingSidebar } from "@/components/simulations/briefing-sidebar";
import {
  ConversationStage,
  type SimulationUiState,
} from "@/components/simulations/conversation-stage";
import { FinishSimulationDialog } from "@/components/simulations/finish-simulation-dialog";
import { LiveConversation } from "@/components/simulations/live-conversation";
import { SimulationComposer } from "@/components/simulations/simulation-composer";
import { SimulationHeader } from "@/components/simulations/simulation-header";
import {
  TranscriptDrawer,
  type PendingTurnState,
} from "@/components/simulations/transcript-drawer";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { isConversationInputDisabled } from "@/lib/conversation-input-state";
import { isRealtimeVoiceEnabled } from "@/lib/feature-flags";
import type { LiveConversationUiState } from "@/lib/live-conversation-state";
import { isPersistedRoleplayFailure } from "@/lib/roleplay-recovery";
import type { SpeechPlaybackStatus } from "@/lib/speech-playback-controller";

// Build-time UI gate only; the backend endpoints remain separately gated by
// the server-only ELEVENLABS_* settings.
const realtimeVoiceEnabled = isRealtimeVoiceEnabled();

export default function SimulationPage() {
  const params = useParams();
  const rawAttemptId = params?.attemptId;
  const attemptId =
    (Array.isArray(rawAttemptId)
      ? rawAttemptId[0]
      : (rawAttemptId as string | undefined)) ?? "";

  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [attempt, setAttempt] = useState<AttemptDetailResponse["data"] | null>(
    null,
  );
  const [scenarioDetail, setScenarioDetail] =
    useState<PublicScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // In-conversation state
  const [composerText, setComposerText] = useState("");
  // Persistent input mode (VOICE/TEXT). Independent of transient conversation
  // state: once the learner picks VOICE it stays active across recording,
  // transcription, review, send, and AI turns until they choose "Type instead".
  const [inputMode, setInputMode] = useState<InputMethod>("TEXT");
  const [sendingTurn, setSendingTurn] = useState(false);
  const [pendingTurn, setPendingTurn] = useState<PendingTurnState | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Dialog and navigation state
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [autoPlaySpeech, setAutoPlaySpeech] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "requesting_permission" | "recording" | "transcribing" | "error"
  >("idle");
  const [hasVoiceDraft, setHasVoiceDraft] = useState(false);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [counterpartSpeechStatus, setCounterpartSpeechStatus] =
    useState<SpeechPlaybackStatus>("idle");

  // Feature-flagged live conversation (ElevenLabs realtime spike).
  const [liveActive, setLiveActive] = useState(false);
  const [liveUiState, setLiveUiState] =
    useState<LiveConversationUiState>("disconnected");

  // Timer and Expiry state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Reload handler for user retry button
  const reloadSimulationData = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const attemptData = await client.fetchAttempt(token, attemptId);

      setAttempt(attemptData);
      setFetchError(null);
      setIsNotFound(false);

      if (
        attemptData.status === "COMPLETED" ||
        attemptData.status === "EVALUATING" ||
        attemptData.status === "EVALUATION_FAILED"
      ) {
        router.push(`/app/results/${encodeURIComponent(attemptId)}`);
        return;
      }

      try {
        const detail = await client.fetchScenarioDetail(
          token,
          attemptData.scenario.key,
        );
        setScenarioDetail(detail);
      } catch {}
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
        setIsNotFound(true);
        setFetchError("Simulation attempt not found.");
      } else {
        setFetchError(
          err instanceof Error
            ? err.message
            : "Failed to load simulation workspace.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, attemptId, getToken, router]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!isLoaded || !isSignedIn || !attemptId) return;

      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const attemptData = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;

        setAttempt(attemptData);
        setFetchError(null);
        setIsNotFound(false);

        if (
          attemptData.status === "COMPLETED" ||
          attemptData.status === "EVALUATING" ||
          attemptData.status === "EVALUATION_FAILED"
        ) {
          router.push(`/app/results/${encodeURIComponent(attemptId)}`);
          return;
        }

        try {
          const detail = await client.fetchScenarioDetail(
            token,
            attemptData.scenario.key,
          );
          if (isMounted) {
            setScenarioDetail(detail);
          }
        } catch {}
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setIsNotFound(true);
          setFetchError("Simulation attempt not found.");
        } else {
          setFetchError(
            err instanceof Error
              ? err.message
              : "Failed to load simulation workspace.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initialLoad();
    return () => {
      isMounted = false;
    };
  }, [apiUrl, attemptId, getToken, isLoaded, isSignedIn, router]);

  // Live Timer and Expiration Check
  useEffect(() => {
    if (!attempt || attempt.status !== "ACTIVE") return;

    const startedAtMs = new Date(attempt.startedAt).getTime();
    const expiresAtMs = attempt.expiresAt
      ? new Date(attempt.expiresAt).getTime()
      : Infinity;

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startedAtMs) / 1000));
      setElapsedSeconds(diffSecs);
      if (now > expiresAtMs) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  const counterpartRole = useMemo(() => {
    if (scenarioDetail?.context?.aiRole) {
      return scenarioDetail.context.aiRole;
    }
    const key = attempt?.scenario?.key ?? "";
    if (key.includes("salary") || key.includes("offer"))
      return "Hiring Manager";
    if (key.includes("interview")) return "Interviewer";
    if (key.includes("pushback") || key.includes("manager")) return "Manager";
    if (key.includes("feedback")) return "Colleague";
    if (key.includes("scope")) return "Project Stakeholder";
    if (key.includes("promotion")) return "Department Head";
    return "Counterpart";
  }, [scenarioDetail, attempt?.scenario?.key]);

  const userObjective = useMemo(() => {
    return (
      scenarioDetail?.context?.userObjective ??
      "Navigate the conversation constructively to achieve your workplace objective."
    );
  }, [scenarioDetail]);

  const openingMessage = useMemo(() => {
    if (attempt?.scenario?.openingMessage) {
      return attempt.scenario.openingMessage;
    }
    const key = attempt?.scenario?.key ?? "";
    const defaults: Record<string, string> = {
      "salary-negotiation":
        "Thanks for making time to talk. We're excited about the possibility of you joining the team. I understand you wanted to discuss the offer—what would you like us to consider?",
      "behavioral-interview":
        "Thanks for joining us today. To start off, could you tell me about a time when a project didn't go according to plan and how you handled it?",
      "promotion-request":
        "Hi, thanks for setting up this 1-on-1. You mentioned you wanted to discuss your career progression and role—what's on your mind?",
      "manager-pushback":
        "Thanks for meeting on short notice. As you know, leadership wants to pull the release date forward by two weeks. We need your team to commit to this new deadline.",
      "difficult-feedback":
        "Hey, thanks for catching up. What was it you wanted to discuss regarding our recent project collaboration?",
      "scope-creep":
        "Thanks for taking the call. We've decided we really need the analytics dashboard and multi-currency export included in this sprint before launch.",
    };
    return defaults[key] ?? null;
  }, [attempt]);

  const isLimitReached = (attempt?.turns.length ?? 0) >= 20;
  const isComposerDisabled = isConversationInputDisabled({
    counterpartSpeechStatus,
    finishing,
    isExpired,
    isLimitReached,
    sendingTurn,
  });
  // While a live session is starting or connected, the text/push-to-talk
  // composer is gated so the two input paths never overlap. The underlying
  // text flow itself is unchanged.
  const composerDisabled = isComposerDisabled || liveActive;

  const latestAssistantMessage = useMemo(() => {
    const latestTurnWithReply = [...(attempt?.turns ?? [])]
      .reverse()
      .find((turn) => Boolean(turn.assistantText));
    return latestTurnWithReply?.assistantText
      ? {
          turnId: latestTurnWithReply.id,
          text: latestTurnWithReply.assistantText,
        }
      : null;
  }, [attempt?.turns]);

  const simulationUiState = useMemo<SimulationUiState>(() => {
    // Live conversation drives the shared orb while active.
    if (liveUiState === "listening") return "LISTENING";
    if (liveUiState === "speaking") return "AI_SPEAKING";
    if (liveUiState === "connecting") return "AI_THINKING";
    if (sendingTurn) return "AI_THINKING";
    if (
      counterpartSpeechStatus === "loading" ||
      counterpartSpeechStatus === "playing"
    ) {
      return "AI_SPEAKING";
    }
    if (
      voiceStatus === "recording" ||
      voiceStatus === "requesting_permission"
    ) {
      return "LISTENING";
    }
    if (voiceStatus === "transcribing") return "TRANSCRIBING";
    if (hasVoiceDraft) return "REVIEWING";
    return "YOUR_TURN";
  }, [
    counterpartSpeechStatus,
    hasVoiceDraft,
    liveUiState,
    sendingTurn,
    voiceStatus,
  ]);

  const handleSendTurn = async (
    overrideText?: string,
    overrideInputMethod?: InputMethod,
  ) => {
    const textToSend = (overrideText ?? composerText).trim();
    if (!textToSend || composerDisabled || !attemptId) return;

    // Per-turn input method reflects how this draft was produced (voice
    // transcript vs typed text), not the persistent composer mode.
    const inputMethod =
      overrideInputMethod ?? (hasVoiceDraft ? "VOICE" : "TEXT");
    const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setPendingTurn({ clientRequestId, inputMethod, text: textToSend });
    setPendingError(null);
    setGeneralError(null);
    setSendingTurn(true);
    setComposerText("");
    setHasVoiceDraft(false);

    const client = createApiClient(apiUrl);
    let token: string | null = null;

    try {
      token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const newTurn = await client.createTurn(token, attemptId, {
        clientRequestId,
        text: textToSend,
        inputMethod,
      });

      setAttempt((prev) => {
        if (!prev) return prev;
        const exists = prev.turns.some((t) => t.id === newTurn.id);
        const updatedTurns = exists
          ? prev.turns.map((t) => (t.id === newTurn.id ? newTurn : t))
          : [...prev.turns, newTurn];
        return { ...prev, turns: updatedTurns };
      });

      setPendingTurn(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (err: unknown) {
      if (isPersistedRoleplayFailure(err) && token) {
        try {
          const recoveryToken = await getToken({ skipCache: true });
          if (!recoveryToken)
            throw new Error("Authentication token not available.");

          const recoveredAttempt = await client.fetchAttempt(
            recoveryToken,
            attemptId,
          );
          setAttempt(recoveredAttempt);
          setPendingTurn(null);
          setPendingError(null);
          setGeneralError(
            "Your response was saved. Retry the counterpart response from the transcript.",
          );
          setTranscriptOpen(true);
          return;
        } catch {
          // Preserve the original provider error when recovery cannot load the stored turn.
        }
      }

      if (err instanceof ApiClientError && err.code === "RATE_LIMIT_EXCEEDED") {
        setGeneralError(
          "Rate limit reached. Please wait a moment before sending your next message.",
        );
        setPendingError(null);
      } else {
        setPendingError(
          err instanceof Error
            ? err.message
            : "Failed to exchange conversation turn. Please retry.",
        );
      }
    } finally {
      setSendingTurn(false);
    }
  };

  const handleRetryTurn = async (turnId: string) => {
    if (!attemptId) return;
    try {
      setRetryingTurnId(turnId);
      setGeneralError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const updatedTurn = await client.retryTurn(token, attemptId, turnId);

      setAttempt((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          turns: prev.turns.map((t: ConversationTurn) =>
            t.id === updatedTurn.id ? updatedTurn : t,
          ),
        };
      });
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "Failed to retry counterpart response.",
      );
    } finally {
      setRetryingTurnId(null);
    }
  };

  const handleFinishSimulation = async () => {
    if (!attemptId) return;
    try {
      setFinishing(true);
      setShowFinishDialog(false);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      await client.finishAttempt(token, attemptId);

      router.push(`/app/results/${encodeURIComponent(attemptId)}`);
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to finalize simulation.",
      );
      setFinishing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Preparing simulation workspace..." />;
  }

  if (isNotFound) {
    return (
      <EmptyState
        title="Simulation Not Found"
        description="The simulation rehearsal you requested could not be found."
        action="Browse Scenarios"
      />
    );
  }

  if (fetchError || !attempt) {
    return (
      <ErrorState
        title="Unable to load simulation"
        description={fetchError ?? "An error occurred."}
        onRetry={reloadSimulationData}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-container-max mx-auto overflow-hidden font-sans bg-surface-solid sm:border-x sm:border-border">
      {/* 1. Header */}
      <SimulationHeader
        scenarioTitle={attempt.scenario.title}
        difficulty={attempt.difficulty}
        counterpartRole={counterpartRole}
        turnCount={attempt.turns.length}
        elapsedSeconds={elapsedSeconds}
        finishing={finishing}
        autoPlaySpeech={autoPlaySpeech}
        onToggleAutoPlay={() => setAutoPlaySpeech((prev) => !prev)}
        onOpenFinishDialog={() => setShowFinishDialog(true)}
        onOpenBriefing={() => setBriefingOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Briefing Sidebar (Desktop Sidebar + Mobile Modal) */}
        <BriefingSidebar
          scenarioDetail={scenarioDetail}
          scenarioTitle={attempt.scenario.title}
          counterpartRole={counterpartRole}
          userObjective={userObjective}
          isOpenMobile={briefingOpen}
          onToggleMobile={() => setBriefingOpen((prev) => !prev)}
        />

        {/* Conversation stage, response controls, and transcript drawer */}
        <main
          id="main-content"
          className="relative flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background"
        >
          {/* Slim Mobile Goal Banner (Tap to open full briefing) */}
          <div className="md:hidden shrink-0 border-b border-border/30 bg-surface px-3 py-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setBriefingOpen(true)}
              className="w-full flex items-center justify-between text-left font-meta text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-0.5"
            >
              <span className="truncate mr-2">
                <strong className="text-primary font-bold uppercase tracking-wider mr-1">
                  Goal:
                </strong>
                <span className="text-foreground font-medium">
                  {userObjective}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                Briefing →
              </span>
            </button>
          </div>

          <ConversationStage
            attemptId={attempt.id}
            counterpartRole={counterpartRole}
            openingMessage={openingMessage}
            latestAssistantMessage={latestAssistantMessage}
            turnCount={attempt.turns.length}
            uiState={simulationUiState}
            autoPlaySpeech={autoPlaySpeech && !finishing}
            cancelSpeechPlayback={finishing || liveActive}
            onSpeechStatusChange={setCounterpartSpeechStatus}
            microphoneLevel={microphoneLevel}
            onOpenTranscript={() => setTranscriptOpen(true)}
          />

          {realtimeVoiceEnabled && (
            <LiveConversation
              attemptId={attempt.id}
              startDisabled={isComposerDisabled || finishing}
              onActiveChange={setLiveActive}
              onUiStateChange={setLiveUiState}
              onMicrophoneLevelChange={setMicrophoneLevel}
            />
          )}

          <SimulationComposer
            attemptId={attempt.id}
            composerText={composerText}
            sendingTurn={sendingTurn}
            isComposerDisabled={composerDisabled}
            isExpired={isExpired}
            isLimitReached={isLimitReached}
            turnCount={attempt.turns.length}
            generalError={generalError}
            textareaRef={textareaRef}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
            hasVoiceDraft={hasVoiceDraft}
            microphoneLevel={microphoneLevel}
            onChangeText={setComposerText}
            onSendTurn={() => void handleSendTurn()}
            onVoiceStatusChange={setVoiceStatus}
            onVoiceTranscriptReady={() => {
              setHasVoiceDraft(true);
            }}
            onMicrophoneLevelChange={setMicrophoneLevel}
          />

          <TranscriptDrawer
            open={transcriptOpen}
            attemptId={attempt.id}
            turns={attempt.turns}
            counterpartRole={counterpartRole}
            openingMessage={openingMessage}
            pendingTurn={pendingTurn}
            sendingTurn={sendingTurn}
            pendingError={pendingError}
            retryingTurnId={retryingTurnId}
            onClose={() => setTranscriptOpen(false)}
            onRetryTurn={handleRetryTurn}
            onRetryPending={() => {
              if (pendingTurn) {
                void handleSendTurn(pendingTurn.text, pendingTurn.inputMethod);
              }
            }}
          />
        </main>
      </div>

      {/* 3. Finish Simulation Dialog */}
      <FinishSimulationDialog
        open={showFinishDialog}
        turnCount={attempt.turns.length}
        finishing={finishing}
        onClose={() => setShowFinishDialog(false)}
        onConfirm={handleFinishSimulation}
      />
    </div>
  );
}
