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

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function LightbulbIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function StarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
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
        <div className="relative h-90 sm:h-100 w-full flex justify-center items-center perspective-[1000px] select-none">
          <div className="relative w-75 sm:w-85 h-55">
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
      router.push("/app");
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

  return (
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-10 font-sans pb-24">
      {/* 1. Header & Actions Bar */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/20 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <Link
              href="/app"
              className="font-meta text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Scenarios
            </Link>
            <span className="text-border/40 font-meta text-xs">/</span>
            <span className="font-meta text-xs font-bold uppercase tracking-wider text-foreground">
              {attempt.scenario.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">
              Performance & Coaching Report
            </h1>
            <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              {attempt.difficulty}
            </span>
          </div>

          <p className="font-meta text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
            <span>{attempt.turns.length} turns exchanged</span>
            <span>·</span>
            <span>
              Completed{" "}
              {new Date(evaluation.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Difficulty selector for retry */}
          <div className="flex items-center rounded-control border border-border bg-surface-subtle p-0.5">
            {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
              const currentChoice = retryDifficulty ?? attempt.difficulty;
              const isSelected = currentChoice === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setRetryDifficulty(diff)}
                  className={cn(
                    "rounded-sm px-2.5 py-1 font-meta text-xs transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {diff}
                </button>
              );
            })}
          </div>

          {/* Practice Again (Retry) CTA */}
          <button
            type="button"
            onClick={() => handlePracticeAgain()}
            disabled={retryingPractice}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon
              className={cn("w-3.5 h-3.5", retryingPractice && "animate-spin")}
            />
            <span>
              {retryingPractice ? "Starting..." : "Practice Again (Retry)"}
            </span>
          </button>

          {/* Full Transcript Toggle */}
          <button
            type="button"
            onClick={() => setShowFullTranscript((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-control border border-border bg-surface-solid px-4 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground shadow-xs brutalist-interactive cursor-pointer"
          >
            {showFullTranscript ? "Hide Transcript" : "View Transcript"}
          </button>

          {/* Delete Attempt Button */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            title="Delete Session"
            className="inline-flex items-center justify-center rounded-control border border-border bg-surface-solid p-2.5 text-muted-foreground hover:text-alert hover:border-alert brutalist-interactive cursor-pointer"
            aria-label="Delete rehearsal session"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Results Hero with Summary */}
      <section className="space-y-4 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground border border-border rounded-full px-3 py-1 bg-surface-subtle font-semibold">
            Scenario: {attempt.scenario.title}
          </span>
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground border border-border rounded-full px-3 py-1 bg-surface-subtle font-semibold">
            Difficulty: {attempt.difficulty}
          </span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
          Here&apos;s how that conversation went.
        </h2>

        <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
          {evaluation.summary}
        </p>
      </section>

      {/* 3. Main Stats Grid: Overall Score + 5 Universal Skills Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Overall Score Card */}
        <div className="glass-surface rounded-card border border-border p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a] flex flex-col justify-between relative overflow-hidden bg-primary/5">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-bold">
                Overall Score
              </span>
              <span
                className={cn(
                  "font-meta text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs",
                  overallBand.badgeClass,
                )}
              >
                {overallBand.label}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-4">
              <span className="font-display text-6xl sm:text-7xl font-bold text-primary tracking-tight">
                {evaluation.overallScore}
              </span>
              <span className="font-meta text-xl font-bold text-muted-foreground">
                / 100
              </span>
            </div>
          </div>

          <div className="relative z-10 border-t border-border/20 pt-4 space-y-3 font-meta text-xs">
            <div className="flex justify-between items-center text-foreground">
              <span>Universal Communication (70%)</span>
              <span className="font-bold">{evaluation.universalScore} / 100</span>
            </div>
            <div className="flex justify-between items-center text-foreground">
              <span>Scenario Objectives (30%)</span>
              <span className="font-bold">{evaluation.scenarioScore} / 100</span>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"
          />
        </div>

        {/* Five Universal Skills Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                className="glass-surface rounded-card border border-border p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      {meta.name}
                    </span>
                    <span
                      className={cn(
                        "font-meta text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        band.badgeClass,
                      )}
                    >
                      {band.label}
                    </span>
                  </div>

                  <div className="font-display text-2xl sm:text-3xl font-bold text-foreground my-2">
                    {score}
                  </div>

                  <p className="font-sans text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {meta.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/15">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className={cn("h-full rounded-full", band.progressClass)}
                      style={{
                        width: `${Math.min(100, Math.max(0, score))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Memphis Accent Box for grid alignment on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:flex rounded-card border border-border border-dashed p-4 items-center justify-center bg-surface-subtle/50 opacity-60"
          >
            <div className="flex flex-col items-center gap-1.5 font-meta text-[11px] text-muted-foreground text-center">
              <span className="font-bold text-foreground uppercase tracking-widest">
                SimuLab AI
              </span>
              <span>5 Core Skills Rubric</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Attempt Comparison Section (rendered for completed retry sessions) */}
      {attempt.comparison && (
        <section className="glass-surface rounded-card border border-border p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/15 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
                  Attempt Comparison
                </h2>
                {attempt.comparison.comparable ? (
                  <span className="inline-flex items-center rounded-full bg-[#d4ff00]/20 border border-border px-3 py-0.5 font-meta text-xs font-bold text-[#171e00] uppercase tracking-wider">
                    Same Difficulty ({attempt.comparison.currentDifficulty})
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 font-meta text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Cross-Difficulty ({attempt.comparison.previousDifficulty} →{" "}
                    {attempt.comparison.currentDifficulty})
                  </span>
                )}
              </div>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-1">
                {attempt.comparison.comparable
                  ? "Direct like-for-like comparison against your previous attempt at this difficulty level."
                  : "Exploratory comparison across different difficulty settings."}
              </p>
            </div>
          </div>

          {/* Non-Equivalent Alert when difficulties differ */}
          {!attempt.comparison.comparable && (
            <div className="rounded-control border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-950 space-y-1.5 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="space-y-1">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-amber-950">
                    Non-Equivalent Difficulty Comparison
                  </h3>
                  <p className="font-sans text-xs sm:text-sm leading-relaxed">
                    {attempt.comparison.nonEquivalentReason ??
                      "Previous attempt and current attempt were completed at different difficulty levels."}
                  </p>
                  <p className="font-sans text-xs text-amber-900/80 leading-relaxed pt-1">
                    Score changes across different difficulty settings do not
                    represent strict like-for-like improvement because counterpart
                    objections, resistance, and concession thresholds change.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Overall Score Delta Card */}
            <div className="rounded-card border border-border bg-surface-subtle p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Overall Score Change
                </span>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2 font-display">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {attempt.comparison.previousOverallScore}
                    </span>
                    <span className="text-base font-semibold text-muted-foreground">
                      →
                    </span>
                    <span className="text-3xl font-bold text-foreground">
                      {attempt.comparison.currentOverallScore}
                    </span>
                  </div>

                  {attempt.comparison.comparable &&
                    (() => {
                      const deltaInfo = formatDelta(
                        attempt.comparison.overallDelta,
                      );
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border shadow-2xs",
                            deltaInfo.badgeClass,
                          )}
                        >
                          <span>{deltaInfo.arrow}</span>
                          <span>{deltaInfo.text} pts</span>
                        </span>
                      );
                    })()}
                </div>
              </div>

              <p className="mt-3 font-sans text-xs text-muted-foreground border-t border-border/10 pt-2.5">
                {attempt.comparison.comparable
                  ? attempt.comparison.overallDelta > 0
                    ? "Your overall performance improved in this attempt."
                    : attempt.comparison.overallDelta < 0
                      ? "Overall score declined compared to previous attempt."
                      : "Overall score remained unchanged."
                  : "Exploratory comparison across different difficulty settings."}
              </p>
            </div>

            {/* Targeted Weak Area Progress Card (if present) */}
            {attempt.comparison.weakArea && (
              <div className="rounded-card border border-border bg-surface-subtle p-5 shadow-xs flex flex-col justify-between sm:col-span-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Previous Coaching Target Progress
                    </span>
                    {attempt.comparison.comparable && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border",
                          attempt.comparison.weakArea.improved
                            ? "bg-[#d4ff00]/20 text-[#171e00] border-border"
                            : "bg-[#ffb3b0]/30 text-[#971e26] border-border",
                        )}
                      >
                        {attempt.comparison.weakArea.improved
                          ? "✓ Goal Improved"
                          : "Needs Continued Focus"}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <h4 className="font-display text-sm font-bold text-foreground">
                        {
                          getSkillMetadata(attempt.comparison.weakArea.skill)
                            .name
                        }
                      </h4>
                      <p className="font-sans text-xs text-muted-foreground">
                        Identified as primary growth area in previous attempt.
                      </p>
                    </div>

                    <div className="flex items-baseline gap-2 font-display">
                      <span className="text-lg font-bold text-muted-foreground">
                        {attempt.comparison.weakArea.previousScore}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xl font-bold text-foreground">
                        {attempt.comparison.weakArea.currentScore}
                      </span>
                      {attempt.comparison.comparable &&
                        (() => {
                          const deltaInfo = formatDelta(
                            attempt.comparison.weakArea.delta,
                          );
                          return (
                            <span
                              className={cn(
                                "ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-meta text-xs font-bold border",
                                deltaInfo.badgeClass,
                              )}
                            >
                              {deltaInfo.text}
                            </span>
                          );
                        })()}
                    </div>
                  </div>
                </div>

                <p className="mt-3 font-sans text-xs text-muted-foreground border-t border-border/10 pt-2.5">
                  {attempt.comparison.comparable
                    ? attempt.comparison.weakArea.improved
                      ? `Successfully raised ${getSkillMetadata(attempt.comparison.weakArea.skill).name.toLowerCase()} score by ${attempt.comparison.weakArea.delta} points.`
                      : `${getSkillMetadata(attempt.comparison.weakArea.skill).name} remains a priority focus area.`
                    : `Previous attempt score was ${attempt.comparison.weakArea.previousScore} at ${attempt.comparison.previousDifficulty} difficulty.`}
                </p>
              </div>
            )}
          </div>

          {/* 5 Universal Skills Delta Breakdown */}
          <div className="overflow-hidden rounded-control border border-border bg-white shadow-xs">
            <div className="border-b border-border/20 bg-surface-subtle px-5 py-3 font-meta text-xs font-bold text-foreground uppercase tracking-wider">
              Universal Skills Comparison
            </div>
            <div className="divide-y divide-border/10">
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
                    className="flex items-center justify-between px-5 py-3 text-xs"
                  >
                    <div>
                      <div className="font-display font-bold text-foreground">
                        {meta.name}
                      </div>
                      <div className="font-sans text-[11px] text-muted-foreground">
                        {meta.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-baseline gap-1.5 font-meta text-xs">
                        <span className="font-medium text-muted-foreground">
                          {prevScore}
                        </span>
                        <span className="text-border/40">→</span>
                        <span className="font-bold text-foreground">
                          {currScore}
                        </span>
                      </div>
                      {attempt.comparison!.comparable ? (
                        <span
                          className={cn(
                            "inline-flex min-w-12 items-center justify-center rounded-full px-2 py-0.5 font-meta text-xs font-bold border shadow-2xs",
                            deltaInfo.badgeClass,
                          )}
                        >
                          {deltaInfo.text}
                        </span>
                      ) : (
                        <span className="font-meta text-[11px] text-muted-foreground">
                          Non-equivalent
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenario Objectives Comparison (if present) */}
          {attempt.comparison.objectives.length > 0 && (
            <div className="overflow-hidden rounded-control border border-border bg-white shadow-xs">
              <div className="border-b border-border/20 bg-surface-subtle px-5 py-3 font-meta text-xs font-bold text-foreground uppercase tracking-wider">
                Scenario Objectives Outcome Comparison
              </div>
              <div className="divide-y divide-border/10">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 text-xs"
                    >
                      <div className="font-display font-bold text-foreground">
                        {obj.objectiveId.replace(/_/g, " ")}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-meta text-[11px]">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 font-semibold border",
                              prevStatusInfo.badgeClass,
                            )}
                          >
                            {prevStatusInfo.label}
                          </span>
                          <span className="text-border/40">→</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 font-semibold border",
                              currStatusInfo.badgeClass,
                            )}
                          >
                            {currStatusInfo.label}
                          </span>
                        </div>

                        {attempt.comparison!.comparable && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 font-meta text-[11px] font-bold border",
                              deltaStatusInfo.badgeClass,
                            )}
                          >
                            {deltaStatusInfo.icon} {deltaStatusInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 5. Scenario Objectives Outcomes */}
      <section className="space-y-4">
        <div className="border-b border-border/20 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Scenario Objectives
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
              Assessment of specific scenario requirements and negotiation
              milestones.
            </p>
          </div>
          <span className="font-meta text-xs font-semibold text-muted-foreground">
            {evaluation.objectives.filter((o) => o.status === "ACHIEVED").length} /{" "}
            {evaluation.objectives.length} Achieved
          </span>
        </div>

        <div className="space-y-3">
          {evaluation.objectives.map((obj: ObjectiveResult) => {
            const statusInfo = formatObjectiveStatus(obj.status);
            const isAchieved = obj.status === "ACHIEVED";
            const isPartial = obj.status === "PARTIALLY_ACHIEVED";

            return (
              <div
                key={obj.objectiveId}
                className={cn(
                  "glass-surface rounded-card p-4 sm:p-5 shadow-xs border transition-all",
                  isAchieved && "border-l-4 border-l-[#d4ff00]",
                  isPartial && "border-l-4 border-l-amber-400",
                  !isAchieved && !isPartial && "border-l-4 border-l-[#ffb3b0]",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {obj.objectiveId.replace(/_/g, " ")}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border",
                        statusInfo.badgeClass,
                      )}
                    >
                      {isAchieved && <CheckIcon className="w-3 h-3 stroke-3" />}
                      {isPartial && <span className="text-xs">−</span>}
                      {!isAchieved && !isPartial && (
                        <CloseIcon className="w-3 h-3" />
                      )}
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>

                <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {obj.explanation}
                </p>

                {/* Evidence Turn References */}
                {obj.evidenceTurnIds.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/10 flex flex-wrap items-center gap-1.5">
                    <span className="font-meta text-[11px] font-semibold text-muted-foreground">
                      Evidence:
                    </span>
                    {obj.evidenceTurnIds.map((turnId) => {
                      const turn = turnMap.get(turnId);
                      return (
                        <span
                          key={turnId}
                          className="inline-flex items-center rounded-sm bg-surface-subtle px-2 py-0.5 font-meta text-[11px] font-medium text-foreground border border-border/30"
                          title={
                            turn
                              ? `You: "${turn.userText.slice(0, 70)}..."`
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
            );
          })}
        </div>
      </section>

      {/* 6. Moments That Mattered (Evidence-Linked Coaching Moments) */}
      <section className="space-y-4">
        <div className="border-b border-border/20 pb-3 flex items-center gap-2.5">
          <LightbulbIcon className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Moments That Mattered
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
              Concrete coaching feedback linked directly to your stored messages,
              with actionable alternative phrasing.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {evaluation.moments.length === 0 ? (
            <div className="glass-surface rounded-card border border-border p-8 text-center font-sans text-xs text-muted-foreground">
              No specific key moments flagged for this simulation attempt.
            </div>
          ) : (
            evaluation.moments.map((moment: CoachingMoment, idx: number) => {
              const turn = turnMap.get(moment.turnId);
              const momentInfo = formatCoachingMomentType(moment.type);
              const isStrength = moment.type === "STRENGTH";
              const isMissed = moment.type === "MISSED_OPPORTUNITY";

              return (
                <div
                  key={idx}
                  className={cn(
                    "glass-surface rounded-card p-5 sm:p-6 shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col gap-4 border transition-all",
                    isStrength && "border-l-4 border-l-[#d4ff00]",
                    isMissed && "border-l-4 border-l-[#ffb3b0]",
                    !isStrength && !isMissed && "border-l-4 border-l-primary",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-meta text-xs font-bold px-2 py-0.5 rounded-sm bg-surface-variant border border-border text-foreground">
                        Turn #{turn ? turn.sequence : "?"}
                      </span>
                      <span
                        className={cn(
                          "font-meta text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                          momentInfo.badgeClass,
                        )}
                      >
                        {momentInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* 1. What the learner said (Authoritative Real Stored Message) */}
                  <div className="space-y-1.5">
                    <span className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-bold">
                      YOU SAID:
                    </span>
                    <div className="bg-surface-subtle border border-border/30 p-3.5 rounded-control relative">
                      <p className="font-sans text-xs sm:text-sm text-foreground italic leading-relaxed whitespace-pre-wrap">
                        {turn
                          ? `"${turn.userText}"`
                          : "(Transcript excerpt preserved)"}
                      </p>
                    </div>
                  </div>

                  {/* 2. Stronger Response Suggestion */}
                  {moment.betterResponse && (
                    <div className="space-y-1.5">
                      <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                        <span>TRY THIS INSTEAD (COACHING SUGGESTION):</span>
                      </span>
                      <div className="bg-primary/5 border border-primary/40 p-3.5 rounded-control relative">
                        <p className="font-sans text-xs sm:text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                          &quot;{moment.betterResponse}&quot;
                        </p>
                        <p className="font-sans text-[11px] text-muted-foreground mt-2 border-t border-primary/20 pt-1.5">
                          A coaching recommendation to communicate your intention
                          with greater structure and assertiveness.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3. Coach's Analysis Note */}
                  <div className="pt-2 border-t border-border/15">
                    <p className="font-sans text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      <strong className="font-display uppercase tracking-wide text-foreground mr-1.5">
                        Coach Note:
                      </strong>
                      {moment.explanation}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 7. Strengths & Areas for Improvement */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Key Strengths */}
        <div className="glass-surface rounded-card border border-[#d4ff00]/40 bg-[#d4ff00]/5 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#d4ff00] text-[#171e00] border border-border flex items-center justify-center font-bold text-xs">
              ✓
            </span>
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
              Key Strengths
            </h3>
          </div>

          <div className="space-y-3">
            {evaluation.strengths.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground">
                No major strengths recorded.
              </p>
            ) : (
              evaluation.strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 rounded-control border border-border/30 p-4 shadow-2xs space-y-1.5"
                >
                  <h4 className="font-display text-xs sm:text-sm font-bold text-foreground">
                    {item.title}
                  </h4>
                  <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                    {item.explanation}
                  </p>
                  {item.turnIds.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {item.turnIds.map((turnId) => {
                        const turn = turnMap.get(turnId);
                        return (
                          <span
                            key={turnId}
                            className="inline-flex items-center rounded-sm bg-surface-subtle px-1.5 py-0.5 font-meta text-[10px] font-semibold text-foreground border border-border/20"
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

        {/* Areas for Improvement */}
        <div className="glass-surface rounded-card border border-[#ffb3b0]/40 bg-[#ffb3b0]/5 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#ffb3b0] text-[#971e26] border border-border flex items-center justify-center font-bold text-xs">
              ↑
            </span>
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
              Areas for Improvement
            </h3>
          </div>

          <div className="space-y-3">
            {evaluation.improvements.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground">
                No major improvement areas recorded.
              </p>
            ) : (
              evaluation.improvements.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 rounded-control border border-border/30 p-4 shadow-2xs space-y-1.5"
                >
                  <h4 className="font-display text-xs sm:text-sm font-bold text-foreground">
                    {item.title}
                  </h4>
                  <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                    {item.explanation}
                  </p>
                  {item.turnIds.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {item.turnIds.map((turnId) => {
                        const turn = turnMap.get(turnId);
                        return (
                          <span
                            key={turnId}
                            className="inline-flex items-center rounded-sm bg-surface-subtle px-1.5 py-0.5 font-meta text-[10px] font-semibold text-foreground border border-border/20"
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

      {/* 8. Recommended Next Focus Area */}
      <section className="glass-surface rounded-card border-2 border-primary bg-primary/5 p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                <StarIcon className="w-3.5 h-3.5" />
              </span>
              <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary">
                Recommended Next Focus Area
              </span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              {getSkillMetadata(evaluation.nextFocus.skill).name}
            </h3>

            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {evaluation.nextFocus.reason}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handlePracticeAgain()}
            disabled={retryingPractice}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer disabled:opacity-50"
          >
            <span>Practice This Focus</span>
          </button>
        </div>
      </section>

      {/* 9. Full Conversation Transcript Viewer (Toggleable) */}
      {showFullTranscript && (
        <section className="glass-surface rounded-card border border-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border/20 pb-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
                Full Conversation Transcript
              </h2>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                Review every turn exchanged during this rehearsal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullTranscript(false)}
              className="font-meta text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-sm px-2.5 py-1"
            >
              Close
            </button>
          </div>

          <div className="space-y-4">
            {attempt.turns.map((turn) => {
              const isCitedInMoments = evaluation.moments.some(
                (m) => m.turnId === turn.id,
              );
              return (
                <div
                  key={turn.id}
                  className={cn(
                    "rounded-control border p-4 text-xs sm:text-sm space-y-3",
                    isCitedInMoments
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/20 bg-surface-subtle/50",
                  )}
                >
                  <div className="flex items-center justify-between font-meta text-[11px] text-muted-foreground font-semibold">
                    <span className="text-primary font-bold">
                      Turn #{turn.sequence}
                    </span>
                    {isCitedInMoments && (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 font-bold">
                        Cited in Coaching
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-foreground">You: </span>
                    <span className="text-foreground/90 whitespace-pre-wrap">
                      {turn.userText}
                    </span>
                  </div>

                  {turn.assistantText && (
                    <div className="pt-3 border-t border-border/15">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-foreground">
                            Counterpart:{" "}
                          </span>
                          <span className="text-foreground/90 whitespace-pre-wrap">
                            {turn.assistantText}
                          </span>
                        </div>
                        <SpeechButton attemptId={attemptId} turnId={turn.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
              <span className="flex h-10 w-10 items-center justify-center rounded-control bg-alert/10 text-alert border border-alert/20 text-lg">
                ⚠️
              </span>
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  {attempt.scenario.title}
                </p>
                <p className="font-meta text-xs text-muted-foreground">
                  {attempt.difficulty} Difficulty · {attempt.turns.length} turns
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="rounded-control border border-alert/30 bg-alert/10 p-3 font-sans text-xs text-alert"
              >
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
                className="rounded-control border border-border bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAttempt}
                disabled={deleteLoading}
                className="rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
