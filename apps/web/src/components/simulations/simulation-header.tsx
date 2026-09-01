"use client";

import type { Difficulty } from "@kalemny/contracts";
import Link from "next/link";

import {
  ArrowLeftIcon,
  FlagIcon,
  ForumIcon,
  RefreshIcon,
  TimerIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";

export interface SimulationHeaderProps {
  scenarioTitle: string;
  difficulty: Difficulty;
  counterpartRole: string;
  turnCount: number;
  elapsedSeconds: number;
  finishing: boolean;
  autoPlaySpeech: boolean;
  onToggleAutoPlay: () => void;
  /**
   * Hides the auto-play voice toggle when the chosen interaction mode never
   * auto-plays stored-turn TTS (realtime mode speaks through the live agent).
   */
  showAutoPlayToggle?: boolean;
  onOpenFinishDialog: () => void;
  onOpenBriefing?: () => void;
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
  autoPlaySpeech,
  showAutoPlayToggle = true,
  onToggleAutoPlay,
  onOpenFinishDialog,
  onOpenBriefing,
}: SimulationHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-surface/95 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back Link & Scenario Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link
            href="/app"
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-control border border-border bg-surface-solid text-muted-foreground hover:text-foreground hover:bg-surface-subtle shadow-[2px_2px_0px_0px_#1a1a1a] hover:shadow-none hover:translate-x-px hover:translate-y-px transition-all duration-200 ease-out cursor-pointer"
            aria-label="Back to scenarios"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-bold text-xs sm:text-base uppercase tracking-tight text-foreground truncate block">
                {scenarioTitle}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full border border-border font-meta text-[10px] font-bold uppercase tracking-wider bg-surface-subtle text-foreground shrink-0">
                {difficulty}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-meta text-[10px] sm:text-xs text-muted-foreground truncate">
              <span className="truncate">Speaking with {counterpartRole}</span>
            </div>
          </div>
        </div>

        {/* Right: Briefing (mobile), Sound toggle, Timer, Turn Count, and Finish Action */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {onOpenBriefing && (
            <button
              type="button"
              onClick={onOpenBriefing}
              className="md:hidden inline-flex items-center justify-center font-meta text-xs h-8 px-2 rounded-control border border-border bg-surface-subtle text-foreground hover:bg-surface-raised transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap"
              aria-label="View scenario briefing and objectives"
              title="View scenario briefing"
            >
              <span>Briefing</span>
            </button>
          )}

          {showAutoPlayToggle && (
            <button
              type="button"
              onClick={onToggleAutoPlay}
              className={cn(
                "inline-flex items-center justify-center gap-1 font-meta text-xs h-8 px-2 sm:h-auto sm:px-2.5 sm:py-1.5 rounded-control border transition-all duration-200 ease-out cursor-pointer shrink-0 whitespace-nowrap",
                autoPlaySpeech
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                  : "bg-surface-subtle border-border/40 text-muted-foreground hover:text-foreground",
              )}
              title={
                autoPlaySpeech
                  ? "Auto-play speech: ON"
                  : "Auto-play speech: OFF"
              }
              aria-label={
                autoPlaySpeech
                  ? "Disable auto-play voice"
                  : "Enable auto-play voice"
              }
            >
              {autoPlaySpeech ? (
                <VolumeIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <VolumeMuteIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="hidden sm:inline">
                {autoPlaySpeech ? "Voice On" : "Voice Off"}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 font-meta text-xs text-muted-foreground bg-surface-subtle px-2.5 py-1.5 rounded-control border border-border/30 shrink-0 whitespace-nowrap">
            <TimerIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-meta text-xs text-muted-foreground bg-surface-subtle px-2.5 py-1.5 rounded-control border border-border/30 shrink-0 whitespace-nowrap">
            <ForumIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {turnCount} / 20 <span className="hidden lg:inline">turns</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenFinishDialog}
            disabled={finishing}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-control h-8 px-3 sm:h-auto sm:px-4 sm:py-1.5 font-display text-xs font-bold uppercase tracking-wider text-white border border-border brutalist-interactive cursor-pointer shrink-0 whitespace-nowrap min-w-fit",
              turnCount >= 1
                ? "bg-primary"
                : "bg-muted-foreground/80 hover:bg-muted-foreground",
            )}
          >
            {finishing ? (
              <>
                <RefreshIcon className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="whitespace-nowrap">Evaluating...</span>
              </>
            ) : (
              <>
                <FlagIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">End conversation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
