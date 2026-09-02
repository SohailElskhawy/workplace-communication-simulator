"use client";

import Link from "next/link";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  RefreshIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

export interface EvaluationFailureViewProps {
  error: string | null;
  attemptId: string;
  onRetry: () => void;
  retrying: boolean;
}

export function EvaluationFailureView({
  error,
  attemptId,
  onRetry,
  retrying,
}: EvaluationFailureViewProps) {
  return (
    <div className="w-full py-12 max-w-2xl mx-auto px-4">
      <div
        role="alert"
        className="glass-surface rounded-card p-6 sm:p-10 text-center border-2 border-alert bg-alert/5 shadow-[6px_6px_0px_0px_#1a1a1a] flex flex-col items-center"
      >
        <div className="w-12 h-12 rounded-full bg-alert/20 text-alert border border-border flex items-center justify-center mb-4 shadow-2xs">
          <AlertTriangleIcon className="w-6 h-6 text-alert" />
        </div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground mb-2">
          Evaluation Incomplete
        </h2>
        <p className="font-sans text-sm sm:text-base text-muted-foreground mb-3 max-w-md leading-relaxed">
          {error ??
            "The automated evaluation encountered an unexpected issue while analyzing the simulation."}
        </p>
        <p className="font-sans text-xs text-muted-foreground/80 mb-6 max-w-md leading-relaxed">
          Your conversation transcript is safely preserved on the server. You
          can retry generating your evaluation without losing any practice data.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          {/* 1. Retry Evaluation */}
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon
              className={cn("w-3.5 h-3.5", retrying && "animate-spin")}
            />
            <span>{retrying ? "Evaluating..." : "Retry Evaluation"}</span>
          </button>

          {/* 2. View Conversation */}
          <Link
            href={`/app/simulations/${encodeURIComponent(attemptId)}`}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface-solid px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground border border-border brutalist-interactive"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>View Conversation</span>
          </Link>

          {/* 3. Return Home */}
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface-subtle px-4 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground border border-border/40"
          >
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
