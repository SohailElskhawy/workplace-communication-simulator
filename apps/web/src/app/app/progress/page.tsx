"use client";

import { useAuth } from "@clerk/nextjs";
import type { ProgressData } from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { createApiClient } from "../../../lib/api-client";
import {
  getScoreBand,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "../../../lib/score-utils";

export default function ProgressPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const reloadProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const data = await client.fetchProgress(token);
      setProgress(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load skill progress.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!isLoaded || !isSignedIn) return;
      try {
        setLoading(true);
        setError(null);

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const data = await client.fetchProgress(token);
        if (!isMounted) return;

        setProgress(data);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load skill progress.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, getToken, isLoaded, isSignedIn]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Skills Profile & Growth
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Communication Progress
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Deterministic competency profile calculated from your latest up to 5
            eligible practice simulations (sessions with 3+ substantive dialogue
            turns).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            Start Practice
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">Unable to load progress</h2>
              <p className="mt-1 text-xs text-rose-800">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => reloadProgress()}
              className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-500"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !progress && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs animate-pulse space-y-4">
            <div className="h-4 w-1/4 bg-slate-200 rounded" />
            <div className="h-8 w-1/2 bg-slate-200 rounded" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State: 0 Eligible Sessions */}
      {!loading &&
        !error &&
        progress &&
        progress.eligibleSessionCount === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-2xl">
              📊
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">
              No Progress Profile Available Yet
            </h2>
            <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your progress profile is calculated dynamically from your latest
              up to 5 eligible completed sessions. A practice session
              contributes to your progress profile once you exchange at least 3
              substantive conversation turns.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
              >
                Choose a Scenario to Practice
              </Link>
            </div>
          </div>
        )}

      {/* Populated Progress View */}
      {!loading && progress && progress.skills && progress.weakestSkill && (
        <div className="space-y-8">
          {/* Summary Banner */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Profile Window
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Rolling 5-Session Evaluation Basis
                </h2>
                <p className="text-xs text-slate-500 max-w-xl">
                  Calculated from your latest {progress.eligibleSessionCount}{" "}
                  {progress.eligibleSessionCount === 1
                    ? "eligible session"
                    : "eligible sessions"}{" "}
                  (3+ substantive turns). Skill ratings adapt purely from
                  objective completed performance.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                  {progress.eligibleSessionCount} / 5 Sessions Active
                </span>
              </div>
            </div>
          </section>

          {/* Weakest Skill Spotlight & Recommended Scenario Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Weakest Skill Spotlight Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold">
                    🎯
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Primary Growth Opportunity
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-amber-950">
                  {getSkillMetadata(progress.weakestSkill).name}
                </h3>
                <p className="mt-2 text-xs text-amber-900/90 leading-relaxed">
                  {getSkillMetadata(progress.weakestSkill).name} currently has
                  your lowest average rating (
                  <strong className="font-bold">
                    {
                      progress.skills[
                        progress.weakestSkill.toLowerCase() as keyof typeof progress.skills
                      ]
                    }{" "}
                    / 100
                  </strong>
                  ). Focusing practice on this area delivers the largest
                  leverage on overall workplace effectiveness.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-amber-200/60 text-[11px] text-amber-800 font-medium">
                Tip: Review coaching moments in past results for stronger
                alternative responses in this skill.
              </div>
            </div>

            {/* Recommended Scenario Card */}
            {progress.recommendedScenario && (
              <div className="flex flex-col justify-between rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                      ★
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Recommended Practice Scenario
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-indigo-950">
                    {progress.recommendedScenario.title}
                  </h3>
                  <p className="mt-2 text-xs text-indigo-900/90 leading-relaxed">
                    Designed to target and cultivate your{" "}
                    {getSkillMetadata(progress.weakestSkill).name.toLowerCase()}{" "}
                    in realistic workplace scenarios.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-200/60">
                  <Link
                    href={`/app/scenarios/${encodeURIComponent(progress.recommendedScenario.key)}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
                  >
                    Rehearse This Scenario
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 5 Universal Skills Grid */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Universal Skill Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Competency ratings averaged across your active evaluation
                window.
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
                const score = progress.skills![skillKey];
                const band = getScoreBand(score);
                const meta =
                  UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);
                const isWeakest =
                  progress.weakestSkill?.toLowerCase() === skillKey;

                return (
                  <div
                    key={skillKey}
                    className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition ${
                      isWeakest
                        ? "border-amber-300 ring-2 ring-amber-200/50"
                        : "border-slate-200"
                    }`}
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

                    <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-baseline justify-between text-xs font-semibold text-slate-700">
                        <span className="text-[11px] text-slate-400">
                          Average Rating
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {score} / 100
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${band.progressClass}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, score))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
