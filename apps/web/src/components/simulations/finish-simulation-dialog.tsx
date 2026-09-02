"use client";

import { AccessibleDialog } from "@/components/accessible-dialog";

export interface FinishSimulationDialogProps {
  open: boolean;
  turnCount: number;
  finishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function FinishSimulationDialog({
  open,
  turnCount,
  finishing,
  onClose,
  onConfirm,
}: FinishSimulationDialogProps) {
  const isTooShort = turnCount < 1;

  return (
    <AccessibleDialog
      open={open}
      title="Finish Rehearsal Session?"
      description="Ready to evaluate your communication performance and review structured feedback?"
      onClose={() => {
        if (!finishing) onClose();
      }}
    >
      <div className="space-y-4">
        {isTooShort ? (
          <div className="rounded-control border-2 border-amber-300 bg-amber-50 p-3.5 text-amber-950 text-xs leading-relaxed">
            <strong>Note:</strong> You have not sent any messages yet. Finishing
            now will mark the attempt as ended without evaluation scores.
          </div>
        ) : turnCount < 3 ? (
          <div className="rounded-control border border-border/40 bg-surface-subtle p-3.5 text-muted-foreground text-xs leading-relaxed">
            You have exchanged {turnCount} turns. For richer skill analysis and
            inclusion in your progress profile, 3 or more turns are recommended.
          </div>
        ) : (
          <div className="rounded-control border border-border/40 bg-surface-subtle p-3.5 text-muted-foreground text-xs leading-relaxed">
            Your {turnCount} exchanged turns will be analyzed across universal
            skills and scenario-specific objectives.
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={finishing}
            className="rounded-control border border-border bg-surface-solid px-4 py-2.5 sm:py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle disabled:opacity-50 cursor-pointer text-center"
          >
            Continue Practice
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={finishing}
            className="rounded-control bg-primary px-5 py-2.5 sm:py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer text-center"
          >
            {finishing ? "Evaluating..." : "Finish & Evaluate"}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
