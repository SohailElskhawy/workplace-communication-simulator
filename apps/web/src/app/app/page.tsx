"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type {
  HistoryItem,
  ProgressData,
  PublicScenarioSummary,
} from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createApiClient } from "../../lib/api-client";
import { cn } from "@/lib/cn";
import {
  getScoreBand,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "../../lib/score-utils";
import {
  DEFAULT_MOCK_SCENARIOS,
  getScenarioMeta,
} from "./scenario-library-view";

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
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

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function formatStatus(status: HistoryItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass: "bg-[#d4ff00]/20 text-[#171e00] border-border",
        dotClass: "bg-[#536600]",
      };
    case "EVALUATING":
      return {
        label: "Evaluating",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
        dotClass: "bg-primary animate-pulse",
      };
    case "EVALUATION_FAILED":
      return {
        label: "Evaluation Incomplete",
        badgeClass: "bg-[#ffb3b0]/30 text-[#971e26] border-border",
        dotClass: "bg-[#ba1a1a]",
      };
    case "ABANDONED":
      return {
        label: "Ended Early",
        badgeClass: "bg-surface-subtle text-muted-foreground border-border/40",
        dotClass: "bg-muted-foreground",
      };
    case "ACTIVE":
      return {
        label: "In Progress",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
        dotClass: "bg-primary",
      };
  }
}

export default function DashboardPage() {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [scenarios, setScenarios] = useState<PublicScenarioSummary[]>(
    DEFAULT_MOCK_SCENARIOS,
  );
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const loadDashboardData = useCallback(async () => {
    if (!authLoaded || !isSignedIn) return;
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const client = createApiClient(apiUrl);

      // Load all 3 endpoints in parallel with resilient fault-tolerance
      const [scenariosResult, progressResult, historyResult] =
        await Promise.allSettled([
          client.fetchScenarios(token),
          client.fetchProgress(token),
          client.fetchHistory(token, { limit: 3 }),
        ]);

      if (scenariosResult.status === "fulfilled") {
        setScenarios(scenariosResult.value);
        setScenariosError(null);
      } else {
        setScenariosError("Could not load latest scenarios.");
      }

      if (progressResult.status === "fulfilled") {
        setProgress(progressResult.value);
      }

      if (historyResult.status === "fulfilled") {
        setRecentHistory(historyResult.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, authLoaded, getToken, isSignedIn]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Featured / Recommended scenario resolution
  const featuredScenario = useMemo(() => {
    if (progress?.recommendedScenario) {
      const matched = scenarios.find(
        (s) => s.key === progress.recommendedScenario?.key,
      );
      if (matched) return matched;
    }
    // Default starter scenario for neutral onboarding
    return (
      scenarios.find((s) => s.key === "salary-negotiation") ??
      scenarios[0] ??
      DEFAULT_MOCK_SCENARIOS[0]!
    );
  }, [progress, scenarios]);

  const featuredMeta = useMemo(() => {
    return getScenarioMeta(featuredScenario);
  }, [featuredScenario]);

  const greetingName = user?.firstName ?? "there";

  if (loading && scenarios.length === 0) {
    return (
      <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 font-sans animate-pulse">
        <div className="h-10 w-48 bg-border/30 rounded-full" />
        <div className="h-16 w-3/4 bg-border/40 rounded-card" />
        <div className="h-48 w-full bg-border/20 rounded-card" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-12 font-sans pb-24">
      {/* 1. Welcome / Hero Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-border rounded-full bg-surface-subtle font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          <SparklesIcon className="w-3.5 h-3.5 text-primary" />
          <span>Welcome back, {greetingName}</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
          What do you want to practice today?
        </h1>

        <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
          Select a workplace conversation simulation to rehearse challenging
          dialogues with realistic AI counterparts and receive structured
          evidence-linked coaching.
        </p>
      </header>

      {/* 2. Featured / Recommended Practice Card */}
      <section aria-label="Recommended practice">
        <div className="glass-surface rounded-card p-6 sm:p-8 md:p-10 border border-border shadow-[6px_6px_0px_0px_#1a1a1a] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden bg-primary/5">
          <div className="space-y-3 max-w-2xl relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <StarIcon className="w-3 h-3" />
                {progress?.recommendedScenario
                  ? "Targeted Recommendation"
                  : "Recommended Starter"}
              </span>
              <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground border border-border/40 px-2.5 py-0.5 rounded-full bg-surface-subtle font-semibold">
                {featuredMeta.categoryLabel}
              </span>
              <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground border border-border/40 px-2.5 py-0.5 rounded-full bg-surface-subtle font-semibold">
                Difficulty: {featuredMeta.difficulty}
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">
              {featuredScenario.title}
            </h2>

            <p className="font-sans text-sm sm:text-base text-muted-foreground leading-relaxed">
              {featuredScenario.summary}
            </p>
          </div>

          <div className="shrink-0 relative z-10 self-start md:self-center">
            <Link
              href={`/app/scenarios/${encodeURIComponent(featuredScenario.key)}`}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-6 py-3.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
            >
              <span>Start Practice</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <div
            aria-hidden="true"
            className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"
          />
        </div>
      </section>

      {/* 3. Communication Profile Section (5 Universal Skills Bento Grid + Next Focus Insight) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/20 pb-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Your communication profile
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
              {progress && progress.eligibleSessionCount > 0
                ? `Calculated from your latest ${progress.eligibleSessionCount} eligible sessions (3+ turns).`
                : "Complete practice simulations to build your deterministic competency profile."}
            </p>
          </div>

          <Link
            href="/app/progress"
            className="font-meta text-xs font-bold text-primary flex items-center gap-1 hover:underline underline-offset-4 shrink-0"
          >
            <span>View Full Profile</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Populated vs Empty Profile State */}
        {progress && progress.skills && progress.weakestSkill ? (
          <div className="space-y-6">
            {/* 5-Skill Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    className={cn(
                      "glass-surface rounded-card p-5 flex flex-col justify-between transition-all relative overflow-hidden",
                      isWeakest
                        ? "bg-primary/10 border-2 border-primary shadow-[4px_4px_0px_0px_#1a1a1a]"
                        : "border border-border shadow-xs",
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
                          "font-display text-3xl sm:text-4xl font-bold my-1.5",
                          isWeakest ? "text-primary" : "text-foreground",
                        )}
                      >
                        {score}
                      </div>

                      <span
                        className={cn(
                          "inline-block font-meta text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-1.5",
                          band.badgeClass,
                        )}
                      >
                        {band.label}
                      </span>
                    </div>

                    <div className="w-full bg-surface-container-high h-1.5 mt-3 border border-border/20 rounded-full overflow-hidden">
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

            {/* Next Focus Insight Banner */}
            <div className="glass-surface rounded-card p-5 border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TargetIcon className="w-6 h-6 text-primary shrink-0" />
                <p className="font-sans text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  Your primary growth opportunity is{" "}
                  <strong className="text-primary font-bold">
                    {getSkillMetadata(progress.weakestSkill).name}
                  </strong>
                  . Focusing practice on this area delivers the largest leverage
                  on your communication impact.
                </p>
              </div>

              <Link
                href="/app/progress"
                className="shrink-0 font-meta text-xs font-bold text-primary hover:underline underline-offset-4"
              >
                Practice {getSkillMetadata(progress.weakestSkill).name} →
              </Link>
            </div>
          </div>
        ) : (
          /* Empty Communication Profile Card */
          <div className="glass-surface rounded-card border border-border p-8 text-center shadow-xs">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xl mb-3">
              📊
            </div>
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
              No Communication Profile Yet
            </h3>
            <p className="font-sans text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
              Complete your first practice session with at least 3 conversation
              turns to generate your universal 5-skill baseline.
            </p>
          </div>
        )}
      </section>

      {/* 4. Quick Scenarios Section (Practice Something Else) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/20 pb-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Practice something else
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
              Explore curated workplace simulation scenarios.
            </p>
          </div>
        </div>

        {scenariosError && (
          <div className="rounded-control border border-alert/30 bg-alert/10 p-3 font-sans text-xs text-alert">
            {scenariosError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.slice(0, 6).map((scenario) => {
            const meta = getScenarioMeta(scenario);

            return (
              <article
                key={scenario.key}
                className="glass-surface rounded-card p-6 flex flex-col justify-between border border-border shadow-xs hover:shadow-[4px_4px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-meta text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {meta.categoryLabel}
                    </span>
                    <span className="font-meta text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-surface-subtle text-foreground">
                      {meta.difficulty}
                    </span>
                  </div>

                  <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors mb-2">
                    {scenario.title}
                  </h3>

                  <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {scenario.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/15 flex items-center justify-between mt-auto">
                  <span className="font-meta text-xs font-semibold text-muted-foreground">
                    Practice →
                  </span>
                  <Link
                    href={`/app/scenarios/${encodeURIComponent(scenario.key)}`}
                    className="inline-flex items-center gap-1.5 rounded-control bg-surface-solid px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground border border-border shadow-2xs hover:bg-surface-subtle brutalist-interactive"
                  >
                    <span>Start</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 5. Recent Practice Sessions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/20 pb-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Recent Practice
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review your most recent simulation rehearsals and coaching.
            </p>
          </div>

          <Link
            href="/app/history"
            className="font-meta text-xs font-bold text-primary flex items-center gap-1 hover:underline underline-offset-4 shrink-0"
          >
            <span>View Full History</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentHistory.length > 0 ? (
          <div className="space-y-3">
            {recentHistory.map((item) => {
              const statusInfo = formatStatus(item.status);
              const scoreBand =
                item.overallScore !== null
                  ? getScoreBand(item.overallScore)
                  : null;

              const displayDate = new Date(
                item.completedAt ?? item.startedAt,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={item.attemptId}
                  className="glass-surface rounded-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border shadow-xs hover:shadow-[2px_2px_0px_0px_#1a1a1a] transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-bold text-foreground">
                        {item.scenario.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-border font-meta text-[10px] font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
                        {item.difficulty}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-meta text-[10px] font-bold border",
                          statusInfo.badgeClass,
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            statusInfo.dotClass,
                          )}
                        />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="font-meta text-xs text-muted-foreground">
                      {displayDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {scoreBand && item.overallScore !== null && (
                      <div className="text-right">
                        <div className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                          Score
                        </div>
                        <div className="font-display text-xl font-bold text-primary">
                          {item.overallScore} / 100
                        </div>
                      </div>
                    )}

                    <Link
                      href={
                        item.status === "ACTIVE"
                          ? `/app/simulations/${encodeURIComponent(item.attemptId)}`
                          : `/app/results/${encodeURIComponent(item.attemptId)}`
                      }
                      className="inline-flex items-center gap-1.5 rounded-control bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground border border-border shadow-2xs hover:bg-surface-subtle brutalist-interactive"
                    >
                      <span>
                        {item.status === "ACTIVE"
                          ? "Resume"
                          : item.status === "EVALUATION_FAILED"
                            ? "View & Retry"
                            : "Results"}
                      </span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-surface rounded-card border border-border p-8 text-center font-sans text-xs text-muted-foreground shadow-xs">
            No recent practice sessions yet. Start your first rehearsal above to
            begin tracking your progress.
          </div>
        )}
      </section>
    </div>
  );
}
