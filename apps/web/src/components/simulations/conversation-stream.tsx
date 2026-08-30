"use client";

import type { ConversationTurn } from "@kalemny/contracts";

import { AlertTriangleIcon, RefreshIcon } from "@/components/icons";
import { SpeechButton } from "@/components/speech-button";
import { cn } from "@/lib/cn";

export interface PendingTurnState {
  clientRequestId: string;
  text: string;
}

export interface ConversationStreamProps {
  attemptId: string;
  turns: ConversationTurn[];
  counterpartRole: string;
  openingMessage?: string | null;
  autoPlaySpeech?: boolean;
  pendingTurn: PendingTurnState | null;
  sendingTurn: boolean;
  pendingError: string | null;
  retryingTurnId: string | null;
  onRetryTurn: (turnId: string) => void;
  onRetryPending: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ConversationStream({
  attemptId,
  turns,
  counterpartRole,
  openingMessage,
  autoPlaySpeech = true,
  pendingTurn,
  sendingTurn,
  pendingError,
  retryingTurnId,
  onRetryTurn,
  onRetryPending,
  messagesEndRef,
}: ConversationStreamProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Welcome / Scenario Start Pill */}
      <div className="text-center py-2">
        <span className="inline-block px-3 py-1 rounded-full border border-border/30 bg-surface-subtle font-meta text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
          Simulation Started · Respond naturally
        </span>
      </div>

      {/* Opening Counterpart Message (First speaker in scenario) */}
      {openingMessage && (
        <div className="space-y-4">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-meta text-[10px] uppercase font-bold text-primary">
                {counterpartRole}
              </span>
              <span className="font-meta text-[10px] text-muted-foreground">
                Opening Statement
              </span>
            </div>

            <div className="max-w-xl rounded-card rounded-tl-none bg-surface-solid p-4 text-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a]">
              <p className="font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {openingMessage}
              </p>
              <SpeechButton
                attemptId={attemptId}
                turnId="opening"
                autoPlay={turns.length === 0 && autoPlaySpeech}
              />
            </div>
          </div>
        </div>
      )}

      {/* Render Conversation Turns */}
      {turns.map((turn: ConversationTurn, index: number) => {
        const isTurnRetrying = retryingTurnId === turn.id;
        const hasAssistantText = Boolean(turn.assistantText);
        const isTurnFailed = turn.status === "FAILED" || (!hasAssistantText && turn.status === "COMPLETED");
        const isLatestTurn = index === turns.length - 1;

        return (
          <div key={turn.id} className="space-y-4">
            {/* 1. Learner Message (Right Aligned) */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                  You
                </span>
                <span className="font-meta text-[10px] text-muted-foreground">
                  {new Date(turn.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="max-w-xl rounded-card rounded-tr-none bg-primary p-4 text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a]">
                <p className="font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {turn.userText}
                </p>
              </div>
            </div>

            {/* 2. Counterpart Message (Left Aligned) */}
            {hasAssistantText && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-meta text-[10px] uppercase font-bold text-primary">
                    {counterpartRole}
                  </span>
                  {turn.completedAt && (
                    <span className="font-meta text-[10px] text-muted-foreground">
                      {new Date(turn.completedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <div className="max-w-xl rounded-card rounded-tl-none bg-surface-solid p-4 text-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a]">
                  <p className="font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {turn.assistantText}
                  </p>
                  <SpeechButton
                    attemptId={attemptId}
                    turnId={turn.id}
                    autoPlay={isLatestTurn && autoPlaySpeech}
                  />
                </div>
              </div>
            )}

            {/* 3. Turn Level Error & Recovery */}
            {isTurnFailed && (
              <div className="flex flex-col items-start max-w-xl">
                <div className="rounded-card border-2 border-alert bg-alert/10 p-4 text-alert shadow-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                    <span className="font-display text-xs font-bold uppercase tracking-wide">
                      Counterpart response generation failed
                    </span>
                  </div>
                  <p className="font-sans text-xs text-foreground/80 leading-relaxed">
                    Your response was safely saved. You can retry generating the counterpart response without retyping.
                  </p>
                  <button
                    type="button"
                    onClick={() => onRetryTurn(turn.id)}
                    disabled={isTurnRetrying}
                    className="inline-flex items-center gap-1.5 rounded-control bg-alert px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white shadow-2xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshIcon className={cn("w-3 h-3", isTurnRetrying && "animate-spin")} />
                    <span>{isTurnRetrying ? "Retrying..." : "Retry Response"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Optimistic Pending User Turn Bubble */}
      {pendingTurn && sendingTurn && (
        <div className="space-y-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                You
              </span>
              <span className="font-meta text-[10px] text-muted-foreground">
                Sending…
              </span>
            </div>
            <div className="max-w-xl rounded-card rounded-tr-none bg-primary/90 p-4 text-primary-foreground border border-border shadow-xs opacity-90">
              <p className="font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {pendingTurn.text}
              </p>
            </div>
          </div>

          {/* Typing Indicator for Counterpart */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-meta text-[10px] uppercase font-bold text-primary">
                {counterpartRole}
              </span>
            </div>
            <div className="rounded-card rounded-tl-none bg-surface-subtle p-3 border border-border/30 flex items-center gap-1.5 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
              <span className="font-meta text-[10px] text-muted-foreground ml-1.5">
                Responding…
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Pending Error Retry Bubble */}
      {pendingError && pendingTurn && !sendingTurn && (
        <div className="rounded-card border-2 border-alert bg-alert/10 p-4 text-alert shadow-xs space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 shrink-0" />
            <span className="font-display text-xs font-bold uppercase tracking-wide">
              Failed to send response
            </span>
          </div>
          <p className="font-sans text-xs text-foreground/80 leading-relaxed">
            {pendingError}
          </p>
          <button
            type="button"
            onClick={onRetryPending}
            className="inline-flex items-center gap-1.5 rounded-control bg-alert px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white shadow-2xs hover:opacity-90 cursor-pointer"
          >
            <RefreshIcon className="w-3 h-3" />
            <span>Retry Sending</span>
          </button>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
