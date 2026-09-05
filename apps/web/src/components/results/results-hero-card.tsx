"use client";

import type { AttemptDetailResponse, EvaluationData } from "@kalemny/contracts";
import Link from "next/link";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  RefreshIcon,
  TargetIcon,
  TrashIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import { getScoreBand, getSkillMetadata } from "@/lib/score-utils";

export interface ResultsHeroCardProps {
  attempt: AttemptDetailResponse["data"];
  evaluation: EvaluationData;
  retrying: boolean;
  onOpenRetryModal: () => void;
  onOpenTranscriptModal: () => void;
  onOpenDeleteModal: () => void;
}

export function ResultsHeroCard({
  attempt,
  evaluation,
  retrying,
  onOpenRetryModal,
  onOpenTranscriptModal,
  onOpenDeleteModal,
}: ResultsHeroCardProps) {
  const overallBand = getScoreBand(evaluation.overallScore);
  const nextSkillMeta = getSkillMetadata(evaluation.nextFocus.skill);

  const displayDate = new Date(
    attempt.endedAt ?? attempt.startedAt,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Top Badges & Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-border/20 pb-3 sm:pb-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="directional-icon h-4 w-4" />
            <span className="hidden sm:inline">Back to</span> Practice
          </Link>
          <span className="text-border/40 font-meta text-xs">/</span>
          <span className="font-meta text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Results
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenTranscriptModal}
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-subtle bg-surface-solid px-3 text-xs font-semibold text-foreground hover:bg-surface-subtle"
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span>Transcript ({attempt.turns.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenDeleteModal}
            title="Delete rehearsal attempt"
            className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-border-subtle bg-surface-solid text-muted-foreground hover:border-alert/30 hover:bg-alert/5 hover:text-alert"
            aria-label="Delete rehearsal attempt"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Hero Score Card */}
      <section
        className="rounded-card border border-border-subtle bg-surface-solid p-5 shadow-xs sm:p-8"
        data-od-id="results-overview"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          {/* Left: Scenario Info & Summary */}
          <div className="space-y-3 sm:space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border border-border font-meta text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
                {attempt.difficulty}
              </span>
              <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                Completed
              </span>
              <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
                {displayDate}
              </span>
            </div>

            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                {attempt.scenario.title}
              </h1>
            </div>

            {/* Executive AI Coaching Summary */}
            <div className="space-y-1 rounded-control border border-border-subtle bg-surface-subtle p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                Coaching summary
              </span>
              <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed">
                {evaluation.summary}
              </p>
            </div>
          </div>

          {/* Right: Brutalist Score Pill & Composition */}
          <div className="flex w-full shrink-0 flex-col items-center justify-center space-y-4 border-t border-border-subtle pt-5 sm:w-auto sm:items-end lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
            <div className="text-center lg:text-right">
              <span className="font-meta text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">
                Overall Score
              </span>
              <div className="flex items-baseline justify-center lg:justify-end gap-1">
                <span className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-primary tracking-tight">
                  {evaluation.overallScore}
                </span>
                <span className="font-meta text-sm sm:text-base text-muted-foreground font-semibold">
                  / 100
                </span>
              </div>
              <span
                className={cn(
                  "inline-block font-meta text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border mt-1",
                  overallBand.badgeClass,
                )}
              >
                {overallBand.label}
              </span>
            </div>

            {/* Deterministic Score Composition Breakdown */}
            <div className="w-full sm:w-64 space-y-2 font-sans text-xs border-t border-border/10 pt-3">
              <div className="flex justify-between items-center text-muted-foreground text-[11px] sm:text-xs">
                <span>Universal Skills (70%)</span>
                <strong className="text-foreground font-semibold">
                  {evaluation.universalScore} / 100
                </strong>
              </div>
              <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-border/20">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${evaluation.universalScore}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-muted-foreground text-[11px] sm:text-xs pt-1">
                <span>Scenario Objectives (30%)</span>
                <strong className="text-foreground font-semibold">
                  {evaluation.scenarioScore} / 100
                </strong>
              </div>
              <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-border/20">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${evaluation.scenarioScore}%` }}
                />
              </div>
            </div>

            {/* Retry Button */}
            <div className="pt-1.5 w-full">
              <button
                type="button"
                onClick={onOpenRetryModal}
                disabled={retrying}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-primary px-6 text-sm font-semibold text-primary-foreground brutalist-interactive disabled:opacity-50"
                data-od-id="retry-practice-button"
              >
                <RefreshIcon
                  className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4",
                    retrying && "animate-spin",
                  )}
                />
                <span>{retrying ? "Starting…" : "Retry this practice"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Next Focus Banner */}
      <section
        className="flex flex-col justify-between gap-4 rounded-card border border-primary/20 bg-primary-muted p-5 sm:flex-row sm:items-center sm:p-6"
        data-od-id="next-focus"
      >
        <div className="flex items-start gap-3 sm:gap-3.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
            <TargetIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-meta text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
                Next focus
              </span>
              <span className="font-meta text-xs text-border/40">·</span>
              <span className="font-display text-xs sm:text-sm font-bold text-foreground">
                {nextSkillMeta.name}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-0.5 sm:mt-1 leading-relaxed max-w-2xl">
              {evaluation.nextFocus.reason}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenRetryModal}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-primary/20 bg-surface-solid px-4 text-sm font-semibold text-primary hover:border-primary/40 sm:w-auto"
        >
          <span>Focus in Retry</span>
          <ArrowRightIcon className="directional-icon h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
