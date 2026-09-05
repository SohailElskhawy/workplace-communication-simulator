"use client";

import { useMemo } from "react";

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

export type { SimulationUiState };

const stateCopy: Record<SimulationUiState, { label: string; detail: string }> =
  {
    YOUR_TURN: {
      label: "Your turn",
      detail: "Respond when you are ready.",
    },
    LISTENING: {
      label: "Listening",
      detail: "We can hear you. Release Space or choose Done speaking.",
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
      label: "Processing",
      detail: "Your counterpart is preparing a response.",
    },
    AI_SPEAKING: {
      label: "AI speaking — you can interrupt",
      detail: "Tap the microphone or hold Space whenever you want the floor.",
    },
    MIC_ERROR: {
      label: "Microphone unavailable",
      detail: "Check permission or continue by typing your response.",
    },
  };

const arabicStateCopy: Record<
  SimulationUiState,
  { label: string; detail: string }
> = {
  YOUR_TURN: {
    label: "دورك الآن",
    detail: "تحدث أو اكتب ردك عندما تكون مستعداً.",
  },
  LISTENING: {
    label: "جارٍ الاستماع",
    detail: "نستمع إليك الآن. أفلت زر المسافة أو اضغط تم للتوقف.",
  },
  TRANSCRIBING: {
    label: "جارٍ تحويل الصوت",
    detail: "جارٍ تحويل تسجيلك إلى نص قابل للتعديل.",
  },
  REVIEWING: {
    label: "راجع ردك",
    detail: "عدّل النص إذا لزم الأمر قبل الإرسال.",
  },
  AI_THINKING: {
    label: "جارٍ المعالجة",
    detail: "المحاور يقوم بإعداد الرد الآن.",
  },
  AI_SPEAKING: {
    label: "المحاور يتحدث — يمكنك المقاطعة",
    detail: "اضغط على الميكروفون أو اضغط مع الاستمرار على المسافة للتحدث.",
  },
  MIC_ERROR: {
    label: "الميكروفون غير متوفر",
    detail: "تحقق من إذن الميكروفون أو تابع بكتابة ردك.",
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
  language?: "en" | "ar";
  isRtl?: boolean;
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
  language,
  isRtl,
}: ConversationStageProps) {
  const rtl = isRtl ?? language === "ar";
  const message = useMemo(() => {
    if (latestAssistantMessage) return latestAssistantMessage;
    if (openingMessage) return { turnId: "opening", text: openingMessage };
    return null;
  }, [latestAssistantMessage, openingMessage]);
  const status = rtl ? arabicStateCopy[uiState] : stateCopy[uiState];

  return (
    <section
      className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto px-3 py-4 sm:justify-center sm:px-8 sm:py-8"
      aria-label="Current conversation"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl">
        <div
          dir={rtl ? "rtl" : "ltr"}
          className="mb-2 flex items-center justify-between gap-2 sm:mb-6"
        >
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <SpeakingWithIcon
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            <span className="font-meta text-[10px] font-bold uppercase tracking-widest">
              {rtl ? "في محادثة مع" : "In conversation with"}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTranscript}
            className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-solid px-2 sm:px-2.5 py-1 sm:py-1.5 font-meta text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-subtle"
            aria-label={
              rtl
                ? `فتح النص مع ${turnCount} جولات`
                : `Open transcript with ${turnCount} turns`
            }
          >
            <DocumentTextIcon
              className="h-3 w-3 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
            <span>{rtl ? "النص الكامل" : "Transcript"}</span>{" "}
            <span className="text-muted-foreground">({turnCount})</span>
          </button>
        </div>

        <div
          dir={rtl ? "rtl" : "ltr"}
          className="rounded-card border border-border-subtle bg-surface-solid shadow-xs"
        >
          {/* Conversation orb: the focal status indicator */}
          <div className="flex flex-col items-center px-3 pt-3 pb-2 sm:px-8 sm:pt-8 sm:pb-5">
            <ConversationOrb
              uiState={uiState}
              microphoneLevel={microphoneLevel}
              className="h-14 w-14 xs:h-18 xs:w-18 sm:h-32 sm:w-32"
            />
            <p className="mt-2.5 sm:mt-4 font-meta text-[11px] sm:text-xs font-bold uppercase tracking-widest text-foreground">
              {status.label}
            </p>
            <p className="mt-0.5 max-w-68 sm:max-w-sm text-center text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
              {status.detail}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 border-t border-border/20 px-5 py-3 sm:px-8">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-primary text-primary-foreground">
              <SpeakingWithIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
                {counterpartRole}
              </p>
              <p className="font-meta text-[10px] uppercase tracking-widest text-primary">
                {rtl ? "المحاور الآلي" : "AI counterpart"}
              </p>
            </div>
          </div>

          {message ? (
            <div
              dir={rtl ? "rtl" : "ltr"}
              className={cn(
                "border-t border-border/20 px-3.5 py-3 sm:px-8 sm:py-5",
                rtl && "text-right",
              )}
            >
              <p
                className={cn(
                  "font-sans text-xs sm:text-base leading-relaxed text-foreground whitespace-pre-wrap",
                  rtl && "text-right",
                )}
              >
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
            <div className="border-t border-border/20 px-4 py-6 text-center text-muted-foreground">
              <RefreshIcon
                className="mx-auto h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary"
                aria-hidden="true"
              />
              <p className="mt-2 font-sans text-xs sm:text-sm">
                {rtl ? "جارٍ تجهيز المحادثة..." : "Preparing the conversation…"}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
