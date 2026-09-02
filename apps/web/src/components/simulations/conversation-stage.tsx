"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  DocumentTextIcon,
  RefreshIcon,
  SpeakingWithIcon,
} from "@/components/icons";
import { SpeechButton } from "@/components/speech-button";
import { ConversationOrb } from "@/components/simulations/conversation-orb";
import type { SimulationUiState } from "@/components/simulations/conversation-orb";
import { cn } from "@/lib/cn";
import type { SpeechPlaybackStatus } from "@/lib/speech-playback-controller";
import type { LiveTranscriptEntry } from "@/lib/live-conversation-state";

export type { SimulationUiState };

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
  cancelSpeechPlayback: boolean;
  onSpeechStatusChange: (status: SpeechPlaybackStatus) => void;
  microphoneLevel: number;
  onOpenTranscript: () => void;
  /**
   * Ephemeral transcript of the current live voice session (finalized
   * user/agent utterances). Never persisted; rendered instead of the single
   * latest message while non-empty.
   */
  liveTranscript?: LiveTranscriptEntry[];
}

export function ConversationStage({
  attemptId,
  counterpartRole,
  openingMessage,
  latestAssistantMessage,
  turnCount,
  uiState,
  autoPlaySpeech,
  cancelSpeechPlayback,
  onSpeechStatusChange,
  microphoneLevel,
  onOpenTranscript,
  liveTranscript,
}: ConversationStageProps) {
  const message = useMemo(() => {
    if (latestAssistantMessage) return latestAssistantMessage;
    if (openingMessage) return { turnId: "opening", text: openingMessage };
    return null;
  }, [latestAssistantMessage, openingMessage]);
  const status = stateCopy[uiState];

  const liveEntries = liveTranscript ?? [];
  const showLiveTranscript = liveEntries.length > 0;

  // Keep the newest live utterance visible as the transcript grows.
  const liveTranscriptScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = liveTranscriptScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [showLiveTranscript, liveEntries.length]);

  return (
    <section
      className="flex flex-1 min-h-0 flex-col items-center justify-start sm:justify-center overflow-y-auto px-3 py-3 sm:px-8 sm:py-8"
      aria-label="Current conversation"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-7">
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
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

        <div className="rounded-card border-2 border-border bg-surface-solid shadow-brutal">
          {/* Conversation orb: the focal status indicator */}
          <div className="flex flex-col items-center px-4 pt-4 pb-2 sm:px-8 sm:pt-10 sm:pb-6">
            <ConversationOrb
              uiState={uiState}
              microphoneLevel={microphoneLevel}
              className="h-16 w-16 xs:h-20 xs:w-20 sm:h-36 sm:w-36"
            />
            <p className="mt-3 sm:mt-5 font-meta text-xs font-bold uppercase tracking-widest text-foreground">
              {status.label}
            </p>
            <p className="mt-1 max-w-68 sm:max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground sm:text-sm">
              {status.detail}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 border-t border-border/20 px-5 py-4 sm:px-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground">
              <SpeakingWithIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
                {counterpartRole}
              </p>
              <p className="font-meta text-[10px] uppercase tracking-widest text-primary">
                AI counterpart
              </p>
            </div>
          </div>

          {showLiveTranscript ? (
            <div className="border-t border-border/20 px-5 py-6 sm:px-8 sm:py-7">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                  Live session transcript
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-meta text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Live voice
                </span>
              </div>
              <div
                ref={liveTranscriptScrollRef}
                className="flex max-h-40 sm:max-h-64 flex-col gap-2.5 sm:gap-4 overflow-y-auto pr-1"
              >
                {liveEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex flex-col",
                      entry.role === "agent" ? "items-start" : "items-end",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 font-meta text-[10px] font-bold uppercase tracking-wider",
                        entry.role === "agent"
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {entry.role === "agent" ? counterpartRole : "You"}
                    </span>
                    <div
                      className={cn(
                        "max-w-[92%] rounded-card border border-border p-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap",
                        entry.role === "agent"
                          ? "rounded-tl-none bg-surface-subtle text-foreground"
                          : "rounded-tr-none bg-primary text-primary-foreground",
                      )}
                    >
                      {entry.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : message ? (
            <div className="border-t border-border/20 px-4 py-3 sm:px-8 sm:py-6">
              <p className="font-sans text-sm leading-relaxed text-foreground sm:text-base md:text-lg sm:leading-relaxed whitespace-pre-wrap">
                {message.text}
              </p>
              <SpeechButton
                key={message.turnId}
                attemptId={attemptId}
                turnId={message.turnId}
                autoPlay={autoPlaySpeech && uiState !== "AI_THINKING"}
                cancelPlayback={cancelSpeechPlayback}
                onStatusChange={onSpeechStatusChange}
              />
            </div>
          ) : (
            <div className="border-t border-border/20 px-5 py-8 text-center text-muted-foreground">
              <RefreshIcon
                className="mx-auto h-5 w-5 animate-spin text-primary"
                aria-hidden="true"
              />
              <p className="mt-3 font-sans text-sm">
                Preparing the conversation…
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
