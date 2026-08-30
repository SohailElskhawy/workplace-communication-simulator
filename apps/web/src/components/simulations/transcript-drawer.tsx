"use client";

import { useEffect } from "react";

import type { ConversationTurn } from "@kalemny/contracts";

import { AlertTriangleIcon, CloseIcon, RefreshIcon } from "@/components/icons";
import { SpeechButton } from "@/components/speech-button";
import { cn } from "@/lib/cn";

export interface PendingTurnState {
  clientRequestId: string;
  text: string;
}

export interface TranscriptDrawerProps {
  open: boolean;
  attemptId: string;
  turns: ConversationTurn[];
  counterpartRole: string;
  openingMessage?: string | null;
  pendingTurn: PendingTurnState | null;
  sendingTurn: boolean;
  pendingError: string | null;
  retryingTurnId: string | null;
  onClose: () => void;
  onRetryTurn: (turnId: string) => void;
  onRetryPending: () => void;
}

export function TranscriptDrawer({
  open,
  attemptId,
  turns,
  counterpartRole,
  openingMessage,
  pendingTurn,
  sendingTurn,
  pendingError,
  retryingTurnId,
  onClose,
  onRetryTurn,
  onRetryPending,
}: TranscriptDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex justify-end"
      aria-label="Transcript drawer"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-foreground/15 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close transcript"
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l-2 border-border bg-surface-solid shadow-brutal"
        aria-label="Conversation transcript"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div>
            <p className="font-display text-base font-bold uppercase tracking-tight text-foreground">
              Conversation transcript
            </p>
            <p className="mt-0.5 font-meta text-[10px] uppercase tracking-widest text-muted-foreground">
              {turns.length} saved learner{" "}
              {turns.length === 1 ? "turn" : "turns"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface-subtle text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-raised"
            aria-label="Close transcript"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {openingMessage && (
            <TranscriptMessage
              role={counterpartRole}
              text={openingMessage}
              counterpart
              speech={<SpeechButton attemptId={attemptId} turnId="opening" />}
            />
          )}

          {turns.map((turn) => {
            const hasAssistantText = Boolean(turn.assistantText);
            const failed =
              turn.status === "FAILED" ||
              (!hasAssistantText && turn.status === "COMPLETED");
            const retrying = retryingTurnId === turn.id;

            return (
              <div key={turn.id} className="space-y-3">
                <TranscriptMessage role="You" text={turn.userText} />
                {hasAssistantText && (
                  <TranscriptMessage
                    role={counterpartRole}
                    text={turn.assistantText ?? ""}
                    counterpart
                    speech={
                      <SpeechButton attemptId={attemptId} turnId={turn.id} />
                    }
                  />
                )}
                {failed && (
                  <div className="rounded-control border-2 border-alert bg-alert/10 p-3 text-alert">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <p className="font-display text-xs font-bold uppercase tracking-wide">
                        Counterpart response unavailable
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                      Your response was saved. Retry the counterpart response
                      without retyping.
                    </p>
                    <button
                      type="button"
                      onClick={() => onRetryTurn(turn.id)}
                      disabled={retrying}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-alert px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white brutalist-shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <RefreshIcon
                        className={cn("h-3 w-3", retrying && "animate-spin")}
                        aria-hidden="true"
                      />
                      {retrying ? "Retrying…" : "Retry response"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {pendingTurn && sendingTurn && (
            <div className="space-y-3">
              <TranscriptMessage role="You · Sending" text={pendingTurn.text} />
              <div className="flex items-center gap-2 rounded-control border border-border/30 bg-surface-subtle p-3 text-muted-foreground">
                <RefreshIcon
                  className="h-3.5 w-3.5 animate-spin text-primary"
                  aria-hidden="true"
                />
                <span className="font-meta text-[10px] uppercase tracking-wider">
                  {counterpartRole} is responding
                </span>
              </div>
            </div>
          )}

          {pendingError && pendingTurn && !sendingTurn && (
            <div className="rounded-control border-2 border-alert bg-alert/10 p-3 text-alert">
              <p className="font-display text-xs font-bold uppercase tracking-wide">
                Message was not sent
              </p>
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                {pendingError}
              </p>
              <button
                type="button"
                onClick={onRetryPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-control bg-alert px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white brutalist-shadow-sm cursor-pointer"
              >
                <RefreshIcon className="h-3 w-3" aria-hidden="true" />
                Retry sending
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function TranscriptMessage({
  role,
  text,
  counterpart = false,
  speech,
}: {
  role: string;
  text: string;
  counterpart?: boolean;
  speech?: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col", counterpart ? "items-start" : "items-end")}
    >
      <span
        className={cn(
          "mb-1 font-meta text-[10px] font-bold uppercase tracking-wider",
          counterpart ? "text-primary" : "text-muted-foreground",
        )}
      >
        {role}
      </span>
      <div
        className={cn(
          "max-w-[92%] rounded-card border border-border p-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap",
          counterpart
            ? "rounded-tl-none bg-surface-subtle text-foreground"
            : "rounded-tr-none bg-primary text-primary-foreground",
        )}
      >
        {text}
        {speech}
      </div>
    </div>
  );
}
