"use client";

import { useAuth } from "@clerk/nextjs";
import type { Difficulty, PublicScenarioDetail } from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiClientError, createApiClient } from "../../../../lib/api-client";

const DIFFICULTY_DESCRIPTIONS: Record<
  Difficulty,
  { title: string; desc: string; badgeClass: string }
> = {
  EASY: {
    title: "Easy",
    desc: "Cooperative counterpart who concedes easily to reasonable points with minimal pushback.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  MEDIUM: {
    title: "Medium (Recommended)",
    desc: "Realistic workplace counterpart who raises standard objections and challenges unsupported claims.",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  HARD: {
    title: "Hard",
    desc: "Skeptical counterpart who challenges vague reasoning firmly, tests composure, and demands structured rationale.",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

export default function ScenarioDetailPage() {
  const params = useParams();
  const scenarioKey = params.scenarioKey as string;
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [scenario, setScenario] = useState<PublicScenarioDetail | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadScenario() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const data = await client.fetchScenarioDetail(token, scenarioKey);
        if (!isMounted) return;
        setScenario(data);
        if (data.availableDifficulties.includes("MEDIUM")) {
          setSelectedDifficulty("MEDIUM");
        } else if (data.availableDifficulties[0]) {
          setSelectedDifficulty(data.availableDifficulties[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setError("Scenario not found.");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load scenario details.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadScenario();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, getToken, scenarioKey]);

  async function handleStartSimulation() {
    if (starting) return;
    try {
      setStarting(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const attempt = await client.createAttempt(token, {
        scenarioKey,
        difficulty: selectedDifficulty,
        retryOfAttemptId: null,
      });

      router.push(`/app/simulations/${encodeURIComponent(attempt.id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start simulation.",
      );
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
        <p className="mt-3 text-sm text-slate-500">
          Loading scenario briefing...
        </p>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-bold">Error</h2>
          <p className="mt-1 text-sm">{error ?? "Scenario not found."}</p>
          <div className="mt-4">
            <Link
              href="/app"
              className="inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50"
            >
              Back to Scenarios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="mb-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Scenarios
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
              {scenario.category}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              v{scenario.version}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {scenario.title}
          </h1>
          <p className="mt-2 text-base text-slate-600 leading-relaxed">
            {scenario.summary}
          </p>
        </div>

        {/* Briefing Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Context & Background
            </h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {scenario.context.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Your Role
              </span>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {scenario.context.userRole}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Counterpart (AI)
              </span>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {scenario.context.aiRole}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Your Primary Objective
            </span>
            <p className="mt-1 text-sm font-semibold text-indigo-950">
              {scenario.context.userObjective}
            </p>
            <div className="mt-2 text-xs text-indigo-800">
              <span className="font-semibold">Stakes: </span>
              {scenario.context.stakes}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Select Difficulty
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose the level of counterpart pushback and objection resistance.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {scenario.availableDifficulties.map((diff) => {
                const info = DIFFICULTY_DESCRIPTIONS[diff];
                const isSelected = selectedDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/30 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-bold text-slate-900">
                        {info.title}
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {info.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Text practice session • Max 20 turns • Evaluated upon completion
            </p>

            <button
              type="button"
              onClick={handleStartSimulation}
              disabled={starting}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {starting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent mr-2" />
                  Starting Simulation...
                </>
              ) : (
                "Begin Simulation"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
