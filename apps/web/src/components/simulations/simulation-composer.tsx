"use client";

import { useAuth } from "@clerk/nextjs";
import type { InputMethod } from "@kalemny/contracts";
import { MAX_TURN_TEXT_LENGTH } from "@kalemny/contracts";
import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  CloseIcon,
  MicIcon,
  RefreshIcon,
  SendIcon,
} from "@/components/icons";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  MAX_RECORDING_DURATION_SECONDS,
  useVoiceRecorder,
} from "@/hooks/use-voice-recorder";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

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
  /** Persistent composer mode; owned by the simulation page, not this component. */
  inputMode: InputMethod;
  onInputModeChange: (mode: InputMethod) => void;
  /** True while the current draft is an unreviewed voice transcript. */
  hasVoiceDraft: boolean;
  /** Live microphone level (0–1) from the active recording; 0 when idle. */
  microphoneLevel: number;
  language?: "en" | "ar";
  onChangeText: (text: string) => void;
  onSendTurn: (
    overrideText?: string,
    overrideInputMethod?: InputMethod,
  ) => void;
  onVoiceStatusChange: (
    status:
      | "idle"
      | "requesting_permission"
      | "recording"
      | "transcribing"
      | "error",
  ) => void;
  onVoiceTranscriptReady: () => void;
  onMicrophoneLevelChange: (level: number) => void;
  isCounterpartSpeaking?: boolean;
  onInterruptAudio?: () => void;
  isKeyboardOpen?: boolean;
  hideMicRow?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

function formatRecordDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function subscribeVoiceReview(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("kalemny_voice_review_change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("kalemny_voice_review_change", callback);
  };
}

function getVoiceReviewSnapshot(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return true;
    return (
      window.localStorage.getItem("kalemny_voice_review_before_send") !== "false"
    );
  } catch {
    return true;
  }
}

function getVoiceReviewServerSnapshot(): boolean {
  return true;
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
  inputMode,
  onInputModeChange,
  hasVoiceDraft,
  microphoneLevel,
  language,
  onChangeText,
  onSendTurn,
  onVoiceStatusChange,
  onVoiceTranscriptReady,
  onMicrophoneLevelChange,
  isCounterpartSpeaking = false,
  onInterruptAudio,
  isKeyboardOpen = false,
  hideMicRow = false,
  onFocus,
  onBlur,
}: SimulationComposerProps) {
  const { locale: contextLocale } = useLocale();
  const activeLocale = language ?? contextLocale;
  const isRtl = activeLocale === "ar";

  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const prefersReducedMotion = usePrefersReducedMotion();
  const spaceHeldRef = useRef(false);
  const lastEnterHandledTimeRef = useRef(0);

  const reviewBeforeSend = useSyncExternalStore(
    subscribeVoiceReview,
    getVoiceReviewSnapshot,
    getVoiceReviewServerSnapshot,
  );

  const handleToggleReviewMode = () => {
    const next = !reviewBeforeSend;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "kalemny_voice_review_before_send",
          String(next),
        );
      }
      window.dispatchEvent(new Event("kalemny_voice_review_change"));
    } catch {
      // Ignore localStorage write errors
    }
  };

  const {
    status: voiceStatus,
    durationSeconds,
    microphoneLevel: activeMicrophoneLevel,
    errorMessage: voiceError,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    clearError,
  } = useVoiceRecorder({
    onTranscriptReady: (transcript) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      if (!reviewBeforeSend) {
        onSendTurn(trimmed, "VOICE");
        return;
      }
      onVoiceTranscriptReady();
      onChangeText(
        composerText.trim() ? `${composerText.trim()} ${trimmed}` : trimmed,
      );
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

  useEffect(() => {
    onMicrophoneLevelChange(activeMicrophoneLevel);
  }, [activeMicrophoneLevel, onMicrophoneLevelChange]);

  const handleStartVoice = () => {
    if (isComposerDisabled || isVoiceBusy) return;
    if (isCounterpartSpeaking) {
      onInterruptAudio?.();
    }
    if (inputMode === "TEXT") {
      onInputModeChange("VOICE");
    }
    void startRecording();
  };

  useEffect(() => {
    if (hasVoiceDraft || isComposerDisabled) return;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      );
    };

    const handleSpaceDown = (event: KeyboardEvent) => {
      if (
        event.code !== "Space" ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      spaceHeldRef.current = true;
      if (isCounterpartSpeaking) {
        onInterruptAudio?.();
      }
      if (inputMode === "TEXT") onInputModeChange("VOICE");
      if (voiceStatus === "idle" || voiceStatus === "error") {
        void startRecording();
      }
    };

    const handleSpaceUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableTarget(event.target)) return;
      event.preventDefault();
      const wasHeld = spaceHeldRef.current;
      spaceHeldRef.current = false;
      if (!wasHeld) return;
      if (voiceStatus === "recording") {
        void stopAndTranscribe();
      } else if (voiceStatus === "requesting_permission") {
        cancelRecording();
      }
    };

    window.addEventListener("keydown", handleSpaceDown);
    window.addEventListener("keyup", handleSpaceUp);
    return () => {
      window.removeEventListener("keydown", handleSpaceDown);
      window.removeEventListener("keyup", handleSpaceUp);
    };
  }, [
    cancelRecording,
    hasVoiceDraft,
    inputMode,
    isComposerDisabled,
    isCounterpartSpeaking,
    onInputModeChange,
    onInterruptAudio,
    startRecording,
    stopAndTranscribe,
    voiceStatus,
  ]);

  useEffect(() => {
    if (hasVoiceDraft && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [hasVoiceDraft, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isComposerDisabled && !isVoiceBusy && composerText.trim()) {
        lastEnterHandledTimeRef.current = Date.now();
        onSendTurn();
      }
    }
  };

  useEffect(() => {
    if (!hasVoiceDraft || isComposerDisabled || isVoiceBusy) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) {
        const tagName = activeEl.tagName.toLowerCase();
        const isEditable =
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          activeEl.isContentEditable;
        if (isEditable && activeEl !== textareaRef.current) {
          return;
        }
      }

      const now = Date.now();
      if (now - lastEnterHandledTimeRef.current < 50) {
        return;
      }
      lastEnterHandledTimeRef.current = now;

      event.preventDefault();
      onSendTurn();
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [hasVoiceDraft, isComposerDisabled, isVoiceBusy, onSendTurn, textareaRef]);

  const effectiveMicLevel = isRecording
    ? activeMicrophoneLevel > 0
      ? activeMicrophoneLevel
      : microphoneLevel
    : 0;
  const clampedMicLevel = Math.min(1, Math.max(0, effectiveMicLevel));

  const isNearLimit = composerText.length >= MAX_TURN_TEXT_LENGTH * 0.9;

  const textareaLabel = hasVoiceDraft
    ? isRtl
      ? "راجع وعدّل ردك قبل الإرسال"
      : "Review and edit your response before sending"
    : isRtl
      ? "اكتب ردك"
      : "Type your response";

  const placeholderText = isRtl
    ? "اكتب ردك هنا…"
    : "Type your response here…";

  return (
    <footer
      data-testid="simulation-composer"
      dir={isRtl ? "rtl" : "ltr"}
      className="border-t border-border bg-surface-solid px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-4 sm:pb-5 shadow-xs shrink-0 flex flex-col gap-3"
    >
      {/* General / Rate Limit Errors */}
      {generalError && (
        <div
          role="alert"
          className="rounded-control border border-alert/30 bg-alert/10 p-2.5 font-sans text-xs text-alert flex items-center justify-between"
        >
          <span>{generalError}</span>
        </div>
      )}

      {/* Voice Recording Error */}
      {voiceError && (
        <div
          role="alert"
          className="rounded-control border border-alert/40 bg-alert/10 p-2.5 font-sans text-xs text-alert flex items-center justify-between gap-2"
        >
          <span className="truncate">{voiceError}</span>
          <button
            type="button"
            onClick={clearError}
            className="min-h-[44px] min-w-[44px] rounded-control hover:bg-alert/20 cursor-pointer shrink-0 flex items-center justify-center"
            aria-label={isRtl ? "إغلاق رسالة الخطأ" : "Dismiss voice error"}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Transcribing Voice Banner */}
      {isTranscribing && (
        <div className="rounded-control border border-primary/20 bg-primary/5 p-2.5 flex items-center gap-2 text-primary text-xs font-semibold">
          <RefreshIcon className="w-4 h-4 animate-spin shrink-0" />
          <span className="truncate">
            {isRtl
              ? "جارٍ تحويل صوتك إلى نص..."
              : "Transcribing your voice with Whisper AI…"}
          </span>
        </div>
      )}

      {/* Expiry Alert */}
      {isExpired && (
        <div className="rounded-control border border-amber-300 bg-amber-50 p-2.5 font-sans text-xs text-amber-900">
          {isRtl
            ? "وصلت هذه المحاكاة إلى الحد الزمني. يمكنك إنهاء الجلسة لعرض تقييمك."
            : "This simulation has reached its time limit. You can finish your rehearsal to view your evaluation."}
        </div>
      )}

      {/* Turn Limit Warning */}
      {isLimitReached && (
        <div className="rounded-control border border-border bg-surface-subtle p-2.5 font-sans text-xs text-foreground">
          {isRtl ? (
            <>
              تم الوصول إلى الحد الأقصى للجولات (20). يُرجى الضغط على{" "}
              <strong>إنهاء المحاكاة</strong> أعلاه لمراجعة نتيجتك.
            </>
          ) : (
            <>
              Maximum turns (20) reached. Please click{" "}
              <strong>Finish Rehearsal</strong> above to review your score.
            </>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isComposerDisabled && !isVoiceBusy && composerText.trim() && !sendingTurn) {
            onSendTurn();
          }
        }}
        className="flex flex-col gap-3 w-full"
      >
        {/* Row 1: Full-Width Composer & Inline Send Button */}
        <div className="flex items-end gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="simulation-response-input" className="sr-only">
              {textareaLabel}
            </label>
            <textarea
              id="simulation-response-input"
              aria-label={textareaLabel}
              ref={textareaRef}
              rows={1}
              value={composerText}
              dir={isRtl ? "rtl" : "ltr"}
              onChange={(e) =>
                onChangeText(e.target.value.slice(0, MAX_TURN_TEXT_LENGTH))
              }
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              disabled={isComposerDisabled}
              placeholder={placeholderText}
              className={cn(
                "w-full min-h-[44px] max-h-[96px] resize-none rounded-control border border-border bg-background p-3 font-sans text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50",
                isRtl ? "text-right" : "text-left",
              )}
            />
          </div>

          {/* Inline mic icon: visible ONLY when isKeyboardOpen === true on mobile and mic not hidden */}
          {isKeyboardOpen && !hideMicRow && (
            <button
              type="button"
              onClick={isRecording ? () => void stopAndTranscribe() : handleStartVoice}
              disabled={isComposerDisabled || isTranscribing}
              className={cn(
                "min-h-[44px] min-w-[44px] rounded-control border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0",
                isRecording
                  ? "border-alert bg-alert/10 text-alert animate-pulse"
                  : "border-border bg-surface-subtle text-foreground hover:bg-surface-solid",
              )}
              aria-label={
                isRecording
                  ? isRtl
                    ? "إنهاء التسجيل"
                    : "Done speaking"
                  : isRtl
                    ? "تسجيل صوتي"
                    : "Record voice"
              }
            >
              <MicIcon className="h-5 w-5 text-primary" />
            </button>
          )}

          <button
            type="submit"
            disabled={
              isComposerDisabled || isVoiceBusy || !composerText.trim() || sendingTurn
            }
            className="min-h-[44px] min-w-[44px] px-3.5 rounded-control bg-primary text-primary-foreground flex items-center justify-center gap-1.5 transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
            aria-label={isRtl ? "إرسال الرد" : "Send response"}
          >
            {sendingTurn ? (
              <RefreshIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <SendIcon className={cn("h-4 w-4", isRtl && "scale-x-[-1]")} />
                <span className="text-xs font-semibold hidden sm:inline">
                  {isRtl ? "إرسال" : "Send"}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Row 2: Dedicated Microphone Row (hidden when isKeyboardOpen === true or hideMicRow === true) */}
        {!isKeyboardOpen && !hideMicRow && (
          <div data-testid="dedicated-mic-row" className="flex flex-col items-center justify-center w-full pt-1">
            {isRecording ? (
              <div className="flex items-center justify-between gap-3 sm:gap-4 w-full p-2 rounded-full bg-surface-subtle border border-border-subtle shadow-xs">
                {/* Live timer */}
                <div className="flex items-center gap-2 ps-3 shrink-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alert" />
                  </span>
                  <span
                    data-testid="recording-timer"
                    className="font-mono text-xs font-semibold text-foreground"
                  >
                    {formatRecordDuration(durationSeconds)} /{" "}
                    {formatRecordDuration(MAX_RECORDING_DURATION_SECONDS)}
                  </span>
                </div>

                {/* Audio level visualizer bar */}
                <div
                  role="meter"
                  aria-label={isRtl ? "مستوى الصوت" : "Audio level"}
                  aria-valuenow={Math.round(clampedMicLevel * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="flex-1 h-2 max-w-[140px] sm:max-w-xs bg-border/40 rounded-full overflow-hidden mx-1"
                >
                  <div
                    data-testid="audio-level-bar"
                    className="h-full bg-primary rounded-full transition-all duration-75"
                    style={{
                      width: `${Math.max(6, Math.round(clampedMicLevel * 100))}%`,
                    }}
                  />
                </div>

                {/* Actions: Cancel & Done */}
                <div className="flex items-center gap-2 shrink-0 pe-1">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="border border-border min-h-[44px] px-4 rounded-full font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    aria-label={isRtl ? "إلغاء التسجيل" : "Cancel recording"}
                  >
                    {isRtl ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void stopAndTranscribe()}
                    className="bg-primary text-primary-foreground min-h-[44px] px-5 rounded-full font-semibold text-xs cursor-pointer hover:bg-primary/90 transition-colors shadow-xs"
                    aria-label={isRtl ? "تم التحدث" : "Done speaking"}
                  >
                    {isRtl ? "تم" : "Done"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartVoice}
                  disabled={isComposerDisabled || isVoiceBusy}
                  aria-keyshortcuts="Space"
                  className={cn(
                    "min-h-[44px] px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors hover:bg-primary/90 disabled:opacity-50",
                    isRequestingMic && !prefersReducedMotion && "animate-pulse",
                  )}
                  aria-label={
                    isCounterpartSpeaking
                      ? isRtl
                        ? "اضغط للمقاطعة"
                        : "Tap to interrupt"
                      : isRtl
                        ? "اضغط للتحدث"
                        : "Tap to talk"
                  }
                >
                  <MicIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm">
                    {isCounterpartSpeaking
                      ? isRtl
                        ? "اضغط للمقاطعة"
                        : "Tap to interrupt"
                      : isRtl
                        ? "اضغط للتحدث"
                        : "Tap to talk"}
                  </span>
                </button>

                {/* Spacebar helper text & review before send toggle */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {reviewBeforeSend
                      ? isRtl
                        ? "اضغط مع الاستمرار على Space للتحدث، ثم أفلت للمراجعة. اضغط Enter للإرسال."
                        : "Hold Space to talk, release to review. Press Enter to send."
                      : isRtl
                        ? "اضغط مع الاستمرار على Space للتحدث، ثم أفلت للإرسال."
                        : "Hold Space to talk, release to send."}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reviewBeforeSend}
                    onClick={handleToggleReviewMode}
                    disabled={isComposerDisabled || isVoiceBusy}
                    className="inline-flex min-h-[44px] items-center gap-2 px-1 cursor-pointer disabled:opacity-40"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-border transition-colors duration-150 ease-in-out",
                        reviewBeforeSend ? "bg-primary" : "bg-surface-subtle",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3 w-3 transform rounded-full bg-white transition duration-150 ease-in-out shadow-xs",
                          reviewBeforeSend
                            ? isRtl
                              ? "-translate-x-3.5"
                              : "translate-x-3.5"
                            : isRtl
                              ? "-translate-x-0.5"
                              : "translate-x-0.5",
                        )}
                      />
                    </span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground select-none">
                      {isRtl ? "مراجعة الصوت قبل الإرسال" : "Review before sending"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Meta & Character Count */}
        <div className="flex items-center justify-between font-meta text-[10px] sm:text-[11px] text-muted-foreground px-0.5">
          <span className="truncate">
            {turnCount >= 1
              ? isRtl
                ? `${turnCount} جولة متبادلة`
                : `${turnCount} turns exchanged`
              : isRtl
                ? "ردك يبدأ المحادثة"
                : "Your response starts the conversation"}
          </span>
          <span
            className={cn(
              "shrink-0 ms-2",
              isNearLimit && "text-alert font-bold",
            )}
          >
            {composerText.length} / {MAX_TURN_TEXT_LENGTH}
          </span>
        </div>
      </form>
    </footer>
  );
}
