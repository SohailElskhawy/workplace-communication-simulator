"use client";

import { AccessibleDialog } from "@/components/accessible-dialog";

export interface DeleteAttemptDialogProps {
  open: boolean;
  scenarioTitle: string;
  difficulty?: string;
  turnCount?: number;
  status?: string;
  deleteError: string | null;
  deleteLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAttemptDialog({
  open,
  scenarioTitle,
  difficulty,
  turnCount,
  status,
  deleteError,
  deleteLoading,
  onClose,
  onConfirm,
}: DeleteAttemptDialogProps) {
  return (
    <AccessibleDialog
      open={open}
      title="Delete rehearsal session?"
      description="This permanently deletes this rehearsal session, its conversation messages, and evaluation data. Later retry attempts remain preserved."
      onClose={() => {
        if (!deleteLoading) {
          onClose();
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-alert/10 text-alert border border-alert/20 text-lg shrink-0">
            ⚠️
          </span>
          <div>
            <p className="font-display text-sm font-bold text-foreground">
              {scenarioTitle}
            </p>
            <p className="font-meta text-xs text-muted-foreground">
              {difficulty ? `${difficulty} Difficulty` : ""}
              {turnCount !== undefined ? ` · ${turnCount} turns` : ""}
              {status ? ` · Status: ${status}` : ""}
            </p>
          </div>
        </div>

        {deleteError && (
          <div
            role="alert"
            className="rounded-control border border-alert/30 bg-alert/10 p-3 font-sans text-xs text-alert"
          >
            {deleteError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteLoading}
            className="rounded-control border border-border bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleteLoading}
            className="rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {deleteLoading ? "Deleting..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
