"use client";

import { useAuth } from "@clerk/nextjs";
import type { Difficulty, PublicScenarioDetail } from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError, createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";

interface DifficultyOption {
  key: Difficulty;
  title: string;
  counterpart: string;
  description: string;
}

const DIFFICULTY_OPTIONS: Record<Difficulty, DifficultyOption> = {
  EASY: {
    key: "EASY",
    title: "Easy",
    counterpart: "Supportive Counterpart",
    description: "Concedes easily to reasonable points with minimal pushback.",
  },
  MEDIUM: {
    key: "MEDIUM",
    title: "Medium",
    counterpart: "Realistic Pushback",
    description: "Standard workplace objections and challenges unsupported claims.",
  },
  HARD: {
    key: "HARD",
    title: "Hard",
    counterpart: "Challenging Negotiation",
    description: "Skeptical counterpart who challenges vague reasoning firmly.",
  },
};

const SCENARIO_PRACTICE_SKILLS: Record<string, string[]> = {
  "salary-negotiation": [
    "Assertiveness",
    "Clarity",
    "Structure",
    "Value Framing",
  ],
  "behavioral-interview": [
    "Structure",
    "Confidence",
    "Clarity",
    "Storytelling",
  ],
  "promotion-request": [
    "Value Proposition",
    "Advancement",
    "Clarity",
    "Assertiveness",
  ],
  "manager-pushback": [
    "Constructive Pushback",
    "Alignment",
    "Empathy",
    "Structure",
  ],
  "difficult-feedback": [
    "Directness",
    "Empathy",
    "Clarity",
    "Objectivity",
  ],
  "scope-creep": [
    "Boundaries",
    "Prioritization",
    "Conciseness",
    "Assertiveness",
  ],
};

const DEFAULT_PRACTICE_SKILLS = [
  "Clarity",
  "Assertiveness",
  "Empathy",
  "Structure",
];

// Icons
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

function AssignmentIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SpeakingWithIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

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

function TimerIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ForumIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MicIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
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
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function PlayArrowIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// Memphis Abstract Hero Graphic
function MemphisHeroGraphic({
  scenarioKey,
  title,
}: {
  scenarioKey: string;
  title: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative w-full h-48 sm:h-60 md:h-64 glass-surface rounded-card overflow-hidden border border-border flex items-center justify-center select-none shadow-xs"
    >
      {/* Background Gradient & Dot Pattern */}
      <div className="absolute inset-0 bg-linear-to-br from-[#dfe3ff] via-[#fcf9f8] to-[#caf300]/30" />
      <div className="absolute inset-0 memphis-dot-grid opacity-60 pointer-events-none" />

      {/* Memphis Geometric Shapes */}
      {/* Top Right Decorative Arc */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border-2 border-border bg-[#0052ff]/10 pointer-events-none" />
      <div className="absolute top-4 right-12 w-6 h-6 rounded-full border border-border bg-[#d4ff00] pointer-events-none shadow-[2px_2px_0px_0px_#1a1a1a]" />

      {/* Bottom Left Decorative Wave & Square */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full border-2 border-border bg-[#ff6b6b]/15 pointer-events-none" />
      <div className="absolute bottom-6 left-10 w-8 h-8 rotate-12 border border-border bg-[#0052ff] pointer-events-none shadow-[3px_3px_0px_0px_#1a1a1a]" />

      {/* Center Memphis Composition */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-control bg-primary text-primary-foreground border border-border brutalist-shadow flex items-center justify-center">
            <span className="font-display text-xl font-extrabold uppercase">
              {title.charAt(0)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#c7ef00] border border-border flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#171e00]" />
          </div>
          <div className="w-10 h-10 rounded-control bg-[#ffdddb] border border-border rotate-6 flex items-center justify-center">
            <div className="w-4 h-4 border border-border rotate-45 bg-[#b8373b]" />
          </div>
        </div>
        <div className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {scenarioKey.replace(/-/g, " ")}
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function ScenarioDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full pb-16 animate-pulse"
    >
      <div className="mb-6 sm:mb-8">
        <div className="h-4 w-32 bg-border/20 rounded-control" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-8 flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-3">
            <div className="h-6 w-28 bg-border/20 rounded-full" />
            <div className="h-10 w-3/4 bg-border/20 rounded-control" />
            <div className="h-5 w-full bg-border/20 rounded-control" />
            <div className="h-5 w-2/3 bg-border/20 rounded-control" />
          </div>

          <div className="w-full h-48 sm:h-64 rounded-card bg-border/10 border border-border/20" />

          <div className="glass-surface rounded-card p-6 sm:p-8 flex flex-col gap-6 border border-border/20">
            <div className="h-6 w-36 bg-border/20 rounded-control" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-20 bg-border/10 rounded-control" />
              <div className="h-20 bg-border/10 rounded-control" />
              <div className="h-20 bg-border/10 rounded-control" />
              <div className="h-20 bg-border/10 rounded-control" />
            </div>
            <div className="h-24 bg-border/10 rounded-control" />
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="h-7 w-44 bg-border/20 rounded-control" />
          <div className="flex flex-col gap-3">
            <div className="h-24 bg-border/10 rounded-control border border-border/20" />
            <div className="h-24 bg-border/10 rounded-control border border-border/20" />
            <div className="h-24 bg-border/10 rounded-control border border-border/20" />
          </div>
          <div className="h-14 bg-border/20 rounded-control" />
        </div>
      </div>
    </div>
  );
}

export default function ScenarioDetailPage() {
  const params = useParams();
  const rawKey = params?.scenarioKey;
  const scenarioKey =
    (Array.isArray(rawKey) ? rawKey[0] : (rawKey as string | undefined)) ?? "";
  const decodedScenarioKey = decodeURIComponent(scenarioKey);

  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [scenario, setScenario] = useState<PublicScenarioDetail | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadScenario() {
      if (!isLoaded || !isSignedIn || !decodedScenarioKey) return;
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const data = await client.fetchScenarioDetail(token, decodedScenarioKey);

        if (!isMounted) return;
        setScenario(data);
        setFetchError(null);
        setIsNotFound(false);

        // Default to MEDIUM if available, else first available
        if (data.availableDifficulties.includes("MEDIUM")) {
          setSelectedDifficulty("MEDIUM");
        } else if (data.availableDifficulties[0]) {
          setSelectedDifficulty(data.availableDifficulties[0]);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setIsNotFound(true);
          setFetchError("Scenario not found.");
        } else {
          setFetchError(
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
  }, [isLoaded, isSignedIn, getToken, decodedScenarioKey, reloadToken]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    setIsNotFound(false);
    setReloadToken((prev) => prev + 1);
  }, []);

  async function handleStartSimulation() {
    if (starting) return;
    try {
      setStarting(true);
      setCreateError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const attempt = await client.createAttempt(token, {
        scenarioKey: decodedScenarioKey,
        difficulty: selectedDifficulty,
        retryOfAttemptId: null,
      });

      router.push(`/app/simulations/${encodeURIComponent(attempt.id)}`);
    } catch (err) {
      setCreateError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to start simulation attempt.",
      );
      setStarting(false);
    }
  }

  const practiceSkills = useMemo(() => {
    return (
      SCENARIO_PRACTICE_SKILLS[decodedScenarioKey] ?? DEFAULT_PRACTICE_SKILLS
    );
  }, [decodedScenarioKey]);

  if (loading) {
    return <ScenarioDetailSkeleton />;
  }

  // Not Found State
  if (isNotFound || (!scenario && !loading && !fetchError)) {
    return (
      <div className="w-full py-12 max-w-2xl mx-auto">
        <div className="glass-surface rounded-card p-8 text-center border border-border shadow-[6px_6px_0px_0px_#1a1a1a]">
          <div className="w-12 h-12 rounded-full bg-alert/20 text-alert border border-border mx-auto flex items-center justify-center mb-4">
            <span className="font-display text-xl font-bold">!</span>
          </div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
            Scenario Not Found
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
            The scenario &quot;{decodedScenarioKey}&quot; does not exist or may
            have been updated.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Scenarios
          </Link>
        </div>
      </div>
    );
  }

  // Error State
  if (fetchError || !scenario) {
    return (
      <div className="w-full py-12 max-w-2xl mx-auto">
        <div
          role="alert"
          className="glass-surface rounded-card p-8 text-center border border-alert bg-alert/5 shadow-[6px_6px_0px_0px_#1a1a1a]"
        >
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
            Unable to Load Scenario
          </h2>
          <p className="font-sans text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            {fetchError ?? "An unexpected error occurred while loading the briefing."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive cursor-pointer"
            >
              Try Again
            </button>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-control bg-surface-solid px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground border border-border brutalist-interactive"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Scenarios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16">
      {/* Back Navigation */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors font-meta text-xs sm:text-sm font-medium tracking-wide uppercase"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to scenarios
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Hero & Briefing */}
        <div className="lg:col-span-8 flex flex-col gap-6 sm:gap-8">
          {/* Hero Header */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="inline-flex items-center">
              <span className="bg-[#caf300] text-[#171e00] font-meta text-xs font-bold px-3 py-1 rounded-full border border-border tracking-wider uppercase">
                {scenario.category.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
              {scenario.title}
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {scenario.summary}
            </p>
          </div>

          {/* Memphis Geometric Hero Image Graphic */}
          <MemphisHeroGraphic
            scenarioKey={scenario.key}
            title={scenario.title}
          />

          {/* Briefing Glass Card */}
          <section className="glass-surface rounded-card p-6 sm:p-8 flex flex-col gap-6 sm:gap-8 border border-border shadow-xs">
            <div className="flex items-center justify-between border-b border-dashed border-border/20 pb-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
                Your Briefing
              </h2>
              <AssignmentIcon className="w-5 h-5 text-primary" />
            </div>

            {/* 2x2 Grid for Context & Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Situation */}
              <div className="flex flex-col gap-2">
                <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  SITUATION
                </h3>
                <p className="font-sans text-sm sm:text-base text-foreground font-medium leading-relaxed">
                  {scenario.context.description}
                </p>
              </div>

              {/* Your Role */}
              <div className="flex flex-col gap-2">
                <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  YOUR ROLE
                </h3>
                <div className="inline-flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <p className="font-sans text-sm sm:text-base text-foreground font-medium">
                    {scenario.context.userRole}
                  </p>
                </div>
              </div>

              {/* Speaking With */}
              <div className="flex flex-col gap-2">
                <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  SPEAKING WITH
                </h3>
                <div className="inline-flex items-center gap-2">
                  <SpeakingWithIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <p className="font-sans text-sm sm:text-base text-foreground font-medium">
                    {scenario.context.aiRole}
                  </p>
                </div>
              </div>

              {/* Stakes */}
              <div className="flex flex-col gap-2">
                <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  STAKES
                </h3>
                <p className="font-sans text-sm sm:text-base text-foreground font-medium leading-relaxed">
                  {scenario.context.stakes}
                </p>
              </div>
            </div>

            {/* Objective Box */}
            <div className="flex flex-col gap-2 bg-surface-subtle p-4 sm:p-5 rounded-control border border-border/15">
              <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-primary">
                OBJECTIVE
              </h3>
              <p className="font-sans text-base sm:text-lg text-foreground font-medium leading-snug">
                {scenario.context.userObjective}
              </p>
            </div>

            {/* Practice Skills */}
            <div className="flex flex-col gap-3 pt-4 border-t border-dashed border-border/20">
              <h3 className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                PRACTICE SKILLS
              </h3>
              <div className="flex flex-wrap gap-2">
                {practiceSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-surface-solid text-foreground border border-border rounded-full font-meta text-xs font-medium uppercase tracking-wider"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Simulation Setup & Actions */}
        <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
            Simulation Setup
          </h2>

          {/* Difficulty Selection */}
          <div
            className="flex flex-col gap-3 sm:gap-4"
            role="radiogroup"
            aria-label="Select simulation difficulty"
          >
            {scenario.availableDifficulties.map((diff) => {
              const isSelected = selectedDifficulty === diff;
              const diffInfo = DIFFICULTY_OPTIONS[diff] ?? {
                key: diff,
                title: diff,
                counterpart: "Counterpart",
                description: "Workplace counterpart for this scenario.",
              };

              return (
                <button
                  key={diff}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={cn(
                    "glass-surface p-4 rounded-control cursor-pointer text-left relative transition-all duration-200",
                    isSelected
                      ? "border-2 border-primary bg-surface-solid shadow-[6px_6px_0px_0px_#0052ff] -translate-x-0.5 -translate-y-0.5"
                      : "border border-border bg-surface/80 hover:bg-surface-subtle hover:border-border",
                  )}
                >
                  {diff === "MEDIUM" && (
                    <div className="absolute -top-3 right-4 bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full font-meta text-[10px] font-bold border border-border z-10 uppercase tracking-wider">
                      RECOMMENDED
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-display text-lg sm:text-xl font-bold uppercase tracking-tight",
                          isSelected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {diffInfo.title}
                      </span>
                      <span className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {diffInfo.counterpart}: {diffInfo.description}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/40 bg-surface-solid",
                      )}
                    >
                      {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-3" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Session Info Rows */}
          <div className="flex flex-col gap-3 py-4 border-y border-dashed border-border/20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <TimerIcon className="w-4 h-4 text-foreground shrink-0" />
              <span className="font-meta text-xs tracking-wider uppercase font-medium">
                ~15 MINUTE PRACTICE
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <ForumIcon className="w-4 h-4 text-foreground shrink-0" />
              <span className="font-meta text-xs tracking-wider uppercase font-medium">
                UP TO 20 RESPONSES
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MicIcon className="w-4 h-4 text-foreground shrink-0" />
              <span className="font-meta text-xs tracking-wider uppercase font-medium">
                TEXT + VOICE AVAILABLE
              </span>
            </div>
          </div>

          {/* Coaching Note */}
          <div className="glass-surface p-4 rounded-control bg-surface-subtle/80 border-dashed border-border/30">
            <div className="flex items-start gap-3">
              <LightbulbIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-display text-xs font-bold text-foreground uppercase tracking-tight">
                  Go in with your own approach
                </span>
                <span className="font-sans text-xs text-muted-foreground leading-relaxed">
                  Detailed feedback and structural analysis will be provided after
                  the session concludes.
                </span>
              </div>
            </div>
          </div>

          {/* Creation Error Banner if attempt creation failed */}
          {createError && (
            <div
              role="alert"
              className="rounded-control border border-alert bg-alert/10 p-3 text-foreground text-xs leading-relaxed"
            >
              <span className="font-bold text-alert">Error: </span>
              {createError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              type="button"
              onClick={() => void handleStartSimulation()}
              disabled={starting}
              className="w-full bg-primary text-primary-foreground font-display text-base font-bold py-4 px-6 rounded-control border border-border brutalist-interactive flex justify-center items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer uppercase tracking-wider"
            >
              {starting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-r-transparent mr-1" />
                  Starting Simulation...
                </>
              ) : (
                <>
                  Begin Simulation
                  <PlayArrowIcon className="w-4 h-4 fill-current" />
                </>
              )}
            </button>
            <Link
              href="/app"
              className="w-full text-center font-meta text-xs text-muted-foreground hover:text-foreground hover:underline py-2 transition-all tracking-wide uppercase"
            >
              Choose another scenario
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

