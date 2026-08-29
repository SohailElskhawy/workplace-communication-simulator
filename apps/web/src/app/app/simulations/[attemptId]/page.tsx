"use client";

import { useAuth } from "@clerk/nextjs";
import {
  MAX_TURN_TEXT_LENGTH,
  type AttemptDetailResponse,
  type ConversationTurn,
  type PublicScenarioDetail,
} from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AccessibleDialog } from "@/components/accessible-dialog";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Inline SVGs for lightweight, zero-dependency rendering
function TimerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ForumIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function SendIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FlagIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function RefreshIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

interface PendingTurnState {
  clientRequestId: string;
  text: string;
}

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
  const [reloadToken, setReloadToken] = useState(0);

  // In-conversation state
  const [composerText, setComposerText] = useState("");
  const [sendingTurn, setSendingTurn] = useState(false);
  const [pendingTurn, setPendingTurn] = useState<PendingTurnState | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Dialog and navigation state
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  // Timer and Expiry state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Attempt & Public Scenario details
  useEffect(() => {
    let isMounted = true;

    async function loadSimulationData() {
      if (!isLoaded || !isSignedIn || !attemptId) return;

      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);

        const attemptData = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;

        setAttempt(attemptData);
        setFetchError(null);
        setIsNotFound(false);

        // Immediate redirect for terminal or evaluation states
        if (
          attemptData.status === "COMPLETED" ||
          attemptData.status === "EVALUATING" ||
          attemptData.status === "EVALUATION_FAILED"
        ) {
          router.push(`/app/results/${encodeURIComponent(attemptId)}`);
          return;
        }

        // Fetch public scenario details to get publicContext (aiRole, userObjective, description)
        try {
          const detail = await client.fetchScenarioDetail(
            token,
            attemptData.scenario.key,
          );
          if (isMounted) {
            setScenarioDetail(detail);
          }
        } catch {
          // Public scenario detail is supplementary; fallback values are derived from scenario
        }
      } catch (err) {
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

    void loadSimulationData();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, getToken, attemptId, router, reloadToken]);

  // Live Timer and Expiration Check based on attempt timestamps
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

  // Auto-scroll on conversation update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [attempt?.turns, pendingTurn, sendingTurn]);

  // Derived Scenario Metadata (NEVER “AI Assistant”)
  const counterpartRole = useMemo(() => {
    if (scenarioDetail?.context?.aiRole) {
      return scenarioDetail.context.aiRole;
    }
    // Fallback derived cleanly from scenario key
    const key = attempt?.scenario?.key ?? "";
    if (key.includes("salary") || key.includes("offer")) return "Hiring Manager";
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

  const isLimitReached = (attempt?.turns.length ?? 0) >= 20;

  const isComposerDisabled =
    sendingTurn || finishing || isExpired || isLimitReached;

  // Handle Send Turn (creates or retries turn with preserved clientRequestId)
  const handleSendTurn = useCallback(
    async (overrideText?: string, overrideClientId?: string) => {
      const textToSend = (overrideText ?? composerText).trim();
      if (!textToSend || sendingTurn || finishing || isExpired || isLimitReached) {
        return;
      }

      const clientRequestId =
        overrideClientId ?? pendingTurn?.clientRequestId ?? crypto.randomUUID();

      try {
        setSendingTurn(true);
        setPendingError(null);
        setGeneralError(null);

        // Optimistically set pending turn so learner text is visible immediately
        setPendingTurn({ clientRequestId, text: textToSend });
        if (!overrideText) {
          setComposerText("");
        }

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);

        const newTurn = await client.createTurn(token, attemptId, {
          clientRequestId,
          text: textToSend,
          inputMethod: "TEXT",
        });

        // Turn succeeded or was returned by server
        setAttempt((prev) => {
          if (!prev) return prev;
          const exists = prev.turns.some((t) => t.id === newTurn.id);
          const updatedTurns = exists
            ? prev.turns.map((t) => (t.id === newTurn.id ? newTurn : t))
            : [...prev.turns, newTurn];
          return {
            ...prev,
            turns: updatedTurns,
          };
        });

        setPendingTurn(null);
        setPendingError(null);
      } catch (err) {
        const errorMsg =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to send response. Please retry.";

        setPendingError(errorMsg);

        // Refresh attempt state from server in case of state desynchronization
        const token = await getToken().catch(() => null);
        if (token) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
          const client = createApiClient(apiUrl);
          const fresh = await client.fetchAttempt(token, attemptId).catch(() => null);
          if (fresh) setAttempt(fresh);
        }
      } finally {
        setSendingTurn(false);
      }
    },
    [
      composerText,
      sendingTurn,
      finishing,
      isExpired,
      isLimitReached,
      pendingTurn?.clientRequestId,
      getToken,
      attemptId,
    ],
  );

  // Handle Retry of an already stored FAILED Turn
  const handleRetryTurn = useCallback(
    async (turnId: string) => {
      if (retryingTurnId || finishing) return;

      try {
        setRetryingTurnId(turnId);
        setGeneralError(null);
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);

        const updatedTurn = await client.retryTurn(token, attemptId, turnId);

        setAttempt((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            turns: prev.turns.map((t) => (t.id === turnId ? updatedTurn : t)),
          };
        });
      } catch (err) {
        setGeneralError(
          err instanceof Error
            ? err.message
            : "Failed to retry counterpart reply.",
        );
      } finally {
        setRetryingTurnId(null);
      }
    },
    [retryingTurnId, finishing, getToken, attemptId],
  );

  // Handle Finish Simulation Confirmation & Execution
  const handleFinish = useCallback(async () => {
    if (finishing || sendingTurn) return;

    try {
      setFinishing(true);
      setShowFinishDialog(false);
      setGeneralError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const result = await client.finishAttempt(token, attemptId);

      if (result.status === "ABANDONED") {
        router.push("/app");
      } else {
        router.push(`/app/results/${encodeURIComponent(attemptId)}`);
      }
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to finish simulation.",
      );
      setFinishing(false);
    }
  }, [finishing, sendingTurn, getToken, attemptId, router]);

  // Loading State
  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center max-w-2xl mx-auto">
        <div
          role="status"
          aria-busy="true"
          className="glass-surface rounded-card p-10 text-center border border-border shadow-[6px_6px_0px_0px_#1a1a1a] flex flex-col items-center gap-4"
        >
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"
            aria-hidden="true"
          />
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
            Entering Simulation Workspace
          </h2>
          <p className="font-sans text-sm text-muted-foreground max-w-sm">
            Initializing scenario counterpart and live conversation stream...
          </p>
        </div>
      </div>
    );
  }

  // Not Found State (404)
  if (isNotFound || (!attempt && !loading && !fetchError)) {
    return (
      <div className="w-full py-12 max-w-2xl mx-auto">
        <div className="glass-surface rounded-card p-8 text-center border border-border shadow-[6px_6px_0px_0px_#1a1a1a]">
          <div className="w-12 h-12 rounded-full bg-alert/20 text-alert border border-border mx-auto flex items-center justify-center mb-4">
            <span className="font-display text-xl font-bold">!</span>
          </div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
            Simulation Not Found
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
            The simulation attempt you requested does not exist or may have been
            removed.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Scenarios
          </Link>
        </div>
      </div>
    );
  }

  // Initial Load Error State
  if (fetchError || !attempt) {
    return (
      <div className="w-full py-12 max-w-2xl mx-auto">
        <div
          role="alert"
          className="glass-surface rounded-card p-8 text-center border border-alert bg-alert/5 shadow-[6px_6px_0px_0px_#1a1a1a]"
        >
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
            Unable to Load Simulation
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {fetchError ?? "An unexpected error occurred while loading the workspace."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setFetchError(null);
                setReloadToken((p) => p + 1);
              }}
              className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive cursor-pointer"
            >
              Try Again
            </button>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-control bg-surface-solid px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground border border-border brutalist-interactive"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Scenarios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Graceful Abandoned State if already marked ABANDONED
  if (attempt.status === "ABANDONED") {
    return (
      <div className="w-full py-12 max-w-2xl mx-auto">
        <div className="glass-surface rounded-card p-8 text-center border border-border shadow-[6px_6px_0px_0px_#1a1a1a]">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
            Simulation Concluded
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            This simulation session was closed with zero turns and marked as
            abandoned.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Start New Simulation
          </Link>
        </div>
      </div>
    );
  }

  const turnCount = attempt.turns.length;

  return (
    <div className="relative flex flex-col w-full min-h-[calc(100dvh-7rem)] sm:h-[calc(100vh-7.5rem)] rounded-card border border-border glass-surface shadow-[6px_6px_0px_0px_#1a1a1a] overflow-hidden">
      {/* 1. Simulation Top Bar */}
      <header className="flex-none flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-surface-solid/90 backdrop-blur-md z-30">
        {/* Left Title & Difficulty */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            title="Back to scenarios"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-control -ml-1"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="sr-only">Back to Scenarios</span>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm sm:text-base font-bold uppercase tracking-tight text-foreground line-clamp-1">
                {attempt.scenario.title}
              </h1>
              <span className="bg-success text-success-foreground font-meta text-[10px] font-bold px-2 py-0.5 rounded-full border border-border uppercase">
                {attempt.difficulty}
              </span>
            </div>
            <span className="font-meta text-[11px] text-muted-foreground block sm:hidden">
              Turn {turnCount}/20 · {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Center Label (Desktop) */}
        <div className="hidden md:flex flex-col items-center">
          <span className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {attempt.scenario.title} · {attempt.difficulty}
          </span>
        </div>

        {/* Right Finish Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFinishDialog(true)}
            disabled={finishing || sendingTurn}
            className="inline-flex items-center gap-1.5 rounded-control bg-surface-solid px-3.5 sm:px-5 py-2 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>{finishing ? "Finishing..." : "Finish Simulation"}</span>
            <FlagIcon className="w-3.5 h-3.5 text-foreground shrink-0" />
          </button>
        </div>
      </header>

      {/* 2. Mobile Collapsible Briefing Trigger */}
      <div className="md:hidden border-b border-border bg-surface-subtle z-20">
        <button
          type="button"
          onClick={() => setBriefingOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-surface-raised transition-colors focus-visible:outline-none"
          aria-expanded={briefingOpen}
        >
          <div className="flex items-center gap-2">
            <span className="font-meta text-xs font-bold text-primary uppercase tracking-wider">
              Briefing & Objective
            </span>
          </div>
          <div className="flex items-center gap-2 font-meta text-xs text-muted-foreground">
            <span className="bg-surface-solid px-2 py-0.5 rounded-full border border-border/30">
              {formatDuration(elapsedSeconds)}
            </span>
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                briefingOpen && "rotate-180",
              )}
            />
          </div>
        </button>

        {briefingOpen && (
          <div className="p-4 bg-surface-solid border-t border-border/20 flex flex-col gap-3 text-xs leading-relaxed animate-in slide-in-from-top-2 duration-150">
            <div className="border-l-4 border-primary pl-3">
              <span className="font-meta text-[10px] uppercase text-muted-foreground font-semibold block mb-0.5">
                Objective
              </span>
              <p className="font-sans font-medium text-foreground">
                {userObjective}
              </p>
            </div>
            <div className="border-l-4 border-border pl-3">
              <span className="font-meta text-[10px] uppercase text-muted-foreground font-semibold block mb-0.5">
                Counterpart
              </span>
              <p className="font-sans font-medium text-foreground">
                {counterpartRole}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
              <div className="bg-surface-subtle p-2 rounded-control text-center border border-border/20">
                <span className="font-meta text-[10px] text-muted-foreground block uppercase">
                  Time Elapsed
                </span>
                <span className="font-display font-bold text-foreground text-sm">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <div className="bg-surface-subtle p-2 rounded-control text-center border border-border/20">
                <span className="font-meta text-[10px] text-muted-foreground block uppercase">
                  Turn Count
                </span>
                <span className="font-display font-bold text-foreground text-sm">
                  {turnCount}/20
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Split View (Sidebar + Conversation) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Desktop Briefing Sidebar */}
        <aside className="w-72 lg:w-80 hidden md:flex flex-col border-r border-border bg-surface/80 backdrop-blur-md h-full overflow-y-auto shrink-0 select-none">
          <div className="p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
            {/* Header */}
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground mb-4">
                Your briefing
              </h2>
              <div className="flex flex-col gap-5">
                {/* Objective */}
                <div className="border-l-4 border-primary pl-4">
                  <span className="font-meta text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                    Objective
                  </span>
                  <p className="font-sans text-sm text-foreground font-medium leading-relaxed">
                    {userObjective}
                  </p>
                </div>

                {/* Counterpart */}
                <div className="border-l-4 border-border pl-4">
                  <span className="font-meta text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                    Counterpart
                  </span>
                  <p className="font-sans text-sm text-foreground font-medium">
                    {counterpartRole}
                  </p>
                </div>

                {/* Situation Description if available */}
                {scenarioDetail?.context?.description && (
                  <div className="border-l-4 border-border/30 pl-4">
                    <span className="font-meta text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                      Context
                    </span>
                    <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                      {scenarioDetail.context.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Session Stats Grid */}
            <div className="pt-6 border-t border-dashed border-border/30">
              <h3 className="font-meta text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                Session Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-surface p-4 text-center rounded-control border border-border">
                  <TimerIcon className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <span className="font-display text-xl font-bold block text-foreground">
                    {formatDuration(elapsedSeconds)}
                  </span>
                  <span className="font-meta text-[11px] uppercase tracking-wider text-muted-foreground">
                    Time
                  </span>
                </div>
                <div className="glass-surface p-4 text-center rounded-control border border-border">
                  <ForumIcon className="w-5 h-5 text-foreground mx-auto mb-1.5" />
                  <span className="font-display text-xl font-bold block text-foreground">
                    {turnCount}/20
                  </span>
                  <span className="font-meta text-[11px] uppercase tracking-wider text-muted-foreground">
                    Responses
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Section: Conversation Canvas + Composer */}
        <section className="flex-1 flex flex-col relative h-full min-w-0 bg-background/50">
          {/* Notification Banners */}
          {generalError && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-alert/10 border-b border-alert p-3 px-4 text-xs font-medium text-foreground flex items-center justify-between z-10"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-alert">Error:</span>
                <span>{generalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGeneralError(null)}
                aria-label="Dismiss message"
                className="text-foreground hover:text-alert font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {isLimitReached && (
            <div
              role="status"
              className="bg-[#caf300]/20 border-b border-border p-3 px-4 text-xs font-medium text-[#171e00] flex items-center justify-between z-10"
            >
              <span>
                <strong>Response limit reached (20/20).</strong> Conclude your
                practice session by finishing the simulation.
              </span>
              <button
                type="button"
                onClick={() => setShowFinishDialog(true)}
                className="font-bold underline uppercase ml-3 text-xs"
              >
                Finish Now
              </button>
            </div>
          )}

          {isExpired && !isLimitReached && (
            <div
              role="status"
              className="bg-alert/15 border-b border-alert p-3 px-4 text-xs font-medium text-foreground flex items-center justify-between z-10"
            >
              <span>
                <strong>Session Expired:</strong> This simulation session has
                reached its duration limit. You can still finish to generate your
                evaluation.
              </span>
              <button
                type="button"
                onClick={() => setShowFinishDialog(true)}
                className="font-bold underline uppercase ml-3 text-xs text-alert"
              >
                Finish Now
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 md:gap-8 pb-36"
            aria-live="polite"
          >
            {/* Intro Welcome Card if no turns have occurred */}
            {turnCount === 0 && !pendingTurn && (
              <div className="w-full max-w-2xl mx-auto my-auto text-center glass-surface p-6 sm:p-8 rounded-card border border-border shadow-[4px_4px_0px_0px_#1a1a1a]">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="font-meta text-xs uppercase tracking-widest text-muted-foreground bg-surface-raised px-3 py-1 rounded-full border border-border/20 font-semibold">
                    Scenario Initiated
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
                  Ready to Practice
                </h3>
                <p className="font-sans text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Start the conversation by submitting what you would say in this
                  workplace situation. Your counterpart ({counterpartRole}) will
                  respond dynamically.
                </p>
              </div>
            )}

            {/* Render Stored Conversation Turns */}
            {attempt.turns.map((turn: ConversationTurn) => (
              <div key={turn.id} className="flex flex-col gap-6 w-full">
                {/* 1. Learner Message (Right Aligned) */}
                <div className="w-full max-w-3xl ml-auto flex flex-col items-end">
                  <div className="flex items-center gap-2 mr-2 mb-1.5">
                    <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      You (Turn #{turn.sequence})
                    </span>
                    {turn.createdAt && (
                      <span className="font-meta text-[11px] text-muted-foreground/70">
                        {new Date(turn.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-white p-5 sm:p-6 md:p-8 border-2 border-border shadow-[4px_4px_0px_0px_#1a1a1a] sm:shadow-[6px_6px_0px_0px_#1a1a1a] rounded-card rounded-tr-none">
                    <p className="font-sans text-base sm:text-lg text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                      {turn.userText}
                    </p>
                  </div>
                </div>

                {/* 2. Counterpart Message (Left Aligned) */}
                {turn.status === "COMPLETED" && turn.assistantText && (
                  <div className="w-full max-w-3xl mr-auto flex flex-col items-start">
                    <div className="flex items-center gap-2 ml-2 mb-1.5">
                      <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        {counterpartRole}
                      </span>
                      {turn.completedAt && (
                        <span className="font-meta text-[11px] text-muted-foreground/70">
                          {new Date(turn.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-surface-raised/90 backdrop-blur-md p-5 sm:p-6 md:p-8 border border-border rounded-card rounded-tl-none shadow-[4px_4px_0px_0px_rgba(28,27,27,0.08)]">
                      <p className="font-sans text-base sm:text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                        {turn.assistantText}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Counterpart FAILED Turn State */}
                {turn.status === "FAILED" && (
                  <div className="w-full max-w-3xl mr-auto flex flex-col items-start">
                    <div className="flex items-center gap-2 ml-2 mb-1.5">
                      <span className="font-meta text-xs uppercase tracking-wider text-alert font-bold">
                        {counterpartRole} · Response Failed
                      </span>
                    </div>
                    <div className="w-full border-2 border-alert bg-alert/5 p-5 sm:p-6 rounded-card rounded-tl-none shadow-[4px_4px_0px_0px_#ba1a1a] flex flex-col gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-alert uppercase tracking-wide">
                          Failed to receive counterpart reply
                        </p>
                        <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-1">
                          Your message was safely recorded on the server. Click
                          below to retry the counterpart response.
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => void handleRetryTurn(turn.id)}
                          disabled={retryingTurnId === turn.id}
                          className="inline-flex items-center gap-2 rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-alert-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
                        >
                          <RefreshIcon
                            className={cn(
                              "w-3.5 h-3.5",
                              retryingTurnId === turn.id && "animate-spin",
                            )}
                          />
                          <span>
                            {retryingTurnId === turn.id
                              ? "Retrying..."
                              : "Retry Response"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 4. Optimistic Pending Learner Turn */}
            {pendingTurn && (
              <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
                {/* Learner Message rendered immediately */}
                <div className="w-full max-w-3xl ml-auto flex flex-col items-end">
                  <div className="flex items-center gap-2 mr-2 mb-1.5">
                    <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      You (Turn #{turnCount + 1})
                    </span>
                    <span className="font-meta text-[10px] text-primary uppercase font-bold">
                      Sending...
                    </span>
                  </div>
                  <div className="w-full bg-white p-5 sm:p-6 md:p-8 border-2 border-border shadow-[4px_4px_0px_0px_#1a1a1a] sm:shadow-[6px_6px_0px_0px_#1a1a1a] rounded-card rounded-tr-none">
                    <p className="font-sans text-base sm:text-lg text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                      {pendingTurn.text}
                    </p>
                  </div>
                </div>

                {/* Counterpart Pending Response Indicator */}
                {!pendingError && (
                  <div
                    className="w-full max-w-3xl mr-auto flex flex-col items-start"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground mb-1.5 ml-2 font-semibold">
                      {counterpartRole}
                    </span>
                    <div className="w-full bg-surface-raised/90 p-5 sm:p-6 border border-border rounded-card rounded-tl-none flex items-center gap-3.5 shadow-[4px_4px_0px_0px_rgba(28,27,27,0.08)]">
                      <span
                        className="inline-block h-3 w-3 animate-ping rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="font-sans text-sm sm:text-base text-muted-foreground font-medium">
                        {counterpartRole} is formulating a response...
                      </span>
                    </div>
                  </div>
                )}

                {/* Pending Send Failed (pre-creation or connection error) */}
                {pendingError && (
                  <div className="w-full max-w-3xl mr-auto flex flex-col items-start">
                    <span className="font-meta text-xs uppercase tracking-wider text-alert mb-1.5 ml-2 font-bold">
                      {counterpartRole} · Request Failed
                    </span>
                    <div className="w-full border-2 border-alert bg-alert/5 p-5 sm:p-6 rounded-card rounded-tl-none shadow-[4px_4px_0px_0px_#ba1a1a] flex flex-col gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-alert uppercase tracking-wide">
                          Failed to receive response
                        </p>
                        <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-1">
                          {pendingError}
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            void handleSendTurn(
                              pendingTurn.text,
                              pendingTurn.clientRequestId,
                            )
                          }
                          disabled={sendingTurn}
                          className="inline-flex items-center gap-2 rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-alert-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
                        >
                          <RefreshIcon
                            className={cn(
                              "w-3.5 h-3.5",
                              sendingTurn && "animate-spin",
                            )}
                          />
                          <span>
                            {sendingTurn ? "Retrying..." : "Retry Response"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 5. Sticky Bottom Text Composer */}
          <div className="absolute bottom-0 left-0 w-full glass-surface border-t border-border p-3.5 sm:p-5 z-20">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendTurn();
              }}
              className="max-w-4xl mx-auto flex items-end gap-3 sm:gap-4 relative"
            >
              {/* Text Input Area */}
              <div className="flex-1 relative flex flex-col">
                <textarea
                  ref={textareaRef}
                  aria-label="Your response"
                  value={composerText}
                  maxLength={MAX_TURN_TEXT_LENGTH}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendTurn();
                    }
                  }}
                  disabled={isComposerDisabled}
                  rows={2}
                  placeholder={
                    isLimitReached
                      ? "Turn limit reached (20/20). Finish simulation to view evaluation."
                      : isExpired
                        ? "Simulation expired. Finish simulation to evaluate."
                        : "Type what you would say... (Press Enter to send, Shift+Enter for new line)"
                  }
                  className="w-full bg-white border-2 border-border p-3.5 sm:p-4 md:p-5 font-sans text-sm sm:text-base text-foreground resize-none focus:outline-none focus:border-primary focus:ring-0 h-20 sm:h-24 md:h-28 transition-colors shadow-[4px_4px_0px_0px_#1a1a1a] rounded-control disabled:bg-surface-subtle disabled:opacity-60 placeholder:text-muted-foreground/70"
                />

                {/* Character count & Enter prompt */}
                <div className="flex items-center justify-between px-1 mt-1 font-meta text-[11px] text-muted-foreground select-none">
                  <span>
                    {composerText.length} / {MAX_TURN_TEXT_LENGTH} chars
                  </span>
                  <span className="hidden sm:inline">Press Enter to send</span>
                </div>
              </div>

              {/* Microphone Control (Visually present per Stitch design, STT not implemented yet) */}
              <button
                type="button"
                disabled
                title="Voice transcription mode will be available in an upcoming update"
                aria-label="Microphone (Push-to-Talk voice mode coming soon)"
                className="hidden sm:flex h-20 sm:h-24 md:h-28 w-20 sm:w-24 md:w-28 flex-col items-center justify-center gap-1.5 group shrink-0 rounded-control bg-surface-solid text-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] opacity-70 cursor-not-allowed select-none"
              >
                <MicIcon className="w-6 h-6 text-muted-foreground" />
                <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                  Voice Mode
                </span>
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!composerText.trim() || isComposerDisabled}
                aria-label="Send message"
                className="h-20 sm:h-24 md:h-28 px-4 sm:px-6 bg-primary text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] rounded-control flex flex-col items-center justify-center gap-1 shrink-0 brutalist-interactive disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {sendingTurn ? (
                  <>
                    <span
                      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-r-transparent"
                      aria-hidden="true"
                    />
                    <span className="font-meta text-[10px] uppercase font-bold">
                      Sending
                    </span>
                  </>
                ) : (
                  <>
                    <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="font-meta text-[10px] uppercase font-bold hidden sm:inline">
                      Send
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* 4. Finish Simulation Confirmation Modal */}
      <AccessibleDialog
        open={showFinishDialog}
        title={
          turnCount === 0 ? "Abandon Simulation?" : "Finish Simulation?"
        }
        description={
          turnCount === 0
            ? "You haven't sent any messages yet. Finishing now will mark this attempt as abandoned without generating an evaluation score."
            : "Are you ready to conclude your conversation? Your responses will be evaluated across key workplace communication skills."
        }
        onClose={() => setShowFinishDialog(false)}
      >
        <div className="flex flex-col gap-3 mt-5">
          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={finishing}
            className={cn(
              "w-full py-3 px-4 font-display text-sm font-bold uppercase tracking-wider text-white rounded-control border border-border brutalist-interactive cursor-pointer disabled:opacity-50",
              turnCount === 0
                ? "bg-alert hover:bg-alert/90"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            {finishing
              ? "Processing..."
              : turnCount === 0
                ? "Abandon Simulation"
                : "Finish & View Evaluation"}
          </button>

          <button
            type="button"
            onClick={() => setShowFinishDialog(false)}
            disabled={finishing}
            className="w-full py-2.5 px-4 font-display text-sm font-bold uppercase tracking-wider text-foreground bg-surface-solid rounded-control border border-border brutalist-interactive cursor-pointer"
          >
            {turnCount === 0 ? "Continue Session" : "Continue Practicing"}
          </button>
        </div>
      </AccessibleDialog>
    </div>
  );
}
