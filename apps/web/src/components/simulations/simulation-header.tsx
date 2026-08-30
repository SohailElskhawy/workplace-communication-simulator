"use client";

import type { Difficulty } from "@kalemny/contracts";
import Link from "next/link";

import {
  ArrowLeftIcon,
  FlagIcon,
  ForumIcon,
  RefreshIcon,
  TimerIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

export interface SimulationHeaderProps {
  scenarioTitle: string;
  difficulty: Difficulty;
  counterpartRole: string;
  turnCount: number;
  elapsedSeconds: number;
  finishing: boolean;
  onOpenFinishDialog: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function SimulationHeader({
  scenarioTitle,
  difficulty,
  counterpartRole,
  turnCount,
  elapsedSeconds,
  finishing,
  onOpenFinishDialog,
}: SimulationHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Back Link & Scenario Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface-solid text-muted-foreground hover:text-foreground hover:bg-surface-subtle brutalist-shadow-sm transition-all cursor-pointer"
            aria-label="Back to scenarios"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm sm:text-base uppercase tracking-tight text-foreground line-clamp-1">
                {scenarioTitle}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full border border-border font-meta text-[10px] font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
                {difficulty}
              </span>
            </div>
            <div className="flex items-center gap-2 font-meta text-xs text-muted-foreground">
              <span>Speaking with {counterpartRole}</span>
            </div>
          </div>
        </div>

        {/* Right: Timer, Turn Count, and Finish Action */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 font-meta text-xs text-muted-foreground bg-surface-subtle px-2.5 py-1 rounded-control border border-border/30">
            <TimerIcon className="w-3.5 h-3.5" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-meta text-xs text-muted-foreground bg-surface-subtle px-2.5 py-1 rounded-control border border-border/30">
            <ForumIcon className="w-3.5 h-3.5" />
            <span>
              {turnCount} / 20 <span className="hidden lg:inline">turns</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenFinishDialog}
            disabled={finishing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-control px-3.5 sm:px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white border border-border brutalist-interactive cursor-pointer",
              turnCount >= 1 ? "bg-primary" : "bg-muted-foreground/80 hover:bg-muted-foreground",
            )}
          >
            {finishing ? (
              <>
                <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Evaluating...</span>
              </>
            ) : (
              <>
                <FlagIcon className="w-3.5 h-3.5" />
                <span>Finish</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
