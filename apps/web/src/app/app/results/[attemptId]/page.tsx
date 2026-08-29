"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  AttemptDetailResponse,
  CoachingMoment,
  ConversationTurn,
  Difficulty,
  EvaluationData,
  ObjectiveDelta,
  ObjectiveResult,
} from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AccessibleDialog } from "../../../../components/accessible-dialog";
import { ApiClientError, createApiClient } from "../../../../lib/api-client";
import { SpeechButton } from "../../../../components/speech-button";
import { cn } from "@/lib/cn";
import {
  formatCoachingMomentType,
  formatDelta,
  formatObjectiveDeltaStatus,
  formatObjectiveStatus,
  getScoreBand,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "../../../../lib/score-utils";

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

interface EvaluationProcessingViewProps {
  scenarioTitle: string;
  difficulty: string;
  latestUserTurnText?: string | undefined;
}

function EvaluationProcessingView({
  scenarioTitle,
  difficulty,
  latestUserTurnText,
}: EvaluationProcessingViewProps) {
  const [cardStep, setCardStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCardStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stackCards = [
    {
      id: "transcript",
      header: "TRANSCRIPT EXCERPT",
      title: "Recent Conversation Moment",
      content:
        latestUserTurnText ||
        "Based on the scope of the role and the experience I'm bringing, I'd like to explore whether there's flexibility in the compensation.",
      isQuote: true,
    },
    {
      id: "skills",
      header: "UNIVERSAL SKILLS",
      title: "Analyzing Communication Structure",
      content:
        "Evaluating clarity, assertiveness, empathy, structured reasoning, and conciseness across exchanged turns.",
      isQuote: false,
    },
    {
      id: "objectives",
      header: "SCENARIO OBJECTIVES",
      title: "Reviewing Conversation Evidence",
      content:
        "Verifying whether workplace objectives were achieved and assessing responses to counterpart objections.",
      isQuote: false,
    },
    {
      id: "coaching",
      header: "EVIDENCE-BASED COACHING",
      title: "Synthesizing High-Impact Moments",
      content:
        "Highlighting conversation strengths, moments for improvement, and tailored phrasing for future practice.",
      isQuote: false,
    },
  ];

  const layerClasses: Record<number, string> = {
    1: "translate-y-0 scale-100 z-40 opacity-100 bg-white border-2 border-border shadow-[4px_4px_0px_0px_#1a1a1a]",
    2: "translate-y-4 scale-95 z-30 opacity-85 bg-surface-raised/90 border border-border shadow-xs",
    3: "translate-y-8 scale-90 z-20 opacity-65 bg-surface-raised/80 border border-border/80",
    4: "translate-y-12 scale-85 z-10 opacity-40 bg-surface-raised/60 border border-border/60",
  };

  return (
    <div className="w-full pb-16">
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 py-3 rounded-t-card shadow-xs mb-8">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            SimuLab AI
          </span>
          <span className="text-border/40 font-meta text-xs">·</span>
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {scenarioTitle} · {difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            Evaluating
          </span>
        </div>
      </div>

      {/* Main Grid: Left Status + Right 3D Card Stack */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center px-4 sm:px-6">
        {/* Left Column: Copy & Milestones */}
        <div className="flex flex-col gap-6 relative">
          {/* Memphis Decorative Shapes */}
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-primary absolute -top-4 -left-4 -z-10 opacity-70"
          />
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-control bg-[#d4ff00] border border-border rotate-45 absolute top-0 right-8 -z-10 shadow-[2px_2px_0px_0px_#1a1a1a]"
          />
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full border-2 border-[#b8373b] absolute -bottom-3 right-2 -z-10 opacity-30"
          />

          <div className="flex flex-col gap-3">
            <span className="font-meta text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Simulation Complete
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15] relative z-10">
              Let&apos;s look at how that went.
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
              We&apos;re reviewing your conversation and preparing
              evidence-based coaching from the moments that mattered.
            </p>
          </div>

          {/* Semantic Deterministic Milestone List */}
          <div className="flex flex-col gap-3.5 mt-2 select-none">
            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full bg-[#d4ff00] border border-border flex items-center justify-center text-[#171e00] shrink-0 shadow-[1px_1px_0px_0px_#1a1a1a]">
                <CheckIcon className="w-3 h-3 stroke-3" />
              </div>
              <span className="font-sans text-sm font-medium text-foreground">
                Conversation complete
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full bg-primary border border-primary flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(0,82,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
              <span className="font-sans text-sm font-bold text-foreground">
                Reviewing communication
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full border-2 border-border/30 bg-surface-subtle shrink-0" />
              <span className="font-sans text-sm font-medium text-muted-foreground">
                Connecting feedback to key moments
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full border-2 border-border/30 bg-surface-subtle shrink-0" />
              <span className="font-sans text-sm font-medium text-muted-foreground">
                Preparing your coaching
              </span>
            </div>
          </div>

          {/* Skills Preview */}
          <div className="mt-2 pt-4 border-t border-dashed border-border/30">
            <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground block mb-2.5 font-semibold">
              Analyzing Skills
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Clarity",
                "Assertiveness",
                "Empathy",
                "Structure",
                "Conciseness",
              ].map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-surface-subtle rounded-full border border-border/30 font-meta text-xs font-medium text-foreground uppercase tracking-wider shadow-2xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Layered 3D Card Stack */}
        <div className="relative h-[360px] sm:h-[400px] w-full flex justify-center items-center perspective-[1000px] select-none">
          <div className="relative w-[300px] sm:w-[340px] h-[220px]">
            {stackCards.map((card, i) => {
              const layer = ((i - cardStep + 4) % 4) + 1;
              const isFront = layer === 1;

              return (
                <div
                  key={card.id}
                  className={cn(
                    "absolute inset-0 rounded-card p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 ease-in-out",
                    layerClasses[layer] ?? layerClasses[4],
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-dashed border-border/20 pb-2 mb-3">
                      <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                        {card.header}
                      </span>
                      {isFront && (
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <h4 className="font-display text-sm sm:text-base font-bold uppercase tracking-tight text-foreground mb-1.5 line-clamp-1">
                      {card.title}
                    </h4>
                    <p
                      className={cn(
                        "font-sans text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-4",
                        card.isQuote && "italic text-foreground font-medium",
                      )}
                    >
                      {card.isQuote ? `"${card.content}"` : card.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/10 flex items-center justify-between font-meta text-[10px] text-muted-foreground">
                    <span>SimuLab AI Evaluator</span>
                    <span>Step {((cardStep + i) % 4) + 1}/4</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Reassurance Card */}
      <div className="w-full max-w-4xl mt-12 sm:mt-16 mx-auto px-4">
        <div className="glass-surface p-5 sm:p-6 rounded-card border border-border flex items-start gap-4 mx-auto max-w-md shadow-xs">
          <ShieldCheckIcon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
              Your conversation is saved.
            </h4>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
              You can safely leave this page and return to your results later from
              your session history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EvaluationFailureViewProps {
  error: string | null;
  attemptId: string;
  onRetry: () => void;
  retrying: boolean;
}

function EvaluationFailureView({
  error,
  attemptId,
  onRetry,
  retrying,
}: EvaluationFailureViewProps) {
  return (
    <div className="w-full py-12 max-w-2xl mx-auto px-4">
      <div
        role="alert"
        className="glass-surface rounded-card p-6 sm:p-10 text-center border-2 border-alert bg-alert/5 shadow-[6px_6px_0px_0px_#1a1a1a] flex flex-col items-center"
      >
        <div className="w-12 h-12 rounded-full bg-alert/20 text-alert border border-border flex items-center justify-center mb-4 shadow-2xs">
          <AlertTriangleIcon className="w-6 h-6 text-alert" />
        </div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
          Evaluation Incomplete
        </h2>
        <p className="font-sans text-sm sm:text-base text-muted-foreground mb-3 max-w-md leading-relaxed">
          {error ??
            "The automated evaluation encountered an unexpected issue while analyzing the simulation."}
        </p>
        <p className="font-sans text-xs text-muted-foreground/80 mb-6 max-w-md leading-relaxed">
          Your conversation transcript is safely preserved on the server. You can
          retry generating your evaluation without losing any practice data.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          {/* 1. Retry Evaluation */}
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon
              className={cn("w-3.5 h-3.5", retrying && "animate-spin")}
            />
            <span>{retrying ? "Evaluating..." : "Retry Evaluation"}</span>
          </button>

          {/* 2. View Conversation */}
          <Link
            href={`/app/simulations/${encodeURIComponent(attemptId)}`}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface-solid px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground border border-border brutalist-interactive"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>View Conversation</span>
          </Link>

          {/* 3. Return Home */}
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface-subtle px-4 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground border border-border/40"
          >
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [attempt, setAttempt] = useState<AttemptDetailResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingPractice, setRetryingPractice] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [retryDifficulty, setRetryDifficulty] = useState<Difficulty | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const turnMap = useMemo(() => {
    const map = new Map<string, ConversationTurn>();
    if (attempt?.turns) {
      for (const turn of attempt.turns) {
        map.set(turn.id, turn);
      }
    }
    return map;
  }, [attempt]);

  useEffect(() => {
    let isMounted = true;

    async function loadAndEvaluate() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);

        const data = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;
        setAttempt(data);

        if (
          (data.status === "EVALUATING" || !data.evaluation) &&
          data.status !== "ABANDONED" &&
          data.status !== "ACTIVE"
        ) {
          setEvaluating(true);
          try {
            const evalResult = await client.evaluateAttempt(token, attemptId);
            const refreshed = await client
              .fetchAttempt(token, attemptId)
              .catch(() => null);

            if (!isMounted) return;
            if (refreshed) {
              setAttempt(refreshed);
            } else {
              setAttempt((prev) =>
                prev
                  ? {
                      ...prev,
                      status: "COMPLETED",
                      evaluation: evalResult,
                    }
                  : prev,
              );
            }
          } catch (evalErr) {
            if (!isMounted) return;
            setError(
              evalErr instanceof Error
                ? evalErr.message
                : "Evaluation could not be completed.",
            );
            const refreshed = await client
              .fetchAttempt(token, attemptId)
              .catch(() => null);
            if (refreshed && isMounted) setAttempt(refreshed);
          } finally {
            if (isMounted) setEvaluating(false);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setError("Simulation attempt not found.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load attempt.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadAndEvaluate();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, getToken, attemptId]);

  const handleRetryEvaluation = async () => {
    try {
      setEvaluating(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const evalResult = await client.evaluateAttempt(token, attemptId);
      const refreshed = await client
        .fetchAttempt(token, attemptId)
        .catch(() => null);

      if (refreshed) {
        setAttempt(refreshed);
      } else {
        setAttempt((prev) =>
          prev
            ? {
                ...prev,
                status: "COMPLETED",
                evaluation: evalResult,
              }
            : prev,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Evaluation failed on retry.",
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handlePracticeAgain = async (customDifficulty?: Difficulty) => {
    if (!attempt || retryingPractice) return;
    try {
      setRetryingPractice(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const targetDifficulty =
        customDifficulty ?? retryDifficulty ?? attempt.difficulty;

      const newAttempt = await client.createAttempt(token, {
        scenarioKey: attempt.scenario.key,
        difficulty: targetDifficulty,
        retryOfAttemptId: attempt.id,
      });

      router.push(`/app/simulations/${encodeURIComponent(newAttempt.id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start retry session.",
      );
      setRetryingPractice(false);
    }
  };

  const handleDeleteAttempt = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      await client.deleteAttempt(token, attemptId);
      router.push("/app/history");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete attempt.",
      );
      setDeleteLoading(false);
    }
  };

  // 1. Initial Loading State
  if (loading && !attempt) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center max-w-2xl mx-auto px-4">
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
            Loading Evaluation Workspace
          </h2>
          <p className="font-sans text-sm text-muted-foreground max-w-sm">
            Retrieving simulation attempt and coaching records...
          </p>
        </div>
      </div>
    );
  }

  // 2. Evaluating in Progress State (Stitch Branded Loading UI)
  if (
    evaluating ||
    (attempt?.status === "EVALUATING" && !attempt?.evaluation)
  ) {
    const lastUserTurn = attempt?.turns
      ? [...attempt.turns].reverse().find((t) => t.userText)?.userText
      : undefined;

    return (
      <EvaluationProcessingView
        scenarioTitle={attempt?.scenario.title ?? "Simulation"}
        difficulty={attempt?.difficulty ?? "MEDIUM"}
        latestUserTurnText={lastUserTurn}
      />
    );
  }

  // 3. Evaluation Failed State / Recoverable Failure UI
  if (
    attempt?.status === "EVALUATION_FAILED" ||
    (error && !attempt?.evaluation)
  ) {
    return (
      <EvaluationFailureView
        error={error}
        attemptId={attemptId}
        onRetry={handleRetryEvaluation}
        retrying={evaluating}
      />
    );
  }

  // 4. Abandoned State (0 turns)
  if (attempt?.status === "ABANDONED") {
    return (
      <div className="w-full py-12 max-w-xl mx-auto px-4 text-center">
        <div className="glass-surface rounded-card p-8 border border-border shadow-[6px_6px_0px_0px_#1a1a1a]">
          <span className="text-3xl block mb-2">⏹️</span>
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground mb-2">
            Simulation Ended Early
          </h2>
          <p className="font-sans text-sm text-muted-foreground mb-6 leading-relaxed">
            This simulation was ended before substantive conversation messages
            were exchanged, so an evaluation was not generated.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => handlePracticeAgain()}
              className="inline-flex items-center rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer"
            >
              Start New Simulation
            </button>
            <Link
              href="/app"
              className="inline-flex items-center rounded-control border border-border bg-surface-solid px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground brutalist-interactive"
            >
              All Scenarios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const evaluation: EvaluationData | null = attempt?.evaluation ?? null;
  if (!attempt || !evaluation) return null;

  const overallBand = getScoreBand(evaluation.overallScore);
  const universalBand = getScoreBand(evaluation.universalScore);
  const scenarioBand = getScoreBand(evaluation.scenarioScore);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Scenarios
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/app/history"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              History
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-900">
              {attempt.scenario.title}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Simulation Results & Coaching
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
              {attempt.difficulty} Difficulty
            </span>
            <span>•</span>
            <span>{attempt.turns.length} turns exchanged</span>
            <span>•</span>
            <span>
              Completed{" "}
              {new Date(evaluation.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
              const currentChoice = retryDifficulty ?? attempt.difficulty;
              const isSelected = currentChoice === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setRetryDifficulty(diff)}
                  className={`rounded-lg px-2.5 py-1.5 transition ${
                    isSelected
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handlePracticeAgain()}
            disabled={retryingPractice}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {retryingPractice ? "Starting..." : "Practice Again (Retry)"}
          </button>
          <Link
            href="/app/progress"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            View Progress
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            title="Delete Session"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 1. Overall Score & Deterministic Formula Banner */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-12 md:items-center">
          {/* Big Score Column */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overall Performance
            </span>
            <div className="mt-3 flex items-baseline justify-center gap-1">
              <span
                className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${overallBand.textClass}`}
              >
                {evaluation.overallScore}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 100</span>
            </div>
            <span
              className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${overallBand.badgeClass}`}
            >
              {overallBand.label}
            </span>
          </div>

          {/* Formula & Summary Column */}
          <div className="md:col-span-8 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Executive Coaching Summary
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {evaluation.summary}
              </p>
            </div>

            {/* Deterministic Formula Breakdown */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 mb-2">
                <span>Deterministic Score Calculation</span>
                <span className="font-mono text-[11px] text-slate-500">
                  70% Skills + 30% Objectives
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                  <div className="text-slate-500">Universal Skills (70%)</div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {evaluation.universalScore} / 100
                    <span className="ml-1 text-[11px] font-normal text-slate-500">
                      ({universalBand.label})
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                  <div className="text-slate-500">
                    Scenario Objectives (30%)
                  </div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {evaluation.scenarioScore} / 100
                    <span className="ml-1 text-[11px] font-normal text-slate-500">
                      ({scenarioBand.label})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Attempt Comparison (when attempt was a retry and comparison is available) */}
      {attempt.comparison && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Attempt Comparison
                </h2>
                {attempt.comparison.comparable ? (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    Same Difficulty ({attempt.comparison.currentDifficulty})
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Cross-Difficulty Notice (
                    {attempt.comparison.previousDifficulty} →{" "}
                    {attempt.comparison.currentDifficulty})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {attempt.comparison.comparable
                  ? "Direct comparison against your previous attempt at this difficulty level."
                  : "Exploratory comparison across different difficulty settings."}
              </p>
            </div>
          </div>

          {/* Non-Equivalent Alert when difficulties differ */}
          {!attempt.comparison.comparable && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-900 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-950">
                    Non-Equivalent Difficulty Comparison
                  </h3>
                  <p className="leading-relaxed">
                    {attempt.comparison.nonEquivalentReason}
                  </p>
                  <p className="text-amber-800/90 text-[11px] leading-relaxed">
                    Score changes across different difficulty settings do not
                    represent strict like-for-like improvement because AI
                    objections, resistance, and concession thresholds change.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Overall Score Delta Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Overall Score Change
                </span>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-400">
                      {attempt.comparison.previousOverallScore}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                      →
                    </span>
                    <span className="text-3xl font-extrabold text-slate-900">
                      {attempt.comparison.currentOverallScore}
                    </span>
                  </div>
                  {(() => {
                    const deltaInfo = formatDelta(
                      attempt.comparison.overallDelta,
                    );
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${deltaInfo.badgeClass}`}
                      >
                        <span>{deltaInfo.arrow}</span>
                        <span>{deltaInfo.text} pts</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                {attempt.comparison.overallDelta > 0
                  ? "Your overall performance improved in this attempt."
                  : attempt.comparison.overallDelta < 0
                    ? "Overall score declined compared to previous attempt."
                    : "Overall score remained unchanged."}
              </p>
            </div>

            {/* Targeted Weak Area Progress Card */}
            {attempt.comparison.weakArea && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between sm:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Previous Coaching Target Progress
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${
                        attempt.comparison.weakArea.improved
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {attempt.comparison.weakArea.improved
                        ? "✓ Goal Improved"
                        : "Needs Continued Focus"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {
                          getSkillMetadata(attempt.comparison.weakArea.skill)
                            .name
                        }
                      </h4>
                      <p className="text-xs text-slate-500">
                        Identified as primary growth area in previous session.
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-400">
                        {attempt.comparison.weakArea.previousScore}
                      </span>
                      <span className="text-xs text-slate-400">→</span>
                      <span className="text-xl font-extrabold text-slate-900">
                        {attempt.comparison.weakArea.currentScore}
                      </span>
                      {(() => {
                        const deltaInfo = formatDelta(
                          attempt.comparison.weakArea.delta,
                        );
                        return (
                          <span
                            className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold border ${deltaInfo.badgeClass}`}
                          >
                            {deltaInfo.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                  {attempt.comparison.weakArea.improved
                    ? `Successfully raised ${getSkillMetadata(attempt.comparison.weakArea.skill).name.toLowerCase()} score by ${attempt.comparison.weakArea.delta} points.`
                    : `${getSkillMetadata(attempt.comparison.weakArea.skill).name} remains a priority growth area.`}
                </p>
              </div>
            )}
          </div>

          {/* 5 Skills Delta Breakdown */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs font-bold text-slate-700">
              Universal Skills Delta Comparison
            </div>
            <div className="divide-y divide-slate-100">
              {(
                [
                  "clarity",
                  "assertiveness",
                  "empathy",
                  "structure",
                  "conciseness",
                ] as const
              ).map((skillKey) => {
                const prevScore = attempt.comparison!.previousSkills[skillKey];
                const currScore = attempt.comparison!.currentSkills[skillKey];
                const delta = attempt.comparison!.skillDeltas[skillKey];
                const deltaInfo = formatDelta(delta);
                const meta =
                  UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);

                return (
                  <div
                    key={skillKey}
                    className="flex items-center justify-between px-5 py-3.5 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {meta.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {meta.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-baseline gap-1.5 text-xs text-slate-600">
                        <span className="font-medium text-slate-400">
                          {prevScore}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="font-bold text-slate-900">
                          {currScore}
                        </span>
                      </div>
                      <span
                        className={`inline-flex min-w-14 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold border ${deltaInfo.badgeClass}`}
                      >
                        {deltaInfo.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objectives Delta Breakdown */}
          {attempt.comparison.objectives.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 text-xs font-bold text-slate-700">
                Scenario Objectives Outcome Changes
              </div>
              <div className="divide-y divide-slate-100">
                {attempt.comparison.objectives.map((obj: ObjectiveDelta) => {
                  const prevStatusInfo = formatObjectiveStatus(
                    obj.previousStatus,
                  );
                  const currStatusInfo = formatObjectiveStatus(
                    obj.currentStatus,
                  );
                  const deltaStatusInfo = formatObjectiveDeltaStatus(
                    obj.statusChanged,
                  );

                  return (
                    <div
                      key={obj.objectiveId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 text-xs"
                    >
                      <div className="font-bold text-slate-900">
                        {obj.objectiveId.replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${prevStatusInfo.badgeClass}`}
                          >
                            {prevStatusInfo.label}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${currStatusInfo.badgeClass}`}
                          >
                            {currStatusInfo.label}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${deltaStatusInfo.badgeClass}`}
                        >
                          {deltaStatusInfo.icon} {deltaStatusInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. Universal Communication Skills Breakdown (5 Skills) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Universal Communication Skills
          </h2>
          <p className="text-xs text-slate-500">
            Core competencies evaluated across all workplace communication
            scenarios.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              "clarity",
              "assertiveness",
              "empathy",
              "structure",
              "conciseness",
            ] as const
          ).map((skillKey) => {
            const score = evaluation.skills[skillKey];
            const band = getScoreBand(score);
            const meta =
              UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);

            return (
              <div
                key={skillKey}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {meta.name}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${band.badgeClass}`}
                    >
                      {band.label}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Proficiency</span>
                    <span className="font-bold text-slate-900">
                      {score} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${band.progressClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Recommended Next Focus */}
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                ★
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Recommended Next Focus Area
              </h3>
            </div>
            <p className="mt-2 text-base font-bold text-indigo-950">
              {getSkillMetadata(evaluation.nextFocus.skill).name}
            </p>
            <p className="mt-1 text-xs text-indigo-900/90 leading-relaxed max-w-2xl">
              {evaluation.nextFocus.reason}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handlePracticeAgain()}
            disabled={retryingPractice}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            Practice This Skill
          </button>
        </div>
      </section>

      {/* 4. Scenario Objectives */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Scenario Objectives
          </h2>
          <p className="text-xs text-slate-500">
            Outcomes achieved against specific scenario requirements.
          </p>
        </div>

        <div className="space-y-3">
          {evaluation.objectives.map((obj: ObjectiveResult) => {
            const statusInfo = formatObjectiveStatus(obj.status);
            return (
              <div
                key={obj.objectiveId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusInfo.dotClass}`}
                    />
                    <h3 className="text-sm font-bold text-slate-900">
                      {obj.objectiveId.replace(/_/g, " ")}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {obj.explanation}
                  </p>

                  {/* Evidence Turn References */}
                  {obj.evidenceTurnIds.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Evidence:
                      </span>
                      {obj.evidenceTurnIds.map((turnId) => {
                        const turn = turnMap.get(turnId);
                        return (
                          <span
                            key={turnId}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            title={
                              turn
                                ? `You said: "${turn.userText.slice(0, 80)}..."`
                                : undefined
                            }
                          >
                            Turn #{turn ? turn.sequence : "?"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Key Strengths & Areas for Improvement */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
              ✓
            </span>
            <h2 className="text-sm font-bold text-emerald-950">
              Key Strengths
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            {evaluation.strengths.length === 0 ? (
              <p className="text-xs text-slate-500">
                No major strengths recorded.
              </p>
            ) : (
              evaluation.strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-100 bg-white p-4 shadow-2xs"
                >
                  <h3 className="text-xs font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.explanation}
                  </p>
                  {item.turnIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.turnIds.map((turnId) => {
                        const turn = turnMap.get(turnId);
                        return (
                          <span
                            key={turnId}
                            className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200"
                          >
                            Turn #{turn ? turn.sequence : "?"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Improvements */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">
              ↑
            </span>
            <h2 className="text-sm font-bold text-amber-950">
              Areas for Improvement
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            {evaluation.improvements.length === 0 ? (
              <p className="text-xs text-slate-500">
                No major improvement areas recorded.
              </p>
            ) : (
              evaluation.improvements.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-100 bg-white p-4 shadow-2xs"
                >
                  <h3 className="text-xs font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.explanation}
                  </p>
                  {item.turnIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.turnIds.map((turnId) => {
                        const turn = turnMap.get(turnId);
                        return (
                          <span
                            key={turnId}
                            className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200"
                          >
                            Turn #{turn ? turn.sequence : "?"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. Evidence-Linked Coaching Moments & Stronger Responses */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Key Conversation Moments & Stronger Phrasing
          </h2>
          <p className="text-xs text-slate-500">
            Concrete feedback linked directly to your stored messages, with
            actionable alternative phrasing.
          </p>
        </div>

        <div className="space-y-5">
          {evaluation.moments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No specific key moments flagged for this attempt.
            </div>
          ) : (
            evaluation.moments.map((moment: CoachingMoment, idx: number) => {
              const turn = turnMap.get(moment.turnId);
              const momentInfo = formatCoachingMomentType(moment.type);

              return (
                <div
                  key={idx}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-xs ${momentInfo.cardBorderClass}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${momentInfo.badgeClass}`}
                      >
                        {momentInfo.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        Turn #{turn ? turn.sequence : "?"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* What the learner said (from actual database turn) */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        What You Said:
                      </span>
                      <blockquote className="mt-1.5 rounded-xl border-l-4 border-indigo-600 bg-slate-50 p-3.5 text-xs italic text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {turn
                          ? `"${turn.userText}"`
                          : "(Turn text unavailable)"}
                      </blockquote>
                    </div>

                    {/* Coach's Analysis */}
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Coach&apos;s Feedback:
                      </span>
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                        {moment.explanation}
                      </p>
                    </div>

                    {/* Stronger Response Example if available */}
                    {moment.betterResponse && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                          <span>💡</span>
                          <span>Stronger Alternative Phrasing:</span>
                        </div>
                        <p className="mt-1.5 text-xs text-indigo-950 leading-relaxed font-medium whitespace-pre-wrap">
                          &quot;{moment.betterResponse}&quot;
                        </p>
                        <p className="mt-2 text-[11px] text-indigo-700/80">
                          Preserves your original intention while articulating
                          the point with greater structure and assertiveness.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 7. Full Conversation Transcript Viewer (Toggleable) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Full Conversation Transcript
            </h2>
            <p className="text-xs text-slate-500">
              Review every turn exchanged during this rehearsal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFullTranscript((prev) => !prev)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showFullTranscript ? "Hide Transcript" : "View Transcript"}
          </button>
        </div>

        {showFullTranscript && (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
            {attempt.turns.map((turn) => {
              const isCitedInMoments = evaluation.moments.some(
                (m) => m.turnId === turn.id,
              );
              return (
                <div
                  key={turn.id}
                  className={`rounded-xl border p-4 text-xs space-y-2 ${
                    isCitedInMoments
                      ? "border-indigo-200 bg-indigo-50/20"
                      : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span className="text-indigo-700">
                      Turn #{turn.sequence}
                    </span>
                    {isCitedInMoments && (
                      <span className="rounded bg-indigo-100 text-indigo-800 px-1.5 py-0.5 text-[10px]">
                        Cited in Coaching
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">You: </span>
                    <span className="text-slate-900 whitespace-pre-wrap">
                      {turn.userText}
                    </span>
                  </div>

                  {turn.assistantText && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700">
                        Counterpart:{" "}
                      </span>
                      <span className="text-slate-800 whitespace-pre-wrap">
                        {turn.assistantText}
                      </span>
                      <SpeechButton attemptId={attemptId} turnId={turn.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <AccessibleDialog
        open={showDeleteModal}
        title="Delete this rehearsal session?"
        description="This permanently deletes this rehearsal session, its conversation messages, and evaluation data. Later retry attempts remain preserved."
        onClose={() => {
          if (!deleteLoading) {
            setShowDeleteModal(false);
            setDeleteError(null);
          }
        }}
      >
        {showDeleteModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 text-lg">
                ⚠️
              </span>
              <div>
                <p className="text-xs text-slate-500">
                  {attempt.scenario.title} ({attempt.difficulty})
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAttempt}
                disabled={deleteLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
