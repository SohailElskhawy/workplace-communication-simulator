"use client";

import { useAuth } from "@clerk/nextjs";
import type { ProgressData, PublicScenarioSummary } from "@kalemny/contracts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowRightIcon,
  InterviewIcon,
  PlayIcon,
  SearchIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/icons";
import { DeleteCustomScenarioDialog } from "@/components/scenarios/delete-custom-scenario-dialog";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";

export interface ScenarioVisualMeta {
  categoryLabel: string;
  categoryKey: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  gradientClass: string;
  iconName:
    | "handshake"
    | "interview"
    | "promotion"
    | "pushback"
    | "feedback"
    | "boundary"
    | "default";
}

export const DEFAULT_MOCK_SCENARIOS: PublicScenarioSummary[] = [
  {
    key: "salary-negotiation",
    version: 1,
    title: "Salary Negotiation",
    category: "NEGOTIATION",
    summary:
      "Advocate for your value while handling realistic compensation objections and budget constraints.",
  },
  {
    key: "behavioral-interview",
    version: 1,
    title: "Behavioral Job Interview",
    category: "INTERVIEW",
    summary:
      "Practice clear, confident answers to challenging interview questions with structured examples.",
  },
  {
    key: "promotion-request",
    version: 1,
    title: "Asking for a Promotion",
    category: "CAREER_GROWTH",
    summary:
      "Make a grounded case for greater responsibility, recognition, and career progression.",
  },
  {
    key: "manager-pushback",
    version: 1,
    title: "Disagree with Your Manager",
    category: "MANAGING_UP",
    summary:
      "Push back on an unrealistic deadline while protecting trust, clarity, and alignment.",
  },
  {
    key: "difficult-feedback",
    version: 1,
    title: "Difficult Feedback",
    category: "FEEDBACK",
    summary:
      "Give direct, constructive feedback without creating unnecessary defensiveness or conflict.",
  },
  {
    key: "scope-creep",
    version: 1,
    title: "Saying No to Scope Creep",
    category: "BOUNDARIES",
    summary:
      "Set firm project boundaries and negotiate priorities when new work appears late.",
  },
];

export const SCENARIO_VISUAL_MAP: Record<string, ScenarioVisualMeta> = {
  "salary-negotiation": {
    categoryLabel: "Negotiation",
    categoryKey: "NEGOTIATION",
    difficulty: "Medium",
    tags: ["Assertiveness", "Value"],
    gradientClass: "",
    iconName: "handshake",
  },
  "behavioral-interview": {
    categoryLabel: "Interviews",
    categoryKey: "CAREER_MANAGEMENT",
    difficulty: "Hard",
    tags: ["Structure", "Confidence"],
    gradientClass: "",
    iconName: "interview",
  },
  "promotion-request": {
    categoryLabel: "Career growth",
    categoryKey: "CAREER_MANAGEMENT",
    difficulty: "Medium",
    tags: ["Value", "Progression"],
    gradientClass: "",
    iconName: "promotion",
  },
  "manager-pushback": {
    categoryLabel: "Managing up",
    categoryKey: "CONFLICT_RESOLUTION",
    difficulty: "Hard",
    tags: ["Pushback", "Alignment"],
    gradientClass: "",
    iconName: "pushback",
  },
  "difficult-feedback": {
    categoryLabel: "Feedback",
    categoryKey: "FEEDBACK",
    difficulty: "Medium",
    tags: ["Directness", "Empathy"],
    gradientClass: "",
    iconName: "feedback",
  },
  "scope-creep": {
    categoryLabel: "Boundaries",
    categoryKey: "BOUNDARIES",
    difficulty: "Easy",
    tags: ["Boundaries", "Prioritization"],
    gradientClass: "",
    iconName: "boundary",
  },
};

export const FILTER_CATEGORIES = [
  { key: "ALL", label: "All scenarios" },
  { key: "CUSTOM", label: "My interviews" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CAREER_MANAGEMENT", label: "Career & interviews" },
  { key: "CONFLICT_RESOLUTION", label: "Managing conflict" },
  { key: "FEEDBACK", label: "Feedback" },
  { key: "BOUNDARIES", label: "Boundaries" },
] as const;

export function normalizeCategory(category: string): string {
  const upper = category
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  if (upper === "CUSTOM" || upper === "CUSTOM_INTERVIEW") return "CUSTOM";
  if (upper === "NEGOTIATION" || upper === "SALARY_NEGOTIATION") {
    return "NEGOTIATION";
  }
  if (
    [
      "CAREER_MANAGEMENT",
      "CAREER_GROWTH",
      "INTERVIEW",
      "INTERVIEWS",
      "BEHAVIORAL_INTERVIEW",
      "CAREER",
    ].includes(upper)
  ) {
    return "CAREER_MANAGEMENT";
  }
  if (
    [
      "CONFLICT_RESOLUTION",
      "WORKPLACE_CONFLICT",
      "MANAGING_UP",
      "MANAGER_PUSHBACK",
      "CONFLICT",
    ].includes(upper)
  ) {
    return "CONFLICT_RESOLUTION";
  }
  if (upper === "FEEDBACK" || upper === "DIFFICULT_FEEDBACK") {
    return "FEEDBACK";
  }
  if (["BOUNDARIES", "BOUNDARY", "SCOPE_CREEP"].includes(upper)) {
    return "BOUNDARIES";
  }
  return upper;
}

export function getScenarioMeta(
  scenario: PublicScenarioSummary,
): ScenarioVisualMeta {
  const known = SCENARIO_VISUAL_MAP[scenario.key];
  if (known) return known;
  if (scenario.category === "CUSTOM" || scenario.isCustom) {
    return {
      categoryLabel: "Personalized interview",
      categoryKey: "CUSTOM",
      difficulty: "Medium",
      tags: ["Your CV", "Target role"],
      gradientClass: "",
      iconName: "interview",
    };
  }
  const normalized = normalizeCategory(scenario.category);
  return {
    categoryLabel:
      FILTER_CATEGORIES.find((category) => category.key === normalized)
        ?.label ?? scenario.category,
    categoryKey: normalized,
    difficulty: "Medium",
    tags: ["Communication", "Practice"],
    gradientClass: "",
    iconName: "default",
  };
}

interface ScenarioLibraryViewProps {
  initialScenarios: PublicScenarioSummary[];
  errorMessage?: string | null;
}

export function ScenarioLibraryView({
  initialScenarios,
  errorMessage,
}: ScenarioLibraryViewProps) {
  const { getToken, isSignedIn } = useAuth();
  const [deletedKeys, setDeletedKeys] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedKey, setRecommendedKey] = useState("salary-negotiation");
  const [deletingScenario, setDeletingScenario] =
    useState<PublicScenarioSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadRecommendation() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const progress: ProgressData =
          await createApiClient(apiUrl).fetchProgress(token);
        if (mounted && progress.recommendedScenario?.key) {
          setRecommendedKey(progress.recommendedScenario.key);
        }
      } catch {
        // Salary negotiation remains the honest starter recommendation.
      }
    }
    void loadRecommendation();
    return () => {
      mounted = false;
    };
  }, [getToken, isSignedIn]);

  const scenarios = useMemo(() => {
    const source =
      initialScenarios.length > 0 ? initialScenarios : DEFAULT_MOCK_SCENARIOS;
    const deleted = new Set(deletedKeys);
    return source.filter((scenario) => !deleted.has(scenario.key));
  }, [deletedKeys, initialScenarios]);

  const filteredScenarios = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      const matchesCategory =
        selectedFilter === "ALL" ||
        normalizeCategory(scenario.category) === selectedFilter;
      const meta = getScenarioMeta(scenario);
      const matchesSearch =
        !query ||
        scenario.title.toLowerCase().includes(query) ||
        scenario.summary.toLowerCase().includes(query) ||
        meta.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [scenarios, searchQuery, selectedFilter]);

  const handleConfirmDelete = async () => {
    if (!deletingScenario) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token is unavailable.");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      await createApiClient(apiUrl).deleteCustomScenario(
        token,
        deletingScenario.key,
      );
      setDeletedKeys((current) => [...current, deletingScenario.key]);
      setDeletingScenario(null);
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to remove this personalized interview.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      className="space-y-10 pb-16 pt-8 sm:pt-12"
      data-od-id="scenario-library-screen"
    >
      <header
        className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"
        data-od-id="scenario-library-heading"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Practice library</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Find the conversation you want to handle better.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Explore realistic workplace situations, choose your difficulty, and
            practice with a focused AI counterpart.
          </p>
        </div>
        <Link
          href="/app/scenarios/custom"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-primary/20 bg-primary-muted px-5 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-surface-solid"
          data-od-id="prepare-real-interview-cta"
        >
          <InterviewIcon className="h-4 w-4" aria-hidden="true" />
          Prepare for a real interview
        </Link>
      </header>

      {errorMessage && (
        <div
          role="status"
          className="rounded-control border border-alert/20 bg-alert/5 px-4 py-3 text-sm text-foreground"
        >
          {errorMessage} Showing the curated offline practice set.
        </div>
      )}

      <section
        aria-label="Search and filter scenarios"
        className="space-y-4 rounded-card border border-border-subtle bg-surface-solid p-4 shadow-xs sm:p-5"
        data-od-id="scenario-filters"
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="scenario-search" className="sr-only">
            Search scenarios
          </label>
          <input
            id="scenario-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by situation or skill"
            className="min-h-12 w-full rounded-control border border-border bg-background ps-11 pe-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((category) => {
            const selected = selectedFilter === category.key;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedFilter(category.key)}
                aria-pressed={selected}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-subtle bg-surface-solid text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="scenario-results-title"
        data-od-id="scenario-results"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2
              id="scenario-results-title"
              className="font-display text-2xl font-semibold text-foreground"
            >
              {selectedFilter === "ALL"
                ? "All practice scenarios"
                : FILTER_CATEGORIES.find(
                    (category) => category.key === selectedFilter,
                  )?.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredScenarios.length}{" "}
              {filteredScenarios.length === 1 ? "result" : "results"}
            </p>
          </div>
        </div>

        {filteredScenarios.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredScenarios.map((scenario) => {
              const meta = getScenarioMeta(scenario);
              const isRecommended = scenario.key === recommendedKey;
              const isCustom =
                scenario.isCustom || scenario.category === "CUSTOM";
              return (
                <article
                  key={scenario.key}
                  className="group flex min-h-64 flex-col rounded-card border border-border-subtle bg-surface-solid p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-brutal"
                  data-od-id={`scenario-card-${scenario.key}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {meta.categoryLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      {isRecommended && (
                        <span className="rounded-full bg-primary-muted px-2.5 py-1 text-[11px] font-semibold text-primary">
                          Recommended
                        </span>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => setDeletingScenario(scenario)}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-alert/5 hover:text-alert"
                          aria-label={`Remove ${scenario.title}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex-1">
                    <h3 className="font-display text-2xl font-semibold text-foreground group-hover:text-primary">
                      {scenario.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {scenario.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-muted-foreground">
                        {meta.difficulty}
                      </span>
                      {meta.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/app/scenarios/${encodeURIComponent(scenario.key)}`}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 border-t border-border-subtle pt-4 text-sm font-semibold text-foreground group-hover:text-primary"
                  >
                    <PlayIcon className="h-4 w-4" aria-hidden="true" />
                    View practice setup
                    <ArrowRightIcon className="directional-icon ms-auto h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-border bg-surface-solid px-6 py-16 text-center">
            <SparklesIcon
              className="mx-auto h-5 w-5 text-primary"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-display text-2xl font-semibold text-foreground">
              No matching scenarios
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Try a broader search or clear the selected category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("ALL");
              }}
              className="mt-6 min-h-11 rounded-control border border-border bg-surface-solid px-4 text-sm font-semibold text-foreground hover:bg-surface-subtle"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <DeleteCustomScenarioDialog
        open={deletingScenario !== null}
        scenarioTitle={deletingScenario?.title ?? "Personalized interview"}
        deleteError={deleteError}
        deleteLoading={deleteLoading}
        onClose={() => {
          setDeletingScenario(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
