"use client";

import { useAuth } from "@clerk/nextjs";
import type { ProgressData } from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  ArrowRightIcon,
  RefreshIcon,
  StarIcon,
  TargetIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import { SKILL_SCORE_KEYS } from "@/lib/constants";
import { createApiClient } from "@/lib/api-client";
import {
  getScoreBand,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "@/lib/score-utils";

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
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-10 font-sans pb-24">
      {/* 1. Page Hero */}
      <header className="relative space-y-4 max-w-4xl">
        <div className="inline-block px-3 py-1 border border-primary/20 rounded-full bg-primary/10">
          <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
            Your Progress
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
              See how your communication is changing.
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed max-w-2xl">
              Your skill profile reflects your recent completed practice
              sessions and helps you decide what to work on next.
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
            >
              <span>Practice Now</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-card border-2 border-alert bg-alert/10 p-6 shadow-xs flex items-start justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-alert">
              Unable to load progress profile
            </h2>
            <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-1">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void reloadProgress()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:opacity-90 cursor-pointer"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !progress && (
        <div className="space-y-6" role="status" aria-busy="true">
          <div className="glass-surface rounded-card border border-border p-8 shadow-xs animate-pulse space-y-4">
            <div className="h-4 w-1/4 bg-border/40 rounded" />
            <div className="h-8 w-1/2 bg-border/40 rounded" />
            <div className="h-4 w-3/4 bg-border/20 rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-40 glass-surface rounded-card border border-border p-5 shadow-xs animate-pulse"
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
          <div className="glass-surface rounded-card border border-border p-12 text-center shadow-[6px_6px_0px_0px_#1a1a1a] max-w-3xl mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl mb-4">
              📊
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              No Progress Profile Available Yet
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
              Your progress profile is calculated dynamically from your latest
              up to 5 eligible completed sessions. A practice session
              contributes once you exchange at least 3 substantive dialogue
              turns.
            </p>
            <div className="mt-6">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
              >
                <span>Choose a Scenario to Practice</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

      {/* Populated Progress Profile */}
      {!loading && progress && progress.skills && progress.weakestSkill && (
        <div className="space-y-10">
          {/* 2. Communication Profile Section (5 Universal Skills Bento Grid) */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/20 pb-4">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
                  Your communication profile
                </h2>
                <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {progress.eligibleSessionCount >= 5
                    ? "Calculated from your latest 5 completed rehearsal sessions (3+ turns)."
                    : `Calculated from your latest ${progress.eligibleSessionCount} completed ${
                        progress.eligibleSessionCount === 1
                          ? "session"
                          : "sessions"
                      } (3+ turns).`}
                </p>
              </div>

              <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shrink-0">
                {progress.eligibleSessionCount} / 5 Sessions Active
              </span>
            </div>

            {/* Bento Grid for 5 Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
              {SKILL_SCORE_KEYS.map((skillKey) => {
                const score = progress.skills![skillKey];
                const band = getScoreBand(score);
                const meta =
                  UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);
                const isWeakest =
                  progress.weakestSkill?.toLowerCase() === skillKey;

                return (
                  <div
                    key={skillKey}
                    className={cn(
                      "glass-surface rounded-card p-5 sm:p-6 flex flex-col justify-between transition-all relative overflow-hidden",
                      isWeakest
                        ? "bg-primary/10 border-2 border-primary shadow-[4px_4px_0px_0px_#1a1a1a]"
                        : "border border-border shadow-xs hover:border-border/80",
                    )}
                  >
                    {isWeakest && (
                      <div className="absolute top-3 right-3 bg-[#d4ff00] text-[#171e00] font-meta text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border border-border shadow-2xs">
                        Focus Next
                      </div>
                    )}

                    <div>
                      <span className="font-meta text-xs font-bold text-foreground uppercase tracking-wider block mb-1">
                        {meta.name}
                      </span>

                      <div
                        className={cn(
                          "font-display text-4xl sm:text-5xl font-bold my-2",
                          isWeakest ? "text-primary" : "text-foreground",
                        )}
                      >
                        {score}
                      </div>

                      <span
                        className={cn(
                          "inline-block font-meta text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2",
                          band.badgeClass,
                        )}
                      >
                        {band.label}
                      </span>

                      <p className="font-sans text-[11px] text-muted-foreground leading-snug">
                        {meta.description}
                      </p>
                    </div>

                    <div className="w-full bg-surface-container-high h-2 mt-4 border border-border/30 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isWeakest ? "bg-primary" : band.progressClass,
                        )}
                        style={{
                          width: `${Math.min(100, Math.max(0, score))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Next Focus & Recommended Scenario Hero Card */}
          <section className="glass-surface rounded-card border-2 border-primary bg-primary/5 p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    <TargetIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary">
                    Your Next Focus
                  </span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">
                  {getSkillMetadata(progress.weakestSkill).name}
                </h3>

                <p className="font-sans text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Based on your latest {progress.eligibleSessionCount} eligible
                  rehearsals,{" "}
                  <strong className="text-foreground font-semibold">
                    {getSkillMetadata(progress.weakestSkill).name}
                  </strong>{" "}
                  is your primary growth opportunity (currently at{" "}
                  {
                    progress.skills[
                      progress.weakestSkill.toLowerCase() as keyof typeof progress.skills
                    ]
                  }{" "}
                  / 100). Concentrating practice here delivers the highest
                  leverage on your overall workplace conversation impact.
                </p>

                {progress.recommendedScenario && (
                  <div className="pt-2 flex items-center gap-2 font-meta text-xs text-foreground font-semibold">
                    <StarIcon className="w-3.5 h-3.5 text-primary" />
                    <span>
                      Recommended scenario:{" "}
                      <span className="text-primary font-bold">
                        {progress.recommendedScenario.title}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {progress.recommendedScenario && (
                <div className="shrink-0">
                  <Link
                    href={`/app/scenarios/${encodeURIComponent(progress.recommendedScenario.key)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
                  >
                    <span>Rehearse {progress.recommendedScenario.title}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
