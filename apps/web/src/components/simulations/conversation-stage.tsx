"use client";

import { useMemo } from "react";

import {
  DocumentTextIcon,
  RefreshIcon,
  SpeakingWithIcon,
} from "@/components/icons";
import { SpeechButton } from "@/components/speech-button";
import { MicrophoneLevelVisualizer } from "@/components/simulations/microphone-level-visualizer";
import { cn } from "@/lib/cn";
import type { SpeechPlaybackStatus } from "@/lib/speech-playback-controller";

export type SimulationUiState =
  | "YOUR_TURN"
  | "LISTENING"
  | "TRANSCRIBING"
  | "REVIEWING"
  | "AI_THINKING"
  | "AI_SPEAKING";

const stateCopy: Record<SimulationUiState, { label: string; detail: string }> =
  {
    YOUR_TURN: {
      label: "Your turn",
      detail: "Respond when you are ready.",
    },
    LISTENING: {
      label: "Listening",
      detail: "Speak naturally, then choose Done speaking.",
    },
    TRANSCRIBING: {
      label: "Transcribing",
      detail: "Turning your recording into editable text.",
    },
    REVIEWING: {
      label: "Review your response",
      detail: "Edit the transcript before you send it.",
    },
    AI_THINKING: {
      label: "Thinking",
      detail: "Your counterpart is considering your response.",
    },
    AI_SPEAKING: {
      label: "Speaking",
      detail: "Your counterpart's voice is playing.",
    },
  };

export interface ConversationStageProps {
  attemptId: string;
  counterpartRole: string;
  openingMessage?: string | null;
  latestAssistantMessage?: { turnId: string; text: string } | null;
  turnCount: number;
  uiState: SimulationUiState;
  autoPlaySpeech: boolean;
  onSpeechStatusChange: (status: SpeechPlaybackStatus) => void;
  microphoneLevel: number;
  onOpenTranscript: () => void;
}

export function ConversationStage({
  attemptId,
  counterpartRole,
  openingMessage,
  latestAssistantMessage,
  turnCount,
  uiState,
  autoPlaySpeech,
  onSpeechStatusChange,
  microphoneLevel,
  onOpenTranscript,
}: ConversationStageProps) {
  const message = useMemo(() => {
    if (latestAssistantMessage) return latestAssistantMessage;
    if (openingMessage) return { turnId: "opening", text: openingMessage };
    return null;
  }, [latestAssistantMessage, openingMessage]);
  const status = stateCopy[uiState];

  return (
    <section
      className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-4 py-6 sm:px-8 sm:py-10"
      aria-label="Current conversation"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-7">
          <div className="flex items-center gap-2 text-muted-foreground">
            <SpeakingWithIcon
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <span className="font-meta text-[10px] font-bold uppercase tracking-widest">
              In conversation with
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTranscript}
            className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-solid px-2.5 py-1.5 font-meta text-[11px] font-bold uppercase tracking-wider text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-subtle"
            aria-label={`Open transcript with ${turnCount} turns`}
          >
            <DocumentTextIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Transcript{" "}
            <span className="text-muted-foreground">({turnCount})</span>
          </button>
        </div>

        <div className="rounded-card border-2 border-border bg-surface-solid p-5 shadow-brutal sm:p-8">
          <div className="flex items-center gap-4 border-b border-border/20 pb-5 sm:pb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground sm:h-14 sm:w-14">
              <SpeakingWithIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold uppercase tracking-tight text-foreground sm:text-xl">
                {counterpartRole}
              </p>
              <p className="mt-0.5 font-meta text-[10px] uppercase tracking-widest text-primary">
                AI counterpart
              </p>
            </div>
          </div>

          {message ? (
            <div className="py-6 sm:py-8">
              <p className="font-sans text-base leading-relaxed text-foreground sm:text-xl sm:leading-relaxed whitespace-pre-wrap">
                {message.text}
              </p>
              <SpeechButton
                key={message.turnId}
                attemptId={attemptId}
                turnId={message.turnId}
                autoPlay={autoPlaySpeech && uiState !== "AI_THINKING"}
                onStatusChange={onSpeechStatusChange}
              />
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <RefreshIcon
                className="mx-auto h-5 w-5 animate-spin text-primary"
                aria-hidden="true"
              />
              <p className="mt-3 font-sans text-sm">
                Preparing the conversation…
              </p>
            </div>
          )}

          <div
            className={cn(
              "flex items-start gap-3 rounded-control border p-3 sm:p-4",
              uiState === "YOUR_TURN" || uiState === "REVIEWING"
                ? "border-primary/30 bg-primary/5"
                : "border-border/30 bg-surface-subtle",
            )}
          >
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary",
                (uiState === "LISTENING" || uiState === "AI_SPEAKING") &&
                  "animate-pulse",
              )}
              aria-hidden="true"
            />
            <div>
              <p className="font-meta text-[11px] font-bold uppercase tracking-widest text-foreground">
                {status.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {status.detail}
              </p>
            </div>
            {uiState === "LISTENING" && (
              <MicrophoneLevelVisualizer level={microphoneLevel} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
