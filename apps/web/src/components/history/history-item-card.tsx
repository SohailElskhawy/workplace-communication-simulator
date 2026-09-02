"use client";

import type { HistoryItem } from "@kalemny/contracts";
import Link from "next/link";

import { ArrowRightIcon, RefreshIcon, TrashIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatDelta, getScoreBand } from "@/lib/score-utils";

export interface HistoryItemCardProps {
  item: HistoryItem;
  parentItem: HistoryItem | null;
  onOpenDelete: (item: HistoryItem) => void;
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

export function HistoryItemCard({
  item,
  parentItem,
  onOpenDelete,
}: HistoryItemCardProps) {
  const statusInfo = formatStatus(item.status);
  const scoreBand =
    item.overallScore !== null ? getScoreBand(item.overallScore) : null;
  const isRetry = Boolean(item.retryOfAttemptId);

  const isComparableRetry =
    isRetry &&
    parentItem &&
    parentItem.difficulty === item.difficulty &&
    parentItem.overallScore !== null &&
    item.overallScore !== null;

  const isCrossDifficultyRetry =
    isRetry && parentItem && parentItem.difficulty !== item.difficulty;

  const scoreDelta = isComparableRetry
    ? item.overallScore! - parentItem!.overallScore!
    : null;

  const isFailed = item.status === "EVALUATION_FAILED";
  const isAbandoned = item.status === "ABANDONED";
  const isActive = item.status === "ACTIVE";

  const displayDate = new Date(
    item.completedAt ?? item.startedAt,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "glass-surface rounded-card p-6 md:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 ease-out",
        isFailed && "border-l-4 border-l-[#ffb3b0] bg-[#ffb3b0]/5",
        isRetry && !isFailed && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex-1 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full border border-border font-meta text-[11px] font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
            {item.difficulty}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-meta text-[11px] font-bold border",
              statusInfo.badgeClass,
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", statusInfo.dotClass)}
            />
            {statusInfo.label}
          </span>

          <span className="font-meta text-xs text-muted-foreground">
            {displayDate}
          </span>

          {isRetry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 font-meta text-[11px] font-bold uppercase tracking-wider">
              <RefreshIcon className="w-3 h-3" />
              <span>Retry</span>
            </span>
          )}
        </div>

        <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
          {item.scenario.title}
        </h3>

        {/* Retry relationship notes */}
        {isComparableRetry && scoreDelta !== null && (
          <div className="font-meta text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Previous: {parentItem?.overallScore} pts</span>
            <span>·</span>
            <span
              className={cn(
                "font-bold",
                scoreDelta > 0
                  ? "text-[#536600]"
                  : scoreDelta < 0
                    ? "text-[#ba1a1a]"
                    : "text-muted-foreground",
              )}
            >
              ({formatDelta(scoreDelta).text} pts vs previous attempt)
            </span>
          </div>
        )}

        {isCrossDifficultyRetry && (
          <p className="font-meta text-[11px] text-amber-800">
            Cross-difficulty retry ({parentItem?.difficulty} → {item.difficulty}
            ) · Non-equivalent comparison
          </p>
        )}

        {isFailed && (
          <p className="font-sans text-xs text-muted-foreground">
            The automated evaluation was incomplete. Your conversation
            transcript is safely preserved.
          </p>
        )}

        {isAbandoned && (
          <p className="font-sans text-xs text-muted-foreground">
            The simulation ended before conversation turns were exchanged.
          </p>
        )}
      </div>

      {/* Right Actions & Score */}
      <div className="flex flex-wrap items-center gap-4 self-end md:self-center">
        {!isFailed &&
          !isAbandoned &&
          scoreBand &&
          item.overallScore !== null && (
            <div className="text-right pr-2">
              <div className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                Overall Score
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl sm:text-3xl font-bold text-primary">
                  {item.overallScore}
                </span>
                <span className="font-meta text-xs text-muted-foreground">
                  / 100
                </span>
              </div>
            </div>
          )}

        {/* Action Navigation */}
        {isActive ? (
          <Link
            href={`/app/simulations/${encodeURIComponent(item.attemptId)}`}
            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-2xs brutalist-interactive"
          >
            <span>Resume</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href={`/app/results/${encodeURIComponent(item.attemptId)}`}
            className="inline-flex items-center gap-1.5 rounded-control bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground border border-border shadow-2xs brutalist-interactive hover:bg-surface-subtle"
          >
            <span>{isFailed ? "View & Retry" : "View Results"}</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onOpenDelete(item)}
          title="Delete Rehearsal Session"
          className="inline-flex items-center justify-center rounded-control border border-border bg-surface-solid p-2 text-muted-foreground hover:text-alert hover:border-alert brutalist-interactive cursor-pointer"
          aria-label={`Delete rehearsal session for ${item.scenario.title}`}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
