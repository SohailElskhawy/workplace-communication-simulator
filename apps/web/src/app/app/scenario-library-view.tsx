"use client";

import { useAuth } from "@clerk/nextjs";
import type { PublicScenarioSummary } from "@kalemny/contracts";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CreateCustomScenarioDialog } from "@/components/scenarios/create-custom-scenario-dialog";
import { DeleteCustomScenarioDialog } from "@/components/scenarios/delete-custom-scenario-dialog";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { getScenarioImage } from "@/lib/scenario-images";

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
      "Advocate for your value while handling realistic compensation objections. Practice holding your ground professionally when faced with budgetary constraints or deflection.",
  },
  {
    key: "behavioral-interview",
    version: 1,
    title: "Behavioral Job Interview",
    category: "INTERVIEW",
    summary:
      "Practice answering challenging interview questions clearly and confidently using structured rationale.",
  },
  {
    key: "promotion-request",
    version: 1,
    title: "Asking for a Promotion",
    category: "CAREER_GROWTH",
    summary:
      "Make a clear case for increased responsibility, compensation adjustment, and career progression.",
  },
  {
    key: "manager-pushback",
    version: 1,
    title: "Disagree with Your Manager",
    category: "MANAGING_UP",
    summary:
      "Push back constructively on unrealistic deadlines while protecting alignment and the working relationship.",
  },
  {
    key: "difficult-feedback",
    version: 1,
    title: "Difficult Feedback",
    category: "FEEDBACK",
    summary:
      "Give direct, constructive feedback to a teammate without creating unnecessary defensiveness or conflict.",
  },
  {
    key: "scope-creep",
    version: 1,
    title: "Saying No / Scope Creep",
    category: "BOUNDARIES",
    summary:
      "Set firm project boundaries, negotiate priorities, and say no professionally when facing scope creep.",
  },
];

export const SCENARIO_VISUAL_MAP: Record<string, ScenarioVisualMeta> = {
  "salary-negotiation": {
    categoryLabel: "Negotiation",
    categoryKey: "NEGOTIATION",
    difficulty: "Medium",
    tags: ["Assertiveness", "Value Proposition"],
    gradientClass: "from-[#0052ff] to-[#d4ff00]",
    iconName: "handshake",
  },
  "behavioral-interview": {
    categoryLabel: "Career Management",
    categoryKey: "CAREER_MANAGEMENT",
    difficulty: "Hard",
    tags: ["Structure", "Confidence"],
    gradientClass: "from-[#b7c4ff] to-[#0052ff]",
    iconName: "interview",
  },
  "promotion-request": {
    categoryLabel: "Career Management",
    categoryKey: "CAREER_MANAGEMENT",
    difficulty: "Medium",
    tags: ["Value Proposition", "Advancement"],
    gradientClass: "from-[#ffb3b0] to-[#b7c4ff]",
    iconName: "promotion",
  },
  "manager-pushback": {
    categoryLabel: "Conflict Resolution",
    categoryKey: "CONFLICT_RESOLUTION",
    difficulty: "Hard",
    tags: ["Pushback", "Alignment"],
    gradientClass: "from-[#0052ff] to-[#ff6b6b]",
    iconName: "pushback",
  },
  "difficult-feedback": {
    categoryLabel: "Feedback",
    categoryKey: "FEEDBACK",
    difficulty: "Medium",
    tags: ["Directness", "Empathy"],
    gradientClass: "from-[#d4ff00] to-[#0052ff]",
    iconName: "feedback",
  },
  "scope-creep": {
    categoryLabel: "Boundaries",
    categoryKey: "BOUNDARIES",
    difficulty: "Easy",
    tags: ["Boundaries", "Prioritization"],
    gradientClass: "from-[#1c1b1b] to-[#b8373b]",
    iconName: "boundary",
  },
};

export const FILTER_CATEGORIES = [
  { key: "ALL", label: "All" },
  { key: "CUSTOM", label: "Custom" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "CAREER_MANAGEMENT", label: "Career Management" },
  { key: "CONFLICT_RESOLUTION", label: "Conflict Resolution" },
  { key: "FEEDBACK", label: "Feedback" },
  { key: "BOUNDARIES", label: "Boundaries" },
] as const;

export function normalizeCategory(category: string): string {
  const upper = category
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  if (upper === "CUSTOM" || upper === "CUSTOM_INTERVIEW") {
    return "CUSTOM";
  }
  if (upper === "NEGOTIATION" || upper === "SALARY_NEGOTIATION") {
    return "NEGOTIATION";
  }
  if (
    upper === "CAREER_MANAGEMENT" ||
    upper === "CAREER_GROWTH" ||
    upper === "INTERVIEW" ||
    upper === "INTERVIEWS" ||
    upper === "BEHAVIORAL_INTERVIEW" ||
    upper === "CAREER"
  ) {
    return "CAREER_MANAGEMENT";
  }
  if (
    upper === "CONFLICT_RESOLUTION" ||
    upper === "WORKPLACE_CONFLICT" ||
    upper === "MANAGING_UP" ||
    upper === "MANAGER_PUSHBACK" ||
    upper === "CONFLICT"
  ) {
    return "CONFLICT_RESOLUTION";
  }
  if (upper === "FEEDBACK" || upper === "DIFFICULT_FEEDBACK") {
    return "FEEDBACK";
  }
  if (
    upper === "BOUNDARIES" ||
    upper === "BOUNDARY" ||
    upper === "SCOPE_CREEP"
  ) {
    return "BOUNDARIES";
  }
  return upper;
}

export function getScenarioMeta(
  scenario: PublicScenarioSummary,
): ScenarioVisualMeta {
  const byKey = SCENARIO_VISUAL_MAP[scenario.key];
  if (byKey) return byKey;

  if (scenario.category === "CUSTOM" || scenario.isCustom) {
    return {
      categoryLabel: "Custom Interview",
      categoryKey: "CUSTOM",
      difficulty: "Medium",
      tags: ["Custom", "Tailored Roleplay"],
      gradientClass: "from-[#0052ff] to-[#7928ca]",
      iconName: "interview",
    };
  }

  const normalized = normalizeCategory(scenario.category);
  return {
    categoryLabel:
      FILTER_CATEGORIES.find((c) => c.key === normalized)?.label ??
      scenario.category,
    categoryKey: normalized,
    difficulty: "Medium",
    tags: ["Communication", "Practice"],
    gradientClass: "from-[#0052ff] to-[#dfe3ff]",
    iconName: "default",
  };
}

import {
  ArrowRightIcon,
  BarChartIcon,
  BoundaryIcon,
  FeedbackIcon,
  HandshakeIcon,
  InterviewIcon,
  PlayIcon,
  PromotionIcon,
  PushbackIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/icons";

function renderScenarioIcon(
  iconName: ScenarioVisualMeta["iconName"],
  className = "w-10 h-10 text-white/70",
) {
  switch (iconName) {
    case "handshake":
      return <HandshakeIcon className={className} />;
    case "interview":
      return <InterviewIcon className={className} />;
    case "promotion":
      return <PromotionIcon className={className} />;
    case "pushback":
      return <PushbackIcon className={className} />;
    case "feedback":
      return <FeedbackIcon className={className} />;
    case "boundary":
      return <BoundaryIcon className={className} />;
    default:
      return <PushbackIcon className={className} />;
  }
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
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [userPlan, setUserPlan] = useState<"FREE" | "PLUS" | "PRO">("FREE");
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [deletingScenario, setDeletingScenario] =
    useState<PublicScenarioSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUserPlan() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const me = await client.fetchMe(token);
        if (mounted) {
          setUserPlan(me.entitlement.effectivePlan);
        }
      } catch {
        // benign fallback
      }
    }
    void loadUserPlan();
    return () => {
      mounted = false;
    };
  }, [getToken, isSignedIn]);

  const scenarios = useMemo(() => {
    const base =
      initialScenarios.length > 0 ? initialScenarios : DEFAULT_MOCK_SCENARIOS;
    if (deletedKeys.length === 0) return base;
    const deletedSet = new Set(deletedKeys);
    return base.filter((s) => !deletedSet.has(s.key));
  }, [initialScenarios, deletedKeys]);

  const filteredScenarios = useMemo(() => {
    if (selectedFilter === "ALL") return scenarios;
    return scenarios.filter(
      (s) => normalizeCategory(s.category) === selectedFilter,
    );
  }, [scenarios, selectedFilter]);

  const featuredScenario = useMemo(() => {
    if (selectedFilter === "ALL") {
      return (
        scenarios.find((s) => s.key === "salary-negotiation") ?? scenarios[0]
      );
    }
    return null;
  }, [scenarios, selectedFilter]);

  const gridScenarios = useMemo(() => {
    if (selectedFilter === "ALL" && featuredScenario) {
      return scenarios.filter((s) => s.key !== featuredScenario.key);
    }
    return filteredScenarios;
  }, [selectedFilter, featuredScenario, scenarios, filteredScenarios]);

  const handleConfirmDelete = async () => {
    if (!deletingScenario) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token is unavailable.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);
      await client.deleteCustomScenario(token, deletingScenario.key);

      setDeletedKeys((prev) => [...prev, deletingScenario.key]);
      setDeletingScenario(null);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Failed to delete custom scenario.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full pb-16">
      {/* Header Intro with Memphis Accents & Hero Spotlight */}
      <header className="relative py-8 sm:py-12 md:py-16 mb-8 sm:mb-12 border-b border-border/15">
        {/* Decorative Memphis Elements */}
        <div
          aria-hidden="true"
          className="absolute top-6 sm:top-10 right-[6%] sm:right-[10%] w-20 sm:w-24 h-20 sm:h-24 bg-primary rounded-full mix-blend-multiply opacity-80 blur-xs hidden md:block pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-6 sm:bottom-10 left-[3%] sm:left-[5%] w-28 sm:w-32 h-8 memphis-squiggle opacity-80 hidden md:block pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-12 sm:top-20 left-[10%] sm:left-[14%] w-10 sm:w-12 h-10 sm:h-12 bg-success rotate-12 hidden md:block pointer-events-none"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-border rounded-full bg-surface-subtle font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <SparklesIcon className="w-3.5 h-3.5 text-primary" />
              <span>Workplace Rehearsal Lab</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-[46px] font-bold text-foreground leading-[1.12] tracking-tight">
              Practice the conversations you usually avoid.
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Choose a realistic workplace scenario or generate a custom
              interview from your CV to rehearse under pressure before the real
              conversation happens.
            </p>
          </div>

          {/* Eye-catching Custom Interview Spotlight Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative overflow-hidden rounded-card p-6 sm:p-7 border-2 border-primary/50 bg-linear-to-br from-primary/15 via-surface to-surface-raised shadow-[6px_6px_0px_0px_#1a1a1a] transition-all hover:shadow-[8px_8px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground font-meta text-[10px] font-bold px-3 py-1 rounded-bl-card border-b border-l border-border uppercase tracking-widest flex items-center gap-1 shadow-2xs">
                <SparklesIcon className="w-3 h-3" />
                <span>AI Role Simulator</span>
              </div>

              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-control bg-primary/20 text-primary border border-primary/30 text-base font-bold shadow-2xs">
                  💼
                </span>
                <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary">
                  Custom Interview
                </span>
              </div>

              <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground mb-2">
                Targeting a Specific Job?
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
                Upload your CV PDF and job description to generate a
                hyper-realistic practice simulation tailored to your background.
              </p>

              <button
                type="button"
                onClick={() => setCreateCustomOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-control bg-primary text-primary-foreground font-display text-xs sm:text-sm font-bold uppercase tracking-wider border border-border shadow-[3px_3px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer select-none"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>Create Custom Interview</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Optional Notice if using fallback */}
      {errorMessage && (
        <div className="mb-8 rounded-card border border-alert bg-alert/10 p-4 sm:p-5 text-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-alert">Notice:</span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {errorMessage} Showing curated offline practice scenarios.
            </span>
          </div>
        </div>
      )}

      {/* Filter Row & Custom Scenario CTA */}
      <section
        aria-label="Filter scenarios by category"
        className="mb-6 sm:mb-12 flex flex-wrap items-center justify-between gap-3 pt-1 pb-2"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {FILTER_CATEGORIES.map((category) => {
            const isActive = selectedFilter === category.key;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedFilter(category.key)}
                aria-pressed={isActive}
                className={cn(
                  "px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full border border-border font-meta text-xs sm:text-sm transition-all duration-200 ease-out cursor-pointer select-none whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-[2px_2px_0px_0px_#1a1a1a] sm:shadow-[4px_4px_0px_0px_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                    : "bg-surface-solid text-foreground font-medium hover:bg-surface-subtle hover:text-foreground",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setCreateCustomOpen(true)}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-primary/50 font-display text-xs sm:text-sm font-bold uppercase tracking-wider bg-surface-solid text-foreground hover:bg-primary hover:text-primary-foreground shadow-[3px_3px_0px_0px_#1a1a1a] hover:shadow-[1px_1px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <SparklesIcon className="w-4 h-4 text-primary" />
          <span>+ Custom Interview</span>
        </button>
      </section>

      {/* Featured Scenario (when All is selected) */}
      {featuredScenario && (
        <section aria-label="Featured scenario" className="mb-12 sm:mb-16">
          {(() => {
            const meta = getScenarioMeta(featuredScenario);
            return (
              <div className="relative glass-surface rounded-card p-6 sm:p-8 md:p-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center group transition-all duration-200 ease-out hover:shadow-[8px_8px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden">
                {/* Popular Starting Point Badge */}
                <div className="absolute top-0 right-0 bg-success text-success-foreground font-meta text-[11px] sm:text-xs px-4 py-1.5 rounded-bl-card rounded-tr-card border-b border-l border-border uppercase tracking-wider font-bold shadow-2xs">
                  Popular Starting Point
                </div>

                {/* Scenario Image */}
                {(() => {
                  const img = getScenarioImage(featuredScenario.key);
                  return img ? (
                    <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-control border border-border overflow-hidden relative shrink-0 shadow-xs">
                      <Image
                        src={img}
                        alt={featuredScenario.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                        placeholder="blur"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-full md:w-1/3 aspect-video md:aspect-square rounded-control border border-border bg-linear-to-br overflow-hidden relative shrink-0 flex items-center justify-center shadow-xs",
                        meta.gradientClass,
                      )}
                    >
                      <div className="absolute inset-0 flex items-center justify-center mix-blend-overlay opacity-60">
                        {renderScenarioIcon(
                          meta.iconName,
                          "w-20 h-20 md:w-28 md:h-28 text-white",
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Content */}
                <div className="flex-1 w-full">
                  <div className="font-meta text-xs text-muted-foreground uppercase tracking-widest mb-2 sm:mb-3">
                    {meta.categoryLabel}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-foreground mb-3 sm:mb-4">
                    {featuredScenario.title}
                  </h2>
                  <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 max-w-xl leading-relaxed">
                    {featuredScenario.summary}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8 items-center">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full border border-border bg-surface-raised font-meta text-xs text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="px-3 py-1 rounded-full border border-border bg-surface-raised flex items-center gap-1.5 font-meta text-xs text-foreground">
                      <BarChartIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      Difficulty: {meta.difficulty}
                    </span>
                  </div>

                  <Link
                    href={`/app/scenarios/${encodeURIComponent(featuredScenario.key)}`}
                    className="inline-flex items-center gap-2 rounded-control bg-primary px-6 sm:px-8 py-3.5 sm:py-4 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-200 ease-out"
                  >
                    Start Simulation
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Scenario Grid */}
      {gridScenarios.length > 0 ? (
        <section aria-label="Available scenarios" className="mb-12 sm:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Dedicated Custom Scenario Creation Tile */}
            {(selectedFilter === "ALL" || selectedFilter === "CUSTOM") && (
              <div
                onClick={() => setCreateCustomOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setCreateCustomOpen(true);
                  }
                }}
                className="relative rounded-card p-6 flex flex-col justify-between border-2 border-dashed border-primary/50 bg-linear-to-br from-primary/10 via-surface to-surface-raised shadow-xs hover:border-primary hover:shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group select-none min-h-[340px]"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/15 border border-primary/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" />
                      Tailored
                    </span>
                    <span className="font-meta text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-surface-raised font-bold text-foreground">
                      Free Demo
                    </span>
                  </div>

                  <div className="h-28 mb-5 rounded-control border border-border/60 bg-primary/10 flex flex-col items-center justify-center gap-2 group-hover:bg-primary/15 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xl group-hover:scale-110 transition-transform">
                      💼
                    </div>
                    <span className="font-meta text-[11px] uppercase tracking-wider text-primary font-bold">
                      AI Resume Simulator
                    </span>
                  </div>

                  <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                    Build Custom Interview
                  </h3>

                  <p className="font-sans text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    Upload your CV & job description to practice interview
                    questions tailored to your exact background.
                  </p>
                </div>

                <div className="w-full pt-4 border-t border-border/15 flex items-center justify-between mt-auto">
                  <span className="font-meta text-xs font-bold text-primary group-hover:underline underline-offset-4">
                    Create New →
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-2xs group-hover:shadow-[2px_2px_0px_0px_#1a1a1a] transition-all">
                    <span>Build</span>
                    <SparklesIcon className="w-3 h-3" />
                  </span>
                </div>
              </div>
            )}

            {gridScenarios.map((scenario) => {
              const meta = getScenarioMeta(scenario);
              return (
                <article
                  key={scenario.key}
                  className="relative glass-surface rounded-card p-6 flex flex-col group transition-all duration-200 ease-out hover:shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
                >
                  {scenario.isCustom && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground font-meta text-[10px] px-3 py-1 rounded-bl-card rounded-tr-card border-b border-l border-border uppercase tracking-wider font-bold shadow-2xs z-20">
                      Custom
                    </div>
                  )}

                  {/* Card Visual Header */}
                  {(() => {
                    const img = getScenarioImage(scenario.key);
                    return img ? (
                      <div className="h-32 mb-5 sm:mb-6 rounded-control border border-border relative overflow-hidden shadow-xs">
                        <Image
                          src={img}
                          alt={scenario.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover object-top"
                          placeholder="blur"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "h-32 mb-5 sm:mb-6 rounded-control border border-border relative overflow-hidden flex items-center justify-center shadow-xs bg-linear-to-br",
                          meta.gradientClass,
                        )}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0,transparent_100%)] pointer-events-none" />
                        <div className="relative z-10">
                          {renderScenarioIcon(
                            meta.iconName,
                            "w-12 h-12 text-white/70",
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category */}
                  <div className="font-meta text-xs text-muted-foreground uppercase tracking-widest mb-2">
                    {meta.categoryLabel}
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground mb-3 leading-snug group-hover:text-primary transition-colors duration-200">
                    {scenario.title}
                  </h3>

                  {/* Summary */}
                  <p className="font-sans text-sm text-muted-foreground mb-6 grow leading-relaxed line-clamp-3">
                    {scenario.summary}
                  </p>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between border-t border-border/15 pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <span className="font-meta text-[11px] px-2.5 py-1 rounded-control bg-surface-raised border border-border/30 text-foreground">
                        Diff: {meta.difficulty}
                      </span>
                      {scenario.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingScenario(scenario);
                            setDeleteError(null);
                          }}
                          className="p-1 rounded-control text-muted-foreground hover:text-alert hover:bg-alert/10 transition-colors cursor-pointer"
                          aria-label={`Delete custom interview ${scenario.title}`}
                          title="Delete custom scenario"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Link
                      href={`/app/scenarios/${encodeURIComponent(scenario.key)}`}
                      className="font-meta text-xs sm:text-sm font-bold text-primary flex items-center gap-1 group-hover:underline underline-offset-4"
                    >
                      View scenario
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : selectedFilter === "CUSTOM" ? (
        /* Dedicated Empty State for Custom Filter */
        <div className="glass-surface rounded-card p-12 text-center my-8 border-2 border-dashed border-primary/40 bg-primary/5">
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xl mx-auto mb-4 font-bold">
            💼
          </div>
          <p className="font-display text-xl font-bold uppercase tracking-tight text-foreground mb-2">
            No custom scenarios created yet
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            Upload your CV and target job description to generate your first
            personalized interview rehearsal simulation.
          </p>
          <button
            type="button"
            onClick={() => setCreateCustomOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-control bg-primary text-primary-foreground font-display text-xs sm:text-sm font-bold uppercase tracking-wider border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Create Custom Interview</span>
          </button>
        </div>
      ) : (
        /* Empty State for other filters */
        <div className="glass-surface rounded-card p-12 text-center my-8">
          <p className="font-display text-lg font-bold text-foreground mb-2">
            No scenarios found
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            There are no scenarios matching the selected category filter.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className="px-6 py-2.5 rounded-control bg-surface-solid border border-border font-meta text-xs font-bold text-foreground shadow-[2px_2px_0px_0px_#1a1a1a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 ease-out cursor-pointer"
          >
            Show All Scenarios
          </button>
        </div>
      )}

      {/* Bottom CTA Section */}
      <section
        aria-label="Guided warm-up recommendation"
        className="mt-16 sm:mt-24 mb-8 sm:mb-12"
      >
        <div className="relative overflow-hidden bg-primary-muted/30 backdrop-blur-md border border-border rounded-card p-8 sm:p-12 text-center shadow-[8px_8px_0px_0px_#1a1a1a]">
          <div
            aria-hidden="true"
            className="absolute -top-10 -left-10 w-32 h-32 bg-primary rounded-full mix-blend-multiply opacity-20 blur-xl pointer-events-none"
          />
          <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 relative z-10">
            Not sure where to start?
          </h3>
          <p className="font-sans text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-8 relative z-10 leading-relaxed">
            The most common request we see is navigating compensation
            conversations. Jump into a guided warm-up.
          </p>
          <Link
            href="/app/scenarios/salary-negotiation"
            className="relative z-10 px-6 sm:px-8 py-3.5 sm:py-4 bg-surface-solid text-foreground font-display text-xs sm:text-sm font-bold uppercase tracking-wider border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-200 ease-out inline-flex items-center gap-2 rounded-control"
          >
            Try Salary Negotiation
            <PlayIcon className="w-3.5 h-3.5 fill-foreground" />
          </Link>
        </div>
      </section>

      <CreateCustomScenarioDialog
        open={createCustomOpen}
        onClose={() => setCreateCustomOpen(false)}
        userEffectivePlan={userPlan}
      />

      {deletingScenario && (
        <DeleteCustomScenarioDialog
          open={Boolean(deletingScenario)}
          scenarioTitle={deletingScenario.title}
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) {
              setDeletingScenario(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
