"use client";

import type {
  AttemptDetailResponse,
  EvaluationData,
} from "@kalemny/contracts";
import Link from "next/link";

import {
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
    <div className="space-y-6">
      {/* 1. Top Badges & Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app"
            className="font-meta text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            ← Back to Scenarios
          </Link>
          <span className="text-border/40 font-meta text-xs">/</span>
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Rehearsal Results
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTranscriptModal}
            className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-solid px-3 py-1.5 font-meta text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle brutalist-shadow-sm cursor-pointer"
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span>Transcript ({attempt.turns.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenDeleteModal}
            title="Delete rehearsal attempt"
            className="inline-flex items-center justify-center rounded-control border border-border bg-surface-solid p-1.5 text-muted-foreground hover:text-alert hover:border-alert brutalist-shadow-sm cursor-pointer"
            aria-label="Delete rehearsal attempt"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Hero Score Card */}
      <section className="glass-surface rounded-card border-2 border-border p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left: Scenario Info & Summary */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full border border-border font-meta text-xs font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
                {attempt.difficulty} Difficulty
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-border font-meta text-xs font-bold uppercase tracking-wider bg-[#d4ff00]/20 text-[#171e00]">
                Completed Rehearsal
              </span>
              <span className="font-meta text-xs text-muted-foreground">
                {displayDate}
              </span>
            </div>

            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
                {attempt.scenario.title}
              </h1>
            </div>

            {/* Executive AI Coaching Summary */}
            <div className="bg-surface-subtle border border-border/30 p-4 rounded-control space-y-1">
              <span className="font-meta text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Executive Coaching Summary
              </span>
              <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed">
                {evaluation.summary}
              </p>
            </div>
          </div>

          {/* Right: Brutalist Score Pill & Composition */}
          <div className="flex flex-col items-center sm:items-end justify-center shrink-0 border-t lg:border-t-0 lg:border-l border-border/20 pt-6 lg:pt-0 lg:pl-8 space-y-4">
            <div className="text-center lg:text-right">
              <span className="font-meta text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Overall Score
              </span>
              <div className="flex items-baseline justify-center lg:justify-end gap-1.5">
                <span className="font-display text-6xl sm:text-7xl font-bold text-primary tracking-tight">
                  {evaluation.overallScore}
                </span>
                <span className="font-meta text-base text-muted-foreground font-semibold">
                  / 100
                </span>
              </div>
              <span
                className={cn(
                  "inline-block font-meta text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border mt-1",
                  overallBand.badgeClass,
                )}
              >
                {overallBand.label}
              </span>
            </div>

            {/* Deterministic Score Composition Breakdown */}
            <div className="w-full sm:w-64 space-y-2 font-sans text-xs border-t border-border/10 pt-3">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Universal Skills (70%)</span>
                <strong className="text-foreground font-semibold">
                  {evaluation.universalScore} / 100
                </strong>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden border border-border/20">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${evaluation.universalScore}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-muted-foreground pt-1">
                <span>Scenario Objectives (30%)</span>
                <strong className="text-foreground font-semibold">
                  {evaluation.scenarioScore} / 100
                </strong>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden border border-border/20">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${evaluation.scenarioScore}%` }}
                />
              </div>
            </div>

            {/* Retry Button */}
            <div className="pt-2 w-full">
              <button
                type="button"
                onClick={onOpenRetryModal}
                disabled={retrying}
                className="w-full inline-flex items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-xs brutalist-interactive cursor-pointer disabled:opacity-50"
              >
                <RefreshIcon
                  className={cn("w-4 h-4", retrying && "animate-spin")}
                />
                <span>{retrying ? "Starting..." : "Retry Simulation"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Next Focus Banner */}
      <section className="glass-surface rounded-card border-2 border-primary bg-primary/5 p-5 sm:p-6 shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
            <TargetIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-meta text-[11px] font-bold uppercase tracking-wider text-primary">
                Next Focus Opportunity
              </span>
              <span className="font-meta text-xs text-border/40">·</span>
              <span className="font-display text-sm font-bold text-foreground">
                {nextSkillMeta.name}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-1 leading-relaxed max-w-2xl">
              {evaluation.nextFocus.reason}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenRetryModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-control bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shrink-0 shadow-2xs brutalist-interactive cursor-pointer"
        >
          <span>Focus in Retry</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </section>
    </div>
  );
}
