"use client";

import { useAuth } from "@clerk/nextjs";
import { MAX_TURN_TEXT_LENGTH } from "@kalemny/contracts";
import { useEffect, useState } from "react";

import { CloseIcon, MicIcon, RefreshIcon, SendIcon } from "@/components/icons";
import {
  MAX_RECORDING_DURATION_SECONDS,
  useVoiceRecorder,
} from "@/hooks/use-voice-recorder";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";

export interface SimulationComposerProps {
  attemptId: string;
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
  onVoiceStatusChange: (
    status:
      "idle" | "requesting_permission" | "recording" | "transcribing" | "error",
  ) => void;
  onVoiceTranscriptReady: () => void;
}

function formatRecordDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SimulationComposer({
  attemptId,
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
  onVoiceStatusChange,
  onVoiceTranscriptReady,
}: SimulationComposerProps) {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const [showTextInput, setShowTextInput] = useState(false);

  const {
    status: voiceStatus,
    durationSeconds,
    errorMessage: voiceError,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    clearError,
  } = useVoiceRecorder({
    onTranscriptReady: (transcript) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      setShowTextInput(true);
      onVoiceTranscriptReady();
      onChangeText(
        composerText.trim() ? `${composerText.trim()} ${trimmed}` : trimmed,
      );
      textareaRef.current?.focus();
    },
    onTranscribeAudio: async (audioBlob, durationMs) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const client = createApiClient(apiUrl);
      const data = await client.transcribeAudio(
        token,
        attemptId,
        audioBlob,
        durationMs,
      );
      return { transcript: data.transcript };
    },
  });

  const isRecording = voiceStatus === "recording";
  const isTranscribing = voiceStatus === "transcribing";
  const isRequestingMic = voiceStatus === "requesting_permission";
  const isVoiceBusy = isRecording || isTranscribing || isRequestingMic;

  useEffect(() => {
    onVoiceStatusChange(voiceStatus);
  }, [onVoiceStatusChange, voiceStatus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isComposerDisabled && !isVoiceBusy && composerText.trim()) {
        onSendTurn();
      }
    }
  };

  const isNearLimit = composerText.length >= MAX_TURN_TEXT_LENGTH * 0.9;

  return (
    <footer className="border-t border-border bg-surface-solid p-3 sm:p-5 shadow-xs shrink-0">
      {/* General / Rate Limit Errors */}
      {generalError && (
        <div
          role="alert"
          className="mb-2.5 sm:mb-3 rounded-control border border-alert/30 bg-alert/10 p-2 sm:p-2.5 font-sans text-xs text-alert flex items-center justify-between"
        >
          <span>{generalError}</span>
        </div>
      )}

      {/* Voice Recording Error */}
      {voiceError && (
        <div
          role="alert"
          className="mb-2.5 sm:mb-3 rounded-control border border-alert/40 bg-alert/10 p-2 sm:p-2.5 font-sans text-xs text-alert flex items-center justify-between gap-2"
        >
          <span className="truncate">{voiceError}</span>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded-control hover:bg-alert/20 cursor-pointer shrink-0"
            aria-label="Dismiss voice error"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Voice Recording Status Banner */}
      {isRecording && (
        <div className="mb-2.5 sm:mb-3 rounded-control border-2 border-alert/60 bg-alert/5 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-alert" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-alert">
                Recording Speech…
              </span>
              <span className="font-meta text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {formatRecordDuration(durationSeconds)} /{" "}
                {formatRecordDuration(MAX_RECORDING_DURATION_SECONDS)} · Speak
                clearly in English
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-control border border-border bg-surface-solid font-meta text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void stopAndTranscribe()}
              className="px-3 py-1 rounded-control bg-alert text-white font-meta text-xs font-bold uppercase tracking-wider cursor-pointer brutalist-shadow-sm"
            >
              Done Speaking
            </button>
          </div>
        </div>
      )}

      {/* Transcribing Voice Banner */}
      {isTranscribing && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-primary/30 bg-primary/5 p-2.5 sm:p-3 flex items-center gap-2.5 text-primary">
          <RefreshIcon className="w-4 h-4 animate-spin shrink-0" />
          <span className="font-meta text-xs font-semibold truncate">
            Transcribing your voice with Whisper AI…
          </span>
        </div>
      )}

      {/* Expiry Alert */}
      {isExpired && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-amber-300 bg-amber-50 p-2 sm:p-2.5 font-meta text-xs text-amber-900">
          This simulation has reached its time limit. You can finish your
          rehearsal to view your evaluation.
        </div>
      )}

      {/* Turn Limit Warning */}
      {isLimitReached && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-border bg-surface-subtle p-2 sm:p-2.5 font-meta text-xs text-foreground">
          Maximum turns (20) reached. Please click{" "}
          <strong>Finish Rehearsal</strong> above to review your score.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isComposerDisabled && !isVoiceBusy && composerText.trim()) {
            onSendTurn();
          }
        }}
        className="mx-auto flex w-full max-w-2xl flex-col gap-3"
      >
        {showTextInput ? (
          <>
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                {composerText.trim()
                  ? "Review before sending"
                  : "Type your response"}
              </span>
              <button
                type="button"
                onClick={() => setShowTextInput(false)}
                className="font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer"
              >
                Use microphone
              </button>
            </div>
            <div className="relative">
              <label htmlFor="simulation-response-input" className="sr-only">
                Review and edit your response before sending
              </label>
              <textarea
                id="simulation-response-input"
                ref={textareaRef}
                rows={3}
                value={composerText}
                onChange={(e) =>
                  onChangeText(e.target.value.slice(0, MAX_TURN_TEXT_LENGTH))
                }
                onKeyDown={handleKeyDown}
                disabled={isComposerDisabled}
                placeholder="Type or edit your response…"
                className="w-full min-h-[88px] resize-none rounded-control border-2 border-border bg-surface-subtle p-3 pr-24 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:bg-white focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={
                  isComposerDisabled || isVoiceBusy || !composerText.trim()
                }
                className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-1.5 rounded-control bg-primary px-3 text-primary-foreground border border-border disabled:opacity-40 cursor-pointer brutalist-shadow-sm"
                aria-label="Send response"
              >
                {sendingTurn ? (
                  <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendIcon className="h-3.5 w-3.5" />
                )}
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider">
                  Send
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={isComposerDisabled || isVoiceBusy}
              className={cn(
                "inline-flex min-h-14 items-center justify-center gap-3 rounded-control border-2 border-border bg-primary px-6 py-3 text-primary-foreground brutalist-interactive cursor-pointer disabled:opacity-40",
                isRequestingMic && "animate-pulse",
              )}
              aria-label="Speak your response"
            >
              <MicIcon className="h-5 w-5" aria-hidden="true" />
              <span className="font-display text-sm font-bold uppercase tracking-wider">
                Tap to speak
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              Record up to 2 minutes, then review your words before sending.
            </p>
          </div>
        )}

        {!showTextInput && (
          <button
            type="button"
            onClick={() => {
              if (isRecording) cancelRecording();
              setShowTextInput(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            disabled={isComposerDisabled}
            className="self-center font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            Type instead
          </button>
        )}

        <div className="flex items-center justify-between font-meta text-[10px] sm:text-[11px] text-muted-foreground px-0.5 sm:px-1">
          <span className="truncate">
            {turnCount >= 1
              ? `${turnCount} turns exchanged`
              : "Your response starts the conversation"}
          </span>
          {showTextInput && (
            <span
              className={cn(
                "shrink-0 ml-2",
                isNearLimit && "text-alert font-bold",
              )}
            >
              {composerText.length} / {MAX_TURN_TEXT_LENGTH}
            </span>
          )}
        </div>
      </form>
    </footer>
  );
}
