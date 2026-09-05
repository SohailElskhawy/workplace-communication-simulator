"use client";

import { useAuth } from "@clerk/nextjs";
import type { InputMethod } from "@kalemny/contracts";
import { MAX_TURN_TEXT_LENGTH } from "@kalemny/contracts";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { CloseIcon, MicIcon, RefreshIcon, SendIcon } from "@/components/icons";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
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
      "idle" | "requesting_permission" | "recording" | "transcribing" | "error",
  ) => void;
  onVoiceTranscriptReady: () => void;
  onMicrophoneLevelChange: (level: number) => void;
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
    return localStorage.getItem("kalemny_voice_review_before_send") !== "false";
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
}: SimulationComposerProps) {
  const isRtl = language === "ar";
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
      localStorage.setItem("kalemny_voice_review_before_send", String(next));
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
  const isTextInput = inputMode === "TEXT";

  useEffect(() => {
    onVoiceStatusChange(voiceStatus);
  }, [onVoiceStatusChange, voiceStatus]);

  useEffect(() => {
    onMicrophoneLevelChange(activeMicrophoneLevel);
  }, [activeMicrophoneLevel, onMicrophoneLevelChange]);

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
    onInputModeChange,
    startRecording,
    stopAndTranscribe,
    voiceStatus,
  ]);

  // Mic button reactivity while LISTENING: driven by the live level already
  // produced by the recorder's own analyser — no extra stream or analyser.
  // Suppressed under prefers-reduced-motion; resets with the recording
  // lifecycle because the level returns to 0 on cleanup.
  const clampedMicLevel = Math.min(1, Math.max(0, microphoneLevel));
  const micReactive = isRecording && !prefersReducedMotion;
  const micScale = micReactive ? 1 + clampedMicLevel * 0.1 : 1;
  const micRingScale = micReactive ? 1 + clampedMicLevel * 0.35 : 1;
  const micRingOpacity = micReactive ? 0.2 + clampedMicLevel * 0.5 : 0;

  const handleRecordAgain = () => {
    // Re-recording replaces the previous draft instead of appending to it.
    onChangeText("");
    void startRecording();
  };

  const switchToTextMode = () => {
    if (isRecording) cancelRecording();
    onInputModeChange("TEXT");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const switchToVoiceAndStart = () => {
    onInputModeChange("VOICE");
    void startRecording();
  };

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

  const isNearLimit = composerText.length >= MAX_TURN_TEXT_LENGTH * 0.9;

  return (
    <footer
      dir={isRtl ? "rtl" : "ltr"}
      className="border-t border-border bg-surface-solid px-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-5 shadow-xs shrink-0"
    >
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
            aria-label={isRtl ? "إغلاق رسالة الخطأ" : "Dismiss voice error"}
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
                {isRtl ? "جارٍ تسجيل الصوت..." : "Recording Speech…"}
              </span>
              <span className="font-meta text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {formatRecordDuration(durationSeconds)} /{" "}
                {formatRecordDuration(MAX_RECORDING_DURATION_SECONDS)} ·{" "}
                {isRtl ? "تحدث بوضوح" : "Speak clearly"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-control border border-border bg-surface-solid font-meta text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => void stopAndTranscribe()}
              className="px-3 py-1 rounded-control bg-alert text-white font-meta text-xs font-bold uppercase tracking-wider cursor-pointer brutalist-shadow-sm"
            >
              {isRtl ? "تم التحدث" : "Done Speaking"}
            </button>
          </div>
        </div>
      )}

      {/* Transcribing Voice Banner */}
      {isTranscribing && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-primary/30 bg-primary/5 p-2.5 sm:p-3 flex items-center gap-2.5 text-primary">
          <RefreshIcon className="w-4 h-4 animate-spin shrink-0" />
          <span className="font-meta text-xs font-semibold truncate">
            {isRtl
              ? "جارٍ تحويل صوتك إلى نص..."
              : "Transcribing your voice with Whisper AI…"}
          </span>
        </div>
      )}

      {/* Expiry Alert */}
      {isExpired && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-amber-300 bg-amber-50 p-2 sm:p-2.5 font-meta text-xs text-amber-900">
          {isRtl
            ? "وصلت هذه المحاكاة إلى الحد الزمني. يمكنك إنهاء الجلسة لعرض تقييمك."
            : "This simulation has reached its time limit. You can finish your rehearsal to view your evaluation."}
        </div>
      )}

      {/* Turn Limit Warning */}
      {isLimitReached && (
        <div className="mb-2.5 sm:mb-3 rounded-control border border-border bg-surface-subtle p-2 sm:p-2.5 font-meta text-xs text-foreground">
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
          if (!isComposerDisabled && !isVoiceBusy && composerText.trim()) {
            onSendTurn();
          }
        }}
        className="flex flex-col gap-2.5 sm:gap-3"
      >
        {isTextInput ? (
          <>
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {isRtl ? "كتابة النص" : "Text response"}
              </span>
              <button
                type="button"
                onClick={switchToVoiceAndStart}
                disabled={isComposerDisabled}
                className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-solid px-2.5 py-1 font-meta text-[10px] font-bold uppercase tracking-wider text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-subtle disabled:opacity-40"
                aria-label={isRtl ? "التبديل إلى الصوت" : "Switch to voice input"}
              >
                <MicIcon
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                {isRtl ? "تحدث بدلاً من ذلك" : "Speak instead"}
              </button>
            </div>
            <div className="relative">
              <label htmlFor="simulation-response-input" className="sr-only">
                {isRtl ? "اكتب ردك" : "Type your response"}
              </label>
              <textarea
                id="simulation-response-input"
                ref={textareaRef}
                rows={2}
                value={composerText}
                dir={isRtl ? "rtl" : "ltr"}
                onChange={(e) =>
                  onChangeText(e.target.value.slice(0, MAX_TURN_TEXT_LENGTH))
                }
                onKeyDown={handleKeyDown}
                disabled={isComposerDisabled}
                placeholder={
                  isRtl ? "اكتب ردك هنا..." : "Type or edit your response…"
                }
                className={cn(
                  "w-full min-h-20 resize-none rounded-control border-2 border-border bg-surface-subtle p-3 font-sans text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-white focus:outline-none disabled:opacity-60",
                  isRtl ? "pl-24 pr-3 text-right" : "pr-24 pl-3 text-left",
                )}
              />
              <button
                type="submit"
                disabled={
                  isComposerDisabled || isVoiceBusy || !composerText.trim()
                }
                className={cn(
                  "absolute bottom-3 inline-flex h-10 items-center gap-1.5 rounded-control bg-primary px-3 text-primary-foreground border border-border disabled:opacity-40 cursor-pointer brutalist-shadow-sm",
                  isRtl ? "left-3" : "right-3",
                )}
                aria-label={isRtl ? "إرسال الرد" : "Send response"}
              >
                {sendingTurn ? (
                  <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendIcon
                    className={cn("h-3.5 w-3.5", isRtl && "scale-x-[-1]")}
                  />
                )}
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider">
                  {isRtl ? "إرسال" : "Send"}
                </span>
              </button>
            </div>
          </>
        ) : hasVoiceDraft ? (
          <>
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                {isRtl ? "المراجعة قبل الإرسال" : "Review before sending"}
              </span>
              <button
                type="button"
                onClick={handleRecordAgain}
                disabled={isComposerDisabled || isVoiceBusy}
                className="inline-flex items-center gap-1.5 rounded-control border-2 border-border bg-surface-solid px-2.5 py-1.5 font-meta text-[10px] font-bold uppercase tracking-wider text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-subtle disabled:opacity-40"
                aria-label={
                  isRtl
                    ? "تجاهل التسجيل وإعادة التسجيل"
                    : "Discard this transcript and record again"
                }
              >
                <MicIcon
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
                {isRtl ? "إعادة التسجيل" : "Record again"}
              </button>
            </div>
            <div className="relative">
              <label htmlFor="simulation-response-input" className="sr-only">
                {isRtl
                  ? "راجع وعدّل ردك قبل الإرسال"
                  : "Review and edit your response before sending"}
              </label>
              <textarea
                id="simulation-response-input"
                ref={textareaRef}
                rows={3}
                value={composerText}
                dir={isRtl ? "rtl" : "ltr"}
                onChange={(e) =>
                  onChangeText(e.target.value.slice(0, MAX_TURN_TEXT_LENGTH))
                }
                onKeyDown={handleKeyDown}
                disabled={isComposerDisabled}
                placeholder={
                  isRtl
                    ? "اكتب ردك هنا..."
                    : "Review or edit your spoken response…"
                }
                className={cn(
                  "w-full min-h-20 resize-none rounded-control border-2 border-border bg-surface-subtle p-3 font-sans text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:bg-white focus:outline-none disabled:opacity-60",
                  isRtl ? "pl-24 pr-3 text-right" : "pr-24 pl-3 text-left",
                )}
              />
              <button
                type="submit"
                disabled={
                  isComposerDisabled || isVoiceBusy || !composerText.trim()
                }
                className={cn(
                  "absolute bottom-3 inline-flex h-10 items-center gap-1.5 rounded-control bg-primary px-3 text-primary-foreground border border-border disabled:opacity-40 cursor-pointer brutalist-shadow-sm",
                  isRtl ? "left-3" : "right-3",
                )}
                aria-label={isRtl ? "إرسال الرد" : "Send response"}
              >
                {sendingTurn ? (
                  <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendIcon
                    className={cn("h-3.5 w-3.5", isRtl && "scale-x-[-1]")}
                  />
                )}
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider">
                  {isRtl ? "إرسال" : "Send"}
                </span>
                <kbd
                  className={cn(
                    "hidden sm:inline-block rounded bg-surface-subtle px-1 py-0.5 text-[9px] font-mono text-foreground border border-border",
                    isRtl ? "mr-1" : "ml-1",
                  )}
                >
                  ↵
                </kbd>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative inline-flex">
              {micReactive && (
                <>
                  <span
                    className="absolute inset-0 rounded-control border-2 border-alert/60 transition-all duration-100 ease-out"
                    style={{
                      transform: `scale(${micRingScale})`,
                      opacity: micRingOpacity,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inset-0 rounded-control border-2 border-alert/40 transition-all duration-100 ease-out"
                    style={{
                      transform: `scale(${micRingScale * 1.2})`,
                      opacity: micRingOpacity * 0.6,
                    }}
                    aria-hidden="true"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={isComposerDisabled || isVoiceBusy}
                aria-keyshortcuts="Space"
                className={cn(
                  "relative inline-flex min-h-14 items-center justify-center gap-3 rounded-control bg-primary px-6 py-3 text-primary-foreground brutalist-interactive cursor-pointer disabled:opacity-40 transition-transform duration-100 ease-out",
                  isRequestingMic && !prefersReducedMotion && "animate-pulse",
                )}
                style={
                  micScale !== 1
                    ? { transform: `scale(${micScale})` }
                    : undefined
                }
                aria-label={isRtl ? "تحدث بردك" : "Speak your response"}
              >
                <MicIcon className="h-5 w-5" aria-hidden="true" />
                <span className="font-display text-sm font-bold uppercase tracking-wider">
                  {isRecording
                    ? isRtl
                      ? "جارٍ الاستماع..."
                      : "Listening…"
                    : isRtl
                      ? "اضغط للتحدث"
                      : "Tap to talk"}
                </span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {reviewBeforeSend ? (
                <>
                  <span className="hidden sm:inline">
                    {isRtl
                      ? "اضغط مع الاستمرار على Space للتحدث، ثم أفلت للمراجعة. اضغط Enter للإرسال."
                      : "Hold Space to talk, release to review. Press Enter to send."}
                  </span>
                  <span className="sm:hidden">
                    {isRtl
                      ? "اضغط للتحدث، ثم اضغط تم للمراجعة."
                      : "Tap to talk, tap Done to review."}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {isRtl
                      ? "اضغط مع الاستمرار على Space للتحدث، ثم أفلت للإرسال."
                      : "Hold Space to talk, release to send."}
                  </span>
                  <span className="sm:hidden">
                    {isRtl
                      ? "اضغط للتحدث، ثم اضغط تم للإرسال."
                      : "Tap to talk, tap Done to send."}
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={reviewBeforeSend}
              onClick={handleToggleReviewMode}
              disabled={isComposerDisabled || isVoiceBusy}
              className="inline-flex min-h-11 items-center gap-2 px-2 py-1.5 cursor-pointer disabled:opacity-40"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-4 w-7 sm:h-5 sm:w-9 shrink-0 items-center rounded-full border border-border transition-colors duration-150 ease-in-out",
                  reviewBeforeSend ? "bg-primary" : "bg-surface-subtle",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 transform rounded-full bg-white transition duration-150 ease-in-out shadow-xs",
                    reviewBeforeSend
                      ? isRtl
                        ? "-translate-x-3.5 sm:-translate-x-4"
                        : "translate-x-3.5 sm:translate-x-4"
                      : isRtl
                        ? "-translate-x-0.5 sm:-translate-x-1"
                        : "translate-x-0.5 sm:translate-x-1",
                  )}
                />
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground select-none">
                {isRtl ? "مراجعة الصوت قبل الإرسال" : "Review before sending"}
              </span>
            </button>
            <button
              type="button"
              onClick={switchToTextMode}
              disabled={isComposerDisabled}
              className="font-meta text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer disabled:opacity-40"
            >
              {isRtl ? "أو اكتب ردك بدلاً من ذلك" : "Or type your response instead"}
            </button>
          </div>
        )}

        {!isTextInput && (
          <button
            type="button"
            onClick={switchToTextMode}
            disabled={isComposerDisabled}
            className="self-center font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            {isRtl ? "الكتابة بدلاً من ذلك" : "Type instead"}
          </button>
        )}

        <div className="flex items-center justify-between font-meta text-[10px] sm:text-[11px] text-muted-foreground px-0.5 sm:px-1">
          <span className="truncate">
            {turnCount >= 1
              ? isRtl
                ? `${turnCount} جولة متبادلة`
                : `${turnCount} turns exchanged`
              : isRtl
                ? "ردك يبدأ المحادثة"
                : "Your response starts the conversation"}
          </span>
          {isTextInput && (
            <span
              className={cn(
                "shrink-0",
                isRtl ? "mr-2" : "ml-2",
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
