"use client";

import { MAX_TURN_TEXT_LENGTH } from "@kalemny/contracts";

import { MicIcon, RefreshIcon, SendIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface SimulationComposerProps {
  composerText: string;
  sendingTurn: boolean;
  isComposerDisabled: boolean;
  isExpired: boolean;
  isLimitReached: boolean;
  turnCount: number;
  generalError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChangeText: (text: string) => void;
  onSendTurn: () => void;
}

export function SimulationComposer({
  composerText,
  sendingTurn,
  isComposerDisabled,
  isExpired,
  isLimitReached,
  turnCount,
  generalError,
  textareaRef,
  onChangeText,
  onSendTurn,
}: SimulationComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isComposerDisabled && composerText.trim()) {
        onSendTurn();
      }
    }
  };

  const isNearLimit = composerText.length >= MAX_TURN_TEXT_LENGTH * 0.9;

  return (
    <footer className="border-t border-border bg-surface-solid p-4 sm:p-5 shadow-xs shrink-0">
      {/* General / Rate Limit Errors */}
      {generalError && (
        <div
          role="alert"
          className="mb-3 rounded-control border border-alert/30 bg-alert/10 p-2.5 font-sans text-xs text-alert flex items-center justify-between"
        >
          <span>{generalError}</span>
        </div>
      )}

      {/* Expiry Alert */}
      {isExpired && (
        <div className="mb-3 rounded-control border border-amber-300 bg-amber-50 p-2.5 font-meta text-xs text-amber-900">
          This simulation has reached its time limit. You can finish your rehearsal to view your evaluation.
        </div>
      )}

      {/* Turn Limit Warning */}
      {isLimitReached && (
        <div className="mb-3 rounded-control border border-border bg-surface-subtle p-2.5 font-meta text-xs text-foreground">
          Maximum turns (20) reached. Please click <strong>Finish Rehearsal</strong> above to review your score.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isComposerDisabled && composerText.trim()) {
            onSendTurn();
          }
        }}
        className="flex flex-col gap-2"
      >
        <div className="relative">
          <label htmlFor="simulation-response-input" className="sr-only">
            Your simulation response
          </label>
          <textarea
            id="simulation-response-input"
            ref={textareaRef}
            rows={2}
            value={composerText}
            onChange={(e) => onChangeText(e.target.value.slice(0, MAX_TURN_TEXT_LENGTH))}
            onKeyDown={handleKeyDown}
            disabled={isComposerDisabled}
            placeholder={
              isExpired
                ? "Simulation time expired. Click Finish to evaluate."
                : isLimitReached
                  ? "Turn limit reached. Click Finish to evaluate."
                  : "Type your response here (Press Enter to send, Shift+Enter for new line)..."
            }
            className="w-full resize-none rounded-control border border-border bg-surface-subtle p-3.5 pr-24 font-sans text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-white focus:outline-none disabled:opacity-60"
          />

          <div className="absolute right-3 bottom-3.5 flex items-center gap-2">
            {/* Voice Push to Talk Placeholder */}
            <button
              type="button"
              disabled
              title="Voice recording (Coming soon)"
              className="p-1.5 rounded-control text-muted-foreground/50 border border-border/20 bg-surface-raised cursor-not-allowed"
              aria-label="Voice recording coming soon"
            >
              <MicIcon className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isComposerDisabled || !composerText.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-control bg-primary text-primary-foreground border border-border disabled:opacity-40 cursor-pointer brutalist-shadow-sm"
              aria-label="Send message"
            >
              {sendingTurn ? (
                <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <SendIcon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between font-meta text-[11px] text-muted-foreground px-1">
          <span>
            {turnCount >= 1 ? `${turnCount} turns exchanged` : "Send your first message to begin dialogue"}
          </span>
          <span className={cn(isNearLimit && "text-alert font-bold")}>
            {composerText.length} / {MAX_TURN_TEXT_LENGTH}
          </span>
        </div>
      </form>
    </footer>
  );
}
