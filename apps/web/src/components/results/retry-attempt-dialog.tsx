"use client";

import type { Difficulty } from "@kalemny/contracts";

import { AccessibleDialog } from "@/components/accessible-dialog";
import { cn } from "@/lib/cn";
import { getSkillMetadata } from "@/lib/score-utils";

export interface RetryAttemptDialogProps {
  open: boolean;
  scenarioTitle: string;
  currentDifficulty: Difficulty;
  selectedDifficulty: Difficulty;
  nextFocusSkillKey: string;
  retryError: string | null;
  retrying: boolean;
  onSelectDifficulty: (d: Difficulty) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function RetryAttemptDialog({
  open,
  scenarioTitle,
  currentDifficulty,
  selectedDifficulty,
  nextFocusSkillKey,
  retryError,
  retrying,
  onSelectDifficulty,
  onClose,
  onConfirm,
}: RetryAttemptDialogProps) {
  const nextSkillMeta = getSkillMetadata(nextFocusSkillKey);

  return (
    <AccessibleDialog
      open={open}
      title="Start Rehearsal Retry"
      description={`Re-attempt ${scenarioTitle} with targeted coaching insights.`}
      onClose={() => {
        if (!retrying) onClose();
      }}
    >
      <div className="space-y-4">
        {/* Next Focus Reminder */}
        <div className="rounded-control bg-primary/10 border border-primary/20 p-3 text-xs">
          <span className="font-meta font-bold uppercase tracking-wider text-primary block mb-0.5">
            Target Focus Area:
          </span>
          <p className="font-sans text-foreground">
            Apply your coaching feedback to improve{" "}
            <strong>{nextSkillMeta.name}</strong>.
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-2">
          <label className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Select Difficulty:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => onSelectDifficulty(diff)}
                className={cn(
                  "p-2.5 text-center rounded-control font-display text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer",
                  selectedDifficulty === diff
                    ? "bg-primary text-primary-foreground border-border shadow-xs"
                    : "bg-surface-subtle text-foreground border-border/30 hover:border-border/60",
                )}
              >
                {diff}
                {diff === currentDifficulty && (
                  <span className="block font-meta text-[9px] font-normal opacity-80 lowercase">
                    (current)
                  </span>
                )}
              </button>
            ))}
          </div>

          {selectedDifficulty !== currentDifficulty && (
            <p className="font-meta text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-control p-2 leading-tight">
              Changing difficulty creates a cross-difficulty retry. Subsequent
              comparisons will note non-equivalent conditions.
            </p>
          )}
        </div>

        {retryError && (
          <div
            role="alert"
            className="rounded-control border border-alert/30 bg-alert/10 p-3 font-sans text-xs text-alert"
          >
            {retryError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={retrying}
            className="rounded-control border border-border bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={retrying}
            className="rounded-control bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {retrying ? "Starting Rehearsal..." : "Begin Rehearsal"}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
