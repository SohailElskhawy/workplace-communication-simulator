"use client";

import { CloseIcon, SparklesIcon } from "@/components/icons";
import { CustomInterviewWizard } from "./custom-interview-wizard";

export interface CreateCustomScenarioDialogProps {
  open: boolean;
  onClose: () => void;
  userEffectivePlan?: "FREE" | "PLUS" | "PRO";
}

export function CreateCustomScenarioDialog({
  open,
  onClose,
  userEffectivePlan = "FREE",
}: CreateCustomScenarioDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-scenario-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-card border-2 border-border bg-surface-solid p-6 sm:p-8 shadow-brutal outline-none my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/20 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-control bg-primary text-primary-foreground">
              <SparklesIcon className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="custom-scenario-title"
                className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground"
              >
                Create Custom Interview
              </h2>
              <p className="font-meta text-xs text-muted-foreground uppercase tracking-wider">
                Tailored AI Roleplay & Rubrics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-control text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <CustomInterviewWizard
          userEffectivePlan={userEffectivePlan}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
