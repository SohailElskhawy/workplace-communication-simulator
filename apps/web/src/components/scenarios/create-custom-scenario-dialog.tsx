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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-scenario-title"
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-card border-2 border-border bg-surface-solid shadow-brutal outline-none overflow-hidden"
      >
        {/* Pinned Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-border/20 shrink-0 bg-surface-solid">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-control bg-primary text-primary-foreground">
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div>
              <h2
                id="custom-scenario-title"
                className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground"
              >
                Create Custom Interview
              </h2>
              <p className="font-meta text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
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

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-6 flex-1 space-y-4">
          <CustomInterviewWizard
            userEffectivePlan={userEffectivePlan}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
