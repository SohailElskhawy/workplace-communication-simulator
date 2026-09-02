"use client";

import { AccessibleDialog } from "@/components/accessible-dialog";

export interface DeleteCustomScenarioDialogProps {
  open: boolean;
  scenarioTitle: string;
  deleteError: string | null;
  deleteLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCustomScenarioDialog({
  open,
  scenarioTitle,
  deleteError,
  deleteLoading,
  onClose,
  onConfirm,
}: DeleteCustomScenarioDialogProps) {
  return (
    <AccessibleDialog
      open={open}
      title="Delete custom interview?"
      description="This will remove this custom interview simulation from your library. Any previously completed rehearsal attempts will remain in your history."
      onClose={() => {
        if (!deleteLoading) {
          onClose();
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-control bg-alert/5 border border-alert/20">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-alert/10 text-alert border border-alert/30 text-base shrink-0 font-bold">
            !
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-foreground truncate">
              {scenarioTitle}
            </p>
            <p className="font-meta text-xs text-muted-foreground">
              Custom Interview Scenario
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
            {deleteLoading ? "Deleting..." : "Delete Scenario"}
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
