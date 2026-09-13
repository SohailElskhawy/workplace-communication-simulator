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
  CounterpartStage,
  type SimulationUiState,
} from "@/components/simulations/counterpart-stage";
import { FinishSimulationDialog } from "@/components/simulations/finish-simulation-dialog";
import { LiveCallBar } from "@/components/simulations/live-call-bar";
import { SimulationComposer } from "@/components/simulations/simulation-composer";
import { SimulationHeader } from "@/components/simulations/simulation-header";
import {
  VisibleTranscriptView,
  type PendingTurnState,
} from "@/components/simulations/visible-transcript-view";
import { useContinuousLiveCall } from "@/hooks/use-continuous-live-call";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { isConversationInputDisabled } from "@/lib/conversation-input-state";
import { LocaleProvider } from "@/lib/locale-context";
import { isPersistedRoleplayFailure } from "@/lib/roleplay-recovery";
import {
  SpeechPlaybackController,
  type SpeechPlaybackStatus,
} from "@/lib/speech-playback-controller";

const COUNTERPART_NAMES: Record<string, { en: string; ar: string }> = {
  "salary-negotiation": { en: "Sarah Chen", ar: "سارة تشن" },
  "behavioral-interview": { en: "Marcus Vance", ar: "ماركوس فانس" },
  "promotion-request": { en: "David Rodriguez", ar: "ديفيد رودريغيز" },
  "manager-pushback": { en: "Elena Rostova", ar: "إيلينا روستوفا" },
  "difficult-feedback": { en: "Tariq Al-Mansoor", ar: "طارق المنصور" },
  "scope-creep": { en: "Amira Patel", ar: "أميرة باتيل" },
};

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
  const loadedAttemptIdRef = useRef<string | null>(null);

  // In-conversation state
  const [composerText, setComposerText] = useState("");
  const [inputMode, setInputMode] = useState<InputMethod>("TEXT");
  const [sendingTurn, setSendingTurn] = useState(false);
  const [pendingTurn, setPendingTurn] = useState<PendingTurnState | null>(null);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Speech and Audio playback state
  const [counterpartSpeechStatus, setCounterpartSpeechStatus] =
    useState<SpeechPlaybackStatus>("idle");
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null);
  const speechControllerRef = useRef<SpeechPlaybackController | null>(null);
  const hasAutoPlayedOpeningRef = useRef(false);

  // Voice recording state
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "requesting_permission" | "recording" | "transcribing" | "error"
  >("idle");
  const [hasVoiceDraft, setHasVoiceDraft] = useState(false);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);

  // Dialog, Header, and Navigation state
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [autoPlaySpeech, setAutoPlaySpeech] = useState(true);

  // Realtime mode hybrid typing toggle
  const [isTypingOpen, setIsTypingOpen] = useState(false);

  // Mobile layout state
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Timer and Expiry state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const isLiveCallMode = attempt?.interactionMode === "REALTIME";

  // Reload handler for user retry button
  const reloadSimulationData = useCallback(async () => {
    if (!attemptId) return;
    try {
      loadedAttemptIdRef.current = null;
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const attemptData = await client.fetchAttempt(token, attemptId);

      setAttempt(attemptData);
      loadedAttemptIdRef.current = attemptId;
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
      if (loadedAttemptIdRef.current === attemptId) return;

      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const attemptData = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;

        setAttempt(attemptData);
        loadedAttemptIdRef.current = attemptId;
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

  // Mobile Keyboard Detection via textarea focus/blur and visualViewport
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = () => {
      setIsKeyboardOpen(false);
    };

    textarea.addEventListener("focus", handleFocus);
    textarea.addEventListener("blur", handleBlur);

    return () => {
      textarea.removeEventListener("focus", handleFocus);
      textarea.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsKeyboardOpen(false);
        return;
      }
      if (viewport.height < initialHeight * 0.75) {
        setIsKeyboardOpen(true);
      } else if (document.activeElement !== textareaRef.current) {
        setIsKeyboardOpen(false);
      }
    };

    viewport.addEventListener("resize", handleResize);
    return () => {
      viewport.removeEventListener("resize", handleResize);
    };
  }, []);

  // Audio Playback & Barge-In for Stored Turns (PTT Mode & On-Demand Replay)
  const playTurnSpeech = useCallback(
    async (turnId: string) => {
      if (!attemptId) return;
      speechControllerRef.current?.stop();
      setPlayingTurnId(turnId);

      const controller = new SpeechPlaybackController({
        requestAudio: async (signal) => {
          const token = await getToken();
          if (!token) throw new Error("Authentication token not available.");
          return createApiClient(apiUrl).generateSpeech(
            token,
            attemptId,
            turnId,
            signal,
          );
        },
        createObjectUrl: (blob) => URL.createObjectURL(blob),
        revokeObjectUrl: (url) => URL.revokeObjectURL(url),
        createAudio: (url) => new Audio(url),
        onStatusChange: (status) => {
          setCounterpartSpeechStatus(status);
          if (status === "idle" || status === "error") {
            setPlayingTurnId((prev) => (prev === turnId ? null : prev));
          }
        },
      });

      speechControllerRef.current = controller;
      await controller.play();
    },
    [apiUrl, attemptId, getToken],
  );

  // Live call turn sender for realtime mode
  const handleSendLiveTurn = useCallback(
    async (textToSend: string): Promise<string | null> => {
      if (!attemptId || !textToSend.trim()) return null;
      const client = createApiClient(apiUrl);
      const clientRequestId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const newTurn = await client.createTurn(token, attemptId, {
          clientRequestId,
          text: textToSend.trim(),
          inputMethod: "VOICE",
        });

        setAttempt((prev) => {
          if (!prev) return prev;
          const exists = prev.turns.some((t) => t.id === newTurn.id);
          const updatedTurns = exists
            ? prev.turns.map((t) => (t.id === newTurn.id ? newTurn : t))
            : [...prev.turns, newTurn];
          return { ...prev, turns: updatedTurns };
        });

        return newTurn.id;
      } catch {
        return null;
      }
    },
    [apiUrl, attemptId, getToken],
  );

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

  // Hook for Continuous Hands-Free Call (REALTIME Mode)
  const liveCall = useContinuousLiveCall({
    hasOpeningMessage: Boolean(openingMessage),
    onTranscribeAudio: async (audioBlob, durationMs) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");
      return createApiClient(apiUrl).transcribeAudio(
        token,
        attemptId,
        audioBlob,
        durationMs,
      );
    },
    onSendTurn: handleSendLiveTurn,
    onRequestAudioStream: async (turnId) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required");
      return createApiClient(apiUrl).generateSpeech(token, attemptId, turnId);
    },
    onError: (err) => setGeneralError(err),
  });

  const {
    isConnected: isLiveCallConnected,
    startCall: startLiveCall,
    endCall: endLiveCall,
    interruptAi: interruptLiveCallAi,
    toggleMute: toggleLiveCallMute,
  } = liveCall;

  // Auto-connect call in REALTIME mode when active
  useEffect(() => {
    if (
      isLiveCallMode &&
      attempt?.status === "ACTIVE" &&
      !isLiveCallConnected
    ) {
      void startLiveCall();
    }
    return () => {
      if (isLiveCallMode) {
        endLiveCall();
      }
    };
  }, [
    isLiveCallMode,
    attempt?.status,
    isLiveCallConnected,
    startLiveCall,
    endLiveCall,
  ]);

  // Dual-anchor barge-in: immediately halts counterpart audio in both modes
  const handleStopAudio = useCallback(() => {
    if (isLiveCallMode) {
      interruptLiveCallAi();
    } else {
      speechControllerRef.current?.stop();
      setCounterpartSpeechStatus("idle");
      setPlayingTurnId(null);
    }
  }, [isLiveCallMode, interruptLiveCallAi]);

  useEffect(() => {
    return () => {
      speechControllerRef.current?.dispose();
    };
  }, []);

  // Counterpart Identity mapping
  const counterpartRole = useMemo(() => {
    if (attempt?.language === "ar" && scenarioDetail?.context?.aiRoleAr) {
      return scenarioDetail.context.aiRoleAr;
    }
    if (scenarioDetail?.context?.aiRole) {
      return scenarioDetail.context.aiRole;
    }
    const key = attempt?.scenario?.key ?? "";
    if (attempt?.language === "ar") {
      if (key.includes("salary") || key.includes("offer")) return "مدير التوظيف";
      if (key.includes("interview")) return "المحاور الرئيسي";
      if (key.includes("pushback") || key.includes("manager"))
        return "المدير المسؤول";
      if (key.includes("feedback")) return "الزميل";
      if (key.includes("scope")) return "صاحب المصلحة";
      if (key.includes("promotion")) return "المدير المباشر";
      return "الطرف الآخر";
    }
    if (key.includes("salary") || key.includes("offer"))
      return "Hiring Manager";
    if (key.includes("interview")) return "Interviewer";
    if (key.includes("pushback") || key.includes("manager")) return "Manager";
    if (key.includes("feedback")) return "Colleague";
    if (key.includes("scope")) return "Project Stakeholder";
    if (key.includes("promotion")) return "Department Head";
    return "Counterpart";
  }, [scenarioDetail, attempt?.scenario?.key, attempt?.language]);

  const counterpartName = useMemo(() => {
    const key = attempt?.scenario?.key ?? "";
    const isAr = attempt?.language === "ar";
    if (COUNTERPART_NAMES[key]) {
      return isAr ? COUNTERPART_NAMES[key].ar : COUNTERPART_NAMES[key].en;
    }
    return counterpartRole || (isAr ? "المحاور" : "Interviewer");
  }, [attempt?.scenario?.key, attempt?.language, counterpartRole]);

  const userRole = useMemo(() => {
    if (attempt?.language === "ar" && scenarioDetail?.context?.userRoleAr) {
      return scenarioDetail.context.userRoleAr;
    }
    if (scenarioDetail?.context?.userRole) {
      return scenarioDetail.context.userRole;
    }
    return attempt?.language === "ar" ? "أنت" : "You";
  }, [scenarioDetail, attempt?.language]);

  const userObjective = useMemo(() => {
    if (attempt?.language === "ar") {
      return (
        scenarioDetail?.context?.userObjectiveAr ??
        scenarioDetail?.context?.userObjective ??
        "خض المحادثة بشكل بنّاء لتحقيق هدفك المهني في بيئة العمل."
      );
    }
    return (
      scenarioDetail?.context?.userObjective ??
      "Navigate the conversation constructively to achieve your workplace objective."
    );
  }, [scenarioDetail, attempt?.language]);

  const stakes = useMemo(() => {
    if (attempt?.language === "ar") {
      return scenarioDetail?.context?.stakesAr ?? scenarioDetail?.context?.stakes;
    }
    return scenarioDetail?.context?.stakes;
  }, [scenarioDetail, attempt?.language]);

  const isCustom = useMemo(() => {
    return Boolean(
      scenarioDetail?.isCustom ||
        attempt?.scenario?.key?.startsWith("custom-"),
    );
  }, [scenarioDetail, attempt?.scenario?.key]);

  const isLimitReached = (attempt?.turns.length ?? 0) >= 20;

  const activeSpeechStatus: SpeechPlaybackStatus = isLiveCallMode
    ? liveCall.callState === "AI_SPEAKING"
      ? "playing"
      : liveCall.callState === "AI_THINKING"
        ? "loading"
        : "idle"
    : counterpartSpeechStatus;

  const isComposerDisabled = isConversationInputDisabled({
    counterpartSpeechStatus: activeSpeechStatus,
    finishing,
    isExpired,
    isLimitReached,
    sendingTurn,
  });
  const composerDisabled = isComposerDisabled;

  const displayTurnCount = attempt?.turns.length ?? 0;
  const drawerTurns = attempt?.turns ?? [];

  const simulationUiState = useMemo<SimulationUiState>(() => {
    if (isLiveCallMode) {
      if (liveCall.callState === "AI_SPEAKING") return "AI_SPEAKING";
      if (liveCall.callState === "AI_THINKING") return "AI_THINKING";
      if (liveCall.callState === "USER_SPEAKING") return "LISTENING";
      if (liveCall.callState === "ERROR") return "MIC_ERROR";
      return "YOUR_TURN";
    }
    if (
      voiceStatus === "recording" ||
      voiceStatus === "requesting_permission"
    ) {
      return "LISTENING";
    }
    if (voiceStatus === "transcribing") return "TRANSCRIBING";
    if (voiceStatus === "error") return "MIC_ERROR";
    if (sendingTurn) return "AI_THINKING";
    if (
      counterpartSpeechStatus === "loading" ||
      counterpartSpeechStatus === "playing"
    ) {
      return "AI_SPEAKING";
    }
    if (hasVoiceDraft) return "REVIEWING";
    return "YOUR_TURN";
  }, [
    counterpartSpeechStatus,
    hasVoiceDraft,
    isLiveCallMode,
    liveCall.callState,
    sendingTurn,
    voiceStatus,
  ]);

  // Autoplay opening message once on initial load (PTT mode only)
  useEffect(() => {
    if (
      !hasAutoPlayedOpeningRef.current &&
      autoPlaySpeech &&
      !finishing &&
      attempt &&
      attempt.status === "ACTIVE" &&
      attempt.turns.length === 0 &&
      openingMessage &&
      !isLiveCallMode
    ) {
      hasAutoPlayedOpeningRef.current = true;
      void playTurnSpeech("opening");
    }
  }, [
    attempt,
    autoPlaySpeech,
    finishing,
    isLiveCallMode,
    openingMessage,
    playTurnSpeech,
  ]);

  const handleSendTurn = async (
    overrideText?: string,
    overrideInputMethod?: InputMethod,
  ) => {
    const textToSend = (overrideText ?? composerText).trim();
    if (!textToSend || composerDisabled || !attemptId) return;

    const inputMethod =
      overrideInputMethod ?? (hasVoiceDraft ? "VOICE" : "TEXT");
    const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setPendingTurn({
      text: textToSend,
      inputMethod,
      status: "sending",
    });
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

      // Autoplay counterpart audio reply in PTT mode
      if (newTurn.assistantText && autoPlaySpeech && !isLiveCallMode) {
        void playTurnSpeech(newTurn.id);
      }

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
          setGeneralError(
            "Your response was saved. Retry the counterpart response from the transcript.",
          );
          return;
        } catch {
          // Preserve the original error if recovery fails
        }
      }

      if (err instanceof ApiClientError && err.code === "RATE_LIMIT_EXCEEDED") {
        setGeneralError(
          "Rate limit reached. Please wait a moment before sending your next message.",
        );
        setPendingTurn(null);
      } else {
        setPendingTurn((prev) =>
          prev ? { ...prev, status: "error" } : null,
        );
        setGeneralError(
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

      if (updatedTurn.assistantText && autoPlaySpeech && !isLiveCallMode) {
        void playTurnSpeech(updatedTurn.id);
      }
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

  const isRtl = attempt.language === "ar";
  const locale = isRtl ? "ar" : "en";

  return (
    <LocaleProvider defaultLocale={locale} key={attempt.language}>
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="flex flex-col h-full w-full max-w-container-max mx-auto overflow-hidden bg-background sm:border-x sm:border-border font-sans"
      >
        {/* 1. Header */}
        <SimulationHeader
          scenarioTitle={attempt.scenario.title}
          difficulty={attempt.difficulty}
          counterpartRole={counterpartRole}
          turnCount={displayTurnCount}
          elapsedSeconds={elapsedSeconds}
          finishing={finishing}
          autoPlaySpeech={autoPlaySpeech}
          showAutoPlayToggle={!isLiveCallMode}
          onToggleAutoPlay={() => setAutoPlaySpeech((prev) => !prev)}
          onOpenFinishDialog={() => setShowFinishDialog(true)}
          onOpenBriefing={() => setBriefingOpen(true)}
        />

        {/* 2. Main Workspace Layout: Desktop 2-column Split / Mobile Budgeted Stack */}
        <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] flex-1 min-h-0 overflow-hidden">
          {/* Left Column (Desktop) / Top Section (Mobile): Counterpart Stage */}
          <div
            className={cn(
              "shrink-0 lg:h-full lg:overflow-y-auto lg:border-e lg:border-border-subtle",
              isKeyboardOpen ? "" : "p-3 sm:p-4",
            )}
          >
            <CounterpartStage
              scenarioKey={attempt.scenario.key}
              scenarioTitle={attempt.scenario.title}
              counterpartName={counterpartName}
              counterpartRole={counterpartRole}
              userRole={userRole}
              userObjective={userObjective}
              stakes={stakes}
              isCustom={isCustom}
              uiState={simulationUiState}
              counterpartSpeechStatus={activeSpeechStatus}
              onStopAudio={handleStopAudio}
              isKeyboardOpen={isKeyboardOpen}
            />
          </div>

          {/* Right Column (Desktop) / Main Stack Area (Mobile) */}
          <main
            id="main-content"
            className="flex flex-col flex-1 h-full min-h-0 overflow-hidden"
          >
            {/* Top / Middle: Visible Transcript View */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <VisibleTranscriptView
                turns={drawerTurns}
                openingMessage={openingMessage}
                pendingTurn={pendingTurn}
                counterpartName={counterpartName}
                counterpartRole={counterpartRole}
                onReplaySpeech={playTurnSpeech}
                onRetryTurn={handleRetryTurn}
                retryingTurnId={retryingTurnId}
                playingTurnId={playingTurnId}
              />
            </div>

            {/* Bottom: Docked Interaction Controller */}
            <div className="shrink-0 border-t border-border-subtle bg-surface-solid">
              {isLiveCallMode ? (
                <div className="flex flex-col w-full">
                  {/* Hybrid Typing Composer */}
                  {isTypingOpen && (
                    <div className="border-b border-border-subtle p-3 sm:p-4">
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
                        inputMode="TEXT"
                        onInputModeChange={setInputMode}
                        hasVoiceDraft={false}
                        microphoneLevel={0}
                        language={attempt.language ?? "en"}
                        onChangeText={setComposerText}
                        onSendTurn={(text) => void handleSendTurn(text, "TEXT")}
                        onVoiceStatusChange={setVoiceStatus}
                        onVoiceTranscriptReady={() => setHasVoiceDraft(true)}
                        onMicrophoneLevelChange={setMicrophoneLevel}
                        isCounterpartSpeaking={activeSpeechStatus === "playing"}
                        onInterruptAudio={handleStopAudio}
                        isKeyboardOpen={isKeyboardOpen}
                        hideMicRow={true}
                        onFocus={() => setIsKeyboardOpen(true)}
                        onBlur={() => setIsKeyboardOpen(false)}
                      />
                    </div>
                  )}

                  {/* Live Call Control Bar */}
                  <LiveCallBar
                    connected={isLiveCallConnected}
                    microphoneLevel={liveCall.microphoneLevel}
                    isMuted={liveCall.isMuted}
                    onToggleMute={toggleLiveCallMute}
                    isCounterpartSpeaking={liveCall.callState === "AI_SPEAKING"}
                    onInterruptAudio={handleStopAudio}
                    onToggleTyping={() => setIsTypingOpen((prev) => !prev)}
                    isTypingOpen={isTypingOpen}
                    language={attempt.language}
                  />
                </div>
              ) : (
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
                  language={attempt.language ?? "en"}
                  onChangeText={setComposerText}
                  onSendTurn={(text, method) =>
                    void handleSendTurn(text, method)
                  }
                  onVoiceStatusChange={(status) => {
                    setVoiceStatus(status);
                    if (
                      status === "recording" ||
                      status === "requesting_permission"
                    ) {
                      handleStopAudio();
                    }
                  }}
                  onVoiceTranscriptReady={() => {
                    setHasVoiceDraft(true);
                  }}
                  onMicrophoneLevelChange={setMicrophoneLevel}
                  isCounterpartSpeaking={activeSpeechStatus === "playing"}
                  onInterruptAudio={handleStopAudio}
                  isKeyboardOpen={isKeyboardOpen}
                  onFocus={() => setIsKeyboardOpen(true)}
                  onBlur={() => setIsKeyboardOpen(false)}
                />
              )}
            </div>
          </main>
        </div>

        {/* 3. Mobile Briefing Modal (via header briefing button) */}
        <BriefingSidebar
          scenarioDetail={scenarioDetail}
          scenarioTitle={attempt.scenario.title}
          counterpartRole={counterpartRole}
          userObjective={userObjective}
          isOpenMobile={briefingOpen}
          onToggleMobile={() => setBriefingOpen((prev) => !prev)}
          language={attempt.language}
        />

        {/* 4. Finish Simulation Dialog */}
        <FinishSimulationDialog
          open={showFinishDialog}
          turnCount={displayTurnCount}
          finishing={finishing}
          onClose={() => setShowFinishDialog(false)}
          onConfirm={handleFinishSimulation}
        />
      </div>
    </LocaleProvider>
  );
}
