"use client";

import Image from "next/image";
import type { PublicScenarioSummary } from "@kalemny/contracts";

import { ArrowRightIcon, PlayIcon, SparklesIcon } from "@/components/icons";
import { useLocale } from "@/lib/locale-context";
import { getScenarioImage } from "@/lib/scenario-images";

export interface ScenarioCardProps {
  scenario: PublicScenarioSummary;
  isRecommended?: boolean;
  onSelect: (scenarioKey: string) => void;
}

export function ScenarioCard({
  scenario,
  isRecommended = false,
  onSelect,
}: ScenarioCardProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  const portrait = getScenarioImage(scenario.key);
  const title = isArabic && scenario.titleAr ? scenario.titleAr : scenario.title;
  const summary =
    isArabic && scenario.summaryAr ? scenario.summaryAr : scenario.summary;

  return (
    <article
      data-od-id={`scenario-card-${scenario.key}`}
      className={`group flex flex-col justify-between rounded-card bg-surface-solid p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-raised ${
        isRecommended
          ? "border border-primary/40 ring-1 ring-primary/20"
          : "border border-border-subtle"
      }`}
    >
      <div>
        {/* Header: Static Portrait + Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-subtle">
            {portrait ? (
              <Image
                src={portrait}
                alt={title}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-muted-foreground">
                {title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-1 text-xs font-semibold text-primary">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isArabic ? "مقترح لك" : "Recommended"}</span>
              </span>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {scenario.category}
            </span>
          </div>
        </div>

        {/* Content: Title & Clamped Summary */}
        <div className="mt-4">
          <h3 className="font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </div>
      </div>

      {/* Footer Action */}
      <button
        type="button"
        onClick={() => onSelect(scenario.key)}
        className="mt-6 inline-flex min-h-[44px] w-full items-center justify-between border-t border-border-subtle pt-4 text-sm font-semibold text-foreground transition-colors group-hover:text-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="inline-flex items-center gap-2">
          <PlayIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{isArabic ? "تفاصيل التدرّب" : "View practice setup"}</span>
        </span>
        <ArrowRightIcon
          className="directional-icon h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </article>
  );
}
