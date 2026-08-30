"use client";

import type { ConversationTurn } from "@kalemny/contracts";

import { AccessibleDialog } from "@/components/accessible-dialog";
import { SpeechButton } from "@/components/speech-button";

export interface TranscriptViewerModalProps {
  open: boolean;
  attemptId: string;
  scenarioTitle: string;
  turns: ConversationTurn[];
  onClose: () => void;
}

export function TranscriptViewerModal({
  open,
  attemptId,
  scenarioTitle,
  turns,
  onClose,
}: TranscriptViewerModalProps) {
  return (
    <AccessibleDialog
      open={open}
      title="Complete Conversation Transcript"
      description={`Full exchanged dialogue for ${scenarioTitle}.`}
      onClose={onClose}
    >
      <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
        {turns.length === 0 ? (
          <p className="font-sans text-xs text-muted-foreground text-center py-4">
            No turns were exchanged in this simulation.
          </p>
        ) : (
          turns.map((t) => (
            <div
              key={t.id}
              className="space-y-2 border-b border-border/10 pb-3 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-meta text-[11px] font-bold text-muted-foreground">
                  Turn #{t.sequence}
                </span>
                <span className="font-meta text-[10px] text-muted-foreground">
                  {new Date(t.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* User Message */}
              <div className="bg-surface-subtle border border-border/30 p-3 rounded-control">
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  You
                </span>
                <p className="font-sans text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {t.userText}
                </p>
              </div>

              {/* Assistant Message */}
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-control">
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                  Counterpart
                </span>
                <p className="font-sans text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {t.assistantText}
                </p>
                <SpeechButton attemptId={attemptId} turnId={t.id} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-border/10 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-control border border-border bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle cursor-pointer"
        >
          Close
        </button>
      </div>
    </AccessibleDialog>
  );
}
