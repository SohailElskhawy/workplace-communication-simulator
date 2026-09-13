"use client";

import type { PublicScenarioSummary } from "@kalemny/contracts";

import { useLocale } from "@/lib/locale-context";
import { ScenarioCard } from "./scenario-card";

export interface CuratedScenarioGridProps {
  scenarios: PublicScenarioSummary[];
  recommendedKey?: string;
  onSelectScenario: (key: string) => void;
}

export function CuratedScenarioGrid({
  scenarios,
  recommendedKey,
  onSelectScenario,
}: CuratedScenarioGridProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  const title = isArabic ? "سيناريوهات التدرّب" : "Practice Scenarios";
  const subtitle = isArabic
    ? "مواقف تفاعلية مصممة لبناء مهارات التواصل والحزم في بيئة العمل."
    : "Realistic workplace scenarios designed to build communication clarity and confidence.";

  return (
    <section
      aria-label={title}
      className="space-y-6"
      data-od-id="curated-scenario-grid"
    >
      {/* Section Header with count badge */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <span className="inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface-subtle px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {scenarios.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.key}
            scenario={scenario}
            isRecommended={scenario.key === recommendedKey}
            onSelect={onSelectScenario}
          />
        ))}
      </div>
    </section>
  );
}
