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
    <header
      className="shrink-0 border-b border-border-subtle bg-surface-solid/95 px-3 py-2 backdrop-blur-md sm:px-6"
      data-od-id="simulation-header"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back Link & Scenario Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link
            href="/app"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-solid text-muted-foreground transition-colors hover:border-border hover:bg-surface-subtle hover:text-foreground"
            aria-label="Back to scenarios"
          >
            <ArrowLeftIcon className="directional-icon h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="block truncate font-display text-sm font-semibold text-foreground sm:text-base">
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
              className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-control border border-border-subtle bg-surface-solid px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-subtle md:hidden"
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
                "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border px-3 text-xs font-semibold transition-colors",
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
            aria-label="Finish rehearsal session"
            className={cn(
              "inline-flex min-h-11 min-w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border px-3 text-xs font-semibold transition-colors sm:px-4",
              turnCount >= 1
                ? "border-alert/30 bg-alert/5 text-alert hover:bg-alert/10"
                : "border-border-subtle bg-surface-subtle text-muted-foreground",
            )}
            data-od-id="end-session-button"
          >
            {finishing ? (
              <>
                <RefreshIcon className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">Evaluating…</span>
                  <span className="hidden sm:inline">Evaluating...</span>
                </span>
              </>
            ) : (
              <>
                <FlagIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">Finish</span>
                  <span className="hidden sm:inline">End conversation</span>
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
