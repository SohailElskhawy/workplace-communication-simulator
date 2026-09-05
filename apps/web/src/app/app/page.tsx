"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type {
  HistoryItem,
  ProgressData,
  PublicScenarioSummary,
} from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowRightIcon,
  DocumentTextIcon,
  InterviewIcon,
  SparklesIcon,
  TargetIcon,
} from "@/components/icons";
import { createApiClient } from "@/lib/api-client";
import { SKILL_SCORE_KEYS } from "@/lib/constants";
import { getSkillMetadata } from "@/lib/score-utils";
import { DEFAULT_MOCK_SCENARIOS } from "./scenario-library-view";

function formatHistoryStatus(status: HistoryItem["status"]): string {
  switch (status) {
    case "COMPLETED":
      return "Results ready";
    case "EVALUATING":
      return "Preparing feedback";
    case "EVALUATION_FAILED":
      return "Feedback needs attention";
    case "ABANDONED":
      return "Ended early";
    case "ACTIVE":
      return "Continue practice";
  }
}

function pathHrefForHistory(item: HistoryItem): string {
  return item.status === "ACTIVE"
    ? `/app/simulations/${encodeURIComponent(item.attemptId)}`
    : `/app/results/${encodeURIComponent(item.attemptId)}`;
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
        setScenariosError("We could not refresh the scenario list.");
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

  const recommendedScenario = useMemo(() => {
    if (progress?.recommendedScenario) {
      const match = scenarios.find(
        (scenario) => scenario.key === progress.recommendedScenario?.key,
      );
      if (match) return match;
    }
    return (
      scenarios.find((scenario) => scenario.key === "salary-negotiation") ??
      scenarios[0] ??
      DEFAULT_MOCK_SCENARIOS[0]!
    );
  }, [progress, scenarios]);

  const greetingName = user?.firstName ? `, ${user.firstName}` : "";

  if (loading && scenarios.length === 0) {
    return (
      <div className="space-y-8 py-8" role="status" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 max-w-2xl animate-pulse rounded-card bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-card border border-border-subtle bg-surface-solid"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 py-8 sm:py-12" data-od-id="home-screen">
      <header className="max-w-3xl space-y-4" data-od-id="home-heading">
        <p className="text-sm font-semibold text-primary">
          Welcome back{greetingName}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
          What conversation would help you feel more prepared?
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Practice privately with an AI counterpart, get evidence-linked
          coaching, and try again while the moment is still fresh.
        </p>
      </header>

      {scenariosError && (
        <div
          role="status"
          className="rounded-control border border-alert/20 bg-alert/5 px-4 py-3 text-sm text-foreground"
        >
          {scenariosError} Showing the available curated practice set.
        </div>
      )}

      <section
        aria-labelledby="practice-paths-title"
        className="space-y-5"
        data-od-id="practice-paths"
      >
        <div>
          <h2
            id="practice-paths-title"
            className="font-display text-3xl font-semibold text-foreground"
          >
            Choose your practice path
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All three paths lead to the same simulation, coaching, and retry
            loop.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href={`/app/scenarios/${encodeURIComponent(recommendedScenario.key)}`}
            className="group flex min-h-72 flex-col rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-brutal"
            data-od-id="path-recommended-practice"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-h-8 items-center rounded-full bg-primary-muted px-3 text-xs font-semibold text-primary">
                Recommended for you
              </span>
              <SparklesIcon
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            </div>
            <div className="mt-8 flex-1">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Recommended practice
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {recommendedScenario.title}: {recommendedScenario.summary}
              </p>
            </div>
            <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
              Start this practice
              <ArrowRightIcon className="directional-icon h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/app/scenarios"
            className="group flex min-h-72 flex-col rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-brutal"
            data-od-id="path-browse-scenarios"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle text-foreground">
              <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="mt-8 flex-1">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Browse scenarios
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Explore {scenarios.length} workplace and interview situations by
                skill, category, and difficulty.
              </p>
            </div>
            <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
              Explore the library
              <ArrowRightIcon className="directional-icon h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/app/scenarios/custom"
            className="group flex min-h-72 flex-col rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-brutal"
            data-od-id="path-real-interview"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle text-foreground">
              <InterviewIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="mt-8 flex-1">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Prepare for your real interview
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Upload your CV, add the job description, and rehearse a
                personalized interview grounded in your experience.
              </p>
              <p className="mt-4 font-meta text-[11px] text-muted-foreground">
                CV PDF → Job description → Personalized interview
              </p>
            </div>
            <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
              Prepare my interview
              <ArrowRightIcon className="directional-icon h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      <section
        className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        data-od-id="learning-overview"
      >
        <div className="rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Continue where you left off
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recent practice and feedback, without losing your place.
              </p>
            </div>
            <Link
              href="/app/history"
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary hover:underline"
            >
              History
            </Link>
          </div>

          <div className="mt-6 divide-y divide-border-subtle">
            {recentHistory.length > 0 ? (
              recentHistory.map((item) => (
                <Link
                  key={item.attemptId}
                  href={pathHrefForHistory(item)}
                  className="group flex min-h-20 items-center justify-between gap-4 py-4"
                  data-od-id={`recent-practice-${item.attemptId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary">
                      {item.scenario.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.difficulty.toLowerCase()} ·{" "}
                      {formatHistoryStatus(item.status)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {item.overallScore !== null && (
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {item.overallScore}/100
                      </span>
                    )}
                    <ArrowRightIcon className="directional-icon h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Your recent sessions will appear here after your first
                  practice.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Communication profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your latest eligible practice sessions.
              </p>
            </div>
            <TargetIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          {progress?.skills ? (
            <div className="mt-6 space-y-4">
              {SKILL_SCORE_KEYS.map((skillKey) => {
                const score = progress.skills![skillKey];
                return (
                  <div
                    key={skillKey}
                    className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {getSkillMetadata(skillKey).name}
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, Math.max(0, score))}%`,
                        }}
                      />
                    </span>
                    <span className="text-end font-mono text-xs text-muted-foreground">
                      {score}
                    </span>
                  </div>
                );
              })}
              <Link
                href="/app/progress"
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                View progress and next focus
                <ArrowRightIcon className="directional-icon h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-8 rounded-xl bg-surface-subtle p-5">
              <p className="text-sm font-medium text-foreground">
                Complete three conversation turns to start your profile.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Kalemny tracks clarity, assertiveness, empathy, structure, and
                conciseness from eligible sessions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
