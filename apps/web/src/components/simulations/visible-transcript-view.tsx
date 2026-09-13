"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationTurn } from "@kalemny/contracts";

import {
  ArrowDownIcon,
  DocumentTextIcon,
  MicIcon,
  RefreshIcon,
  VolumeIcon,
} from "@/components/icons";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/cn";

export interface PendingTurnState {
  text: string;
  inputMethod: "VOICE" | "TEXT";
  status: "sending" | "transcribing" | "error";
}

export interface VisibleTranscriptViewProps {
  turns: ConversationTurn[];
  pendingTurn?: PendingTurnState | null;
  counterpartName: string;
  counterpartRole: string;
  onReplaySpeech?: (turnId: string, text: string) => void;
  onRetryTurn?: (turnId: string) => void;
  retryingTurnId?: string | null;
  playingTurnId?: string | null;
}

export function VisibleTranscriptView({
  turns,
  pendingTurn,
  counterpartName,
  counterpartRole,
  onReplaySpeech,
  onRetryTurn,
  retryingTurnId,
  playingTurnId,
}: VisibleTranscriptViewProps) {
  const { isRtl } = useLocale();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if scrolled up more than 120px from bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 120);
  };

  const performScrollToBottom = (smooth = true) => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    } else if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (typeof container.scrollTo === "function") {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  const handleJumpToLatest = () => {
    performScrollToBottom(true);
    setShowJumpToLatest(false);
  };

  // Auto-scroll on new turns or pending turn changes
  useEffect(() => {
    performScrollToBottom(true);
  }, [turns.length, pendingTurn?.text, pendingTurn?.status]);

  const isEmpty = turns.length === 0 && !pendingTurn;

  return (
    <div
      className="relative flex h-full flex-1 flex-col overflow-hidden"
      data-testid="visible-transcript-view"
    >
      <div
        ref={scrollContainerRef}
        role="log"
        aria-live="polite"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
      >
        {isEmpty ? (
          <div
            data-testid="transcript-empty-state"
            className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-card border border-border-subtle bg-surface-subtle p-6 text-center shadow-xs"
          >
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {isRtl
                ? "بدأت المحادثة الآن. استمع لمحاورك أو خذ زمام المبادرة عندما تكون جاهزاً."
                : "The conversation has started. Listen to your counterpart or take the floor when ready."}
            </p>
          </div>
        ) : (
          <>
            {turns.map((turn, index) => {
              const counterpartText =
                turn.assistantText ?? (turn as unknown as { counterpartResponse?: string }).counterpartResponse;
              const hasCounterpartResponse = Boolean(counterpartText);
              const isRetrying = retryingTurnId === turn.id;
              const isPlaying = playingTurnId === turn.id;
              const isVoice = turn.inputMethod === "VOICE";

              return (
                <div key={turn.id} className="space-y-4">
                  {/* Learner Turn Bubble */}
                  <div
                    data-testid="learner-turn-bubble"
                    data-turn-role="learner"
                    className="ms-auto me-0 max-w-[88%] sm:max-w-[80%] rounded-card border border-primary/20 bg-primary-muted p-4 text-foreground"
                  >
                    {/* Header */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold text-foreground sm:text-sm">
                          {isRtl ? `الجولة ${index + 1}` : `Turn ${index + 1}`}
                        </span>
                        <span
                          data-testid="input-method-badge"
                          className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-solid/80 px-2 py-0.5 font-meta text-[11px] font-medium text-foreground"
                        >
                          {isVoice ? (
                            <>
                              <MicIcon className="h-3 w-3 text-primary" aria-hidden="true" />
                              <span>{isRtl ? "صوت" : "Voice"}</span>
                            </>
                          ) : (
                            <>
                              <DocumentTextIcon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                              <span>{isRtl ? "كتابة" : "Typed"}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Retry action */}
                      {onRetryTurn && (
                        <button
                          type="button"
                          onClick={() => onRetryTurn(turn.id)}
                          disabled={isRetrying}
                          aria-label={
                            isRetrying
                              ? isRtl
                                ? "جارٍ إعادة المحاولة..."
                                : "Retrying…"
                              : isRtl
                                ? "إعادة هذه الجولة"
                                : "Retry this turn"
                          }
                          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-surface-solid px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RefreshIcon
                            className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
                            aria-hidden="true"
                          />
                          <span>
                            {isRetrying
                              ? isRtl
                                ? "جارٍ إعادة المحاولة..."
                                : "Retrying…"
                              : isRtl
                                ? "إعادة هذه الجولة"
                                : "Retry this turn"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
                      {turn.userText}
                    </p>
                  </div>

                  {/* Counterpart Turn Bubble */}
                  {hasCounterpartResponse && (
                    <div
                      data-testid="counterpart-turn-bubble"
                      data-turn-role="counterpart"
                      className="ms-0 me-auto max-w-[88%] sm:max-w-[80%] rounded-card border border-border-subtle bg-surface-solid p-4 text-foreground shadow-xs"
                    >
                      {/* Header */}
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs font-bold text-foreground sm:text-sm">
                            {counterpartName}
                          </span>
                          <span className="font-meta text-[11px] text-muted-foreground">
                            • {counterpartRole}
                          </span>
                        </div>

                        {/* On-demand speech button */}
                        {onReplaySpeech && counterpartText && (
                          <button
                            type="button"
                            onClick={() => onReplaySpeech(turn.id, counterpartText)}
                            aria-label={
                              isPlaying
                                ? isRtl
                                  ? "جارٍ تشغيل الصوت"
                                  : "Playing speech"
                                : isRtl
                                  ? "إعادة تشغيل الصوت"
                                  : "Replay speech"
                            }
                            className={cn(
                              "inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                              isPlaying
                                ? "border-primary bg-primary-muted text-primary"
                                : "border-border bg-surface-subtle text-foreground hover:bg-surface-raised",
                            )}
                          >
                            <VolumeIcon
                              className={cn("h-4 w-4", isPlaying && "animate-pulse")}
                              aria-hidden="true"
                            />
                            <span>
                              {isPlaying
                                ? isRtl
                                  ? "جارٍ التشغيل…"
                                  : "Playing…"
                                : isRtl
                                  ? "تشغيل الصوت"
                                  : "Replay"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Body */}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
                        {counterpartText}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending Turn Bubble */}
            {pendingTurn && (
              <div
                data-testid="pending-turn-bubble"
                className="ms-auto me-0 max-w-[88%] sm:max-w-[80%] animate-pulse rounded-card border border-dashed border-primary/40 bg-primary-muted/80 p-4 text-foreground shadow-xs"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-foreground sm:text-sm">
                      {isRtl ? `الجولة ${turns.length + 1}` : `Turn ${turns.length + 1}`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-solid/80 px-2 py-0.5 font-meta text-[11px] font-medium text-foreground">
                      {pendingTurn.inputMethod === "VOICE" ? (
                        <>
                          <MicIcon className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span>{isRtl ? "صوت" : "Voice"}</span>
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span>{isRtl ? "كتابة" : "Typed"}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 font-meta text-xs font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    {pendingTurn.status === "sending" && (isRtl ? "جارٍ الإرسال…" : "Sending…")}
                    {pendingTurn.status === "transcribing" && (isRtl ? "جارٍ تحويل الصوت إلى نص…" : "Transcribing…")}
                    {pendingTurn.status === "error" && (isRtl ? "خطأ" : "Error")}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">
                  {pendingTurn.text}
                </p>
              </div>
            )}

            {/* Anchor element for auto-scrolling */}
            <div ref={bottomRef} data-testid="transcript-bottom-anchor" />
          </>
        )}
      </div>

      {/* Floating "Jump to latest" pill button */}
      {showJumpToLatest && (
        <button
          type="button"
          onClick={handleJumpToLatest}
          aria-label={isRtl ? "الانتقال إلى الأحدث" : "Jump to latest"}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-solid px-4 text-xs font-semibold text-foreground shadow-raised transition-all hover:bg-surface-raised"
        >
          <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
          <span>{isRtl ? "الانتقال إلى الأحدث" : "Jump to latest"}</span>
        </button>
      )}
    </div>
  );
}
