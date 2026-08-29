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

import { ApiClientError, createApiClient } from "../../../../lib/api-client";
import {
  formatCoachingMomentType,
  formatDelta,
  formatObjectiveDeltaStatus,
  formatObjectiveStatus,
  getScoreBand,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "../../../../lib/score-utils";

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
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
        <p className="mt-3 text-sm text-slate-500">
          Loading attempt results...
        </p>
      </div>
    );
  }

  // 2. Evaluating in Progress State
  if (evaluating) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-r-transparent" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
            Evaluating Simulation Performance
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Our AI coach is analyzing your conversation across the 5 universal
            communication skills, assessing scenario objectives, and identifying
            evidence-linked moments.
          </p>

          <div className="mt-8 space-y-2 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-2.5 text-xs text-indigo-900 bg-indigo-50/60 rounded-lg p-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <span>
                Analyzing Clarity, Assertiveness, Empathy, Structure &
                Conciseness
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-indigo-900 bg-indigo-50/60 rounded-lg p-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <span>
                Checking objective completion and negotiation milestones
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-indigo-900 bg-indigo-50/60 rounded-lg p-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <span>Extracting high-impact moments and stronger phrasing</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Evaluation Failed State / Recovery
  if (
    attempt?.status === "EVALUATION_FAILED" ||
    (error && !attempt?.evaluation)
  ) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-xs text-rose-900">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h2 className="text-base font-bold">Evaluation Incomplete</h2>
              <p className="mt-1 text-sm text-rose-800">
                {error ??
                  "The automated evaluation encountered an unexpected issue while analyzing the simulation."}
              </p>
              <p className="mt-2 text-xs text-rose-700">
                Your conversation transcript is safely preserved. You can retry
                generating the evaluation without losing any data.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetryEvaluation}
                  disabled={evaluating}
                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
                >
                  {evaluating ? "Evaluating..." : "Retry Evaluation"}
                </button>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                >
                  Return to Scenarios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Abandoned State (0 turns)
  if (attempt?.status === "ABANDONED") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <span className="text-3xl">⏹️</span>
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            Simulation Ended Early
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This simulation was ended before substantive conversation messages
            were exchanged, so an evaluation was not generated.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => handlePracticeAgain()}
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Start New Simulation
            </button>
            <Link
              href="/app"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 text-lg">
                ⚠️
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete This Rehearsal Session?
                </h3>
                <p className="text-xs text-slate-500">
                  {attempt.scenario.title} ({attempt.difficulty})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete this rehearsal session, its
              conversation messages, and its evaluation data. Subsequent retry
              attempts will remain safely preserved.
            </p>

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
        </div>
      )}
    </div>
  );
}
