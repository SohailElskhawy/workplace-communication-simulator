"use client";

import type { SupportedLanguage } from "@kalemny/contracts";
import { useEffect, useState } from "react";

import {
  DocumentTextIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VolumeIcon,
} from "@/components/icons";
import { ConversationOrb } from "@/components/simulations/conversation-orb";
import {
  useContinuousLiveCall,
  type LiveCallUiState,
} from "@/hooks/use-continuous-live-call";
import { cn } from "@/lib/cn";

export interface LiveCallStageProps {
  attemptId: string;
  counterpartRole: string;
  language?: SupportedLanguage;
  latestMessage?: { role: "assistant" | "user"; text: string } | null;
  turnCount: number;
  hasOpeningMessage: boolean;
  onFinish: () => void;
  onOpenTranscript: () => void;
  onTranscribeAudio: (
    audioBlob: Blob,
    durationMs: number,
  ) => Promise<{ transcript: string }>;
  onSendTurn: (text: string) => Promise<string | null>;
  onRequestAudioStream: (turnId: string) => Promise<Blob>;
}

export function LiveCallStage({
  attemptId,
  counterpartRole,
  language = "en",
  latestMessage,
  turnCount,
  hasOpeningMessage,
  onFinish,
  onOpenTranscript,
  onTranscribeAudio,
  onSendTurn,
  onRequestAudioStream,
}: LiveCallStageProps) {
  const isAr = language === "ar";
  const [callDuration, setCallDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    callState,
    microphoneLevel,
    isMuted,
    isConnected,
    interruptionCount,
    startCall,
    toggleMute,
    interruptAi,
    endCall,
  } = useContinuousLiveCall({
    hasOpeningMessage,
    onTranscribeAudio,
    onSendTurn,
    onRequestAudioStream,
    onError: (err) => setErrorMessage(err),
  });

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Map LiveCallUiState to ConversationOrb SimulationUiState
  const mapUiStateForOrb = (state: LiveCallUiState) => {
    switch (state) {
      case "USER_SPEAKING":
        return "LISTENING";
      case "LISTENING":
        return "YOUR_TURN";
      case "AI_THINKING":
        return "AI_THINKING";
      case "AI_SPEAKING":
        return "AI_SPEAKING";
      case "MUTED":
        return "YOUR_TURN";
      case "ERROR":
        return "MIC_ERROR";
      default:
        return "YOUR_TURN";
    }
  };

  // Localized Status Copy
  const statusLabels: Record<
    LiveCallUiState,
    { en: string; ar: string; descEn: string; descAr: string }
  > = {
    CONNECTING: {
      en: "Connecting Call...",
      ar: "جارٍ الاتصال...",
      descEn: "Opening audio channel with AI counterpart",
      descAr: "فتح قناة الصوت مع المحاور الآلي",
    },
    LISTENING: {
      en: "Listening — Speak Naturally",
      ar: "نستمع إليك — تحدث بحرية",
      descEn: "Speak when ready. We'll automatically detect when you finish.",
      descAr: "تحدث عندما تكون مستعداً. سنكتشف انتهاءك تلقائياً.",
    },
    USER_SPEAKING: {
      en: "Hearing you...",
      ar: "نستمع لصوتك...",
      descEn: "Voice energy detected",
      descAr: "تم اكتشاف الصوت",
    },
    AI_THINKING: {
      en: "Processing reply...",
      ar: "جارٍ التفكير في الرد...",
      descEn: "AI is preparing a realistic response",
      descAr: "المحاور الآلي يجهز رده",
    },
    AI_SPEAKING: {
      en: "AI Speaking — You can interrupt",
      ar: "المحاور يتحدث — يمكنك المقاطعة",
      descEn: "Speak at any time to barge in",
      descAr: "تحدث في أي وقت لمقاطعته مباشرة",
    },
    MUTED: {
      en: "Microphone Muted",
      ar: "الميكروفون مكتوم",
      descEn: "Unmute to continue speaking",
      descAr: "قم بإلغاء الكتم للمتابعة",
    },
    ERROR: {
      en: "Audio Connection Issue",
      ar: "مشكلة في الاتصال الصوتي",
      descEn: "Please ensure microphone permission is granted",
      descAr: "يرجى التأكد من منح إذن الميكروفون",
    },
  };

  const currentLabel = statusLabels[callState];

  // 1. Lobby screen if not connected yet
  if (!isConnected) {
    return (
      <section
        data-testid="live-call-lobby"
        data-attempt-id={attemptId}
        aria-label={isAr ? "بدء المكالمة المباشرة" : "Start Live Call"}
        className="w-full max-w-2xl mx-auto my-auto p-6 sm:p-10 rounded-card border-2 border-border bg-surface-solid shadow-[6px_6px_0px_0px_#1a1a1a] text-center space-y-6 sm:space-y-8"
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="relative mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary">
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          <PhoneIcon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        </div>

        <div className="space-y-2">
          <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
            {isAr ? "مكالمة صوتية مباشرة بدون استخدام اليدين" : "Hands-Free Continuous Call"}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">
            {isAr
              ? `جاهز للمكالمة مع ${counterpartRole}؟`
              : `Ready to talk with ${counterpartRole}?`}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {isAr
              ? "تحدث بحرية وبشكل طبيعي تماماً كأنك في مكالمة حقيقية. يكتشف النظام صوتك تلقائياً ويرد بصوت عصبي واقعي مع إمكانية المقاطعة."
              : "Speak naturally as if on a real phone call. The simulator detects your speech, replies instantly with studio-quality neural voice, and allows natural interruption."}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-control border-2 border-alert bg-alert/10 p-3 font-sans text-xs text-alert"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={startCall}
          className="inline-flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 rounded-control bg-primary text-primary-foreground font-display text-sm sm:text-base font-bold uppercase tracking-wider border-2 border-border brutalist-interactive shadow-[4px_4px_0px_0px_#1a1a1a] cursor-pointer"
        >
          <PhoneIcon className="w-5 h-5" />
          <span>{isAr ? "بدء المكالمة الآن" : "Start Live Call"}</span>
        </button>
      </section>
    );
  }

  // 2. Active Live Call Screen
  return (
    <section
      data-testid="live-call-active"
      data-attempt-id={attemptId}
      aria-label={isAr ? "مكالمة جارية" : "Active Live Call"}
      className="relative flex flex-col justify-between min-h-[500px] sm:min-h-[580px] w-full max-w-3xl mx-auto rounded-card border-2 border-border bg-surface-solid shadow-[6px_6px_0px_0px_#1a1a1a] p-4 sm:p-8"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* A. Top Call Status Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border/20">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="font-meta text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
            {isAr ? "مكالمة جارية" : "Live Call"}
          </span>
          <span className="font-mono text-xs font-bold text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded border border-border/20">
            {formatTime(callDuration)}
          </span>
          <span className="font-meta text-xs font-bold text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded border border-border/20">
            {isAr ? `الجولة ${turnCount}` : `Turn ${turnCount}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {interruptionCount > 0 && (
            <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              {isAr ? `${interruptionCount} مقاطعة` : `${interruptionCount} interruptions`}
            </span>
          )}
          <span className="font-meta text-xs font-bold text-foreground">
            {counterpartRole}
          </span>
        </div>
      </div>

      {/* B. Center Audio Visualizer & Orb */}
      <div className="flex flex-col items-center justify-center my-auto py-8 space-y-6 text-center">
        <div className="relative">
          <ConversationOrb
            uiState={mapUiStateForOrb(callState)}
            microphoneLevel={microphoneLevel}
            className="w-36 h-36 sm:w-48 sm:h-48"
          />
        </div>

        {/* State Label & Guidance */}
        <div className="space-y-1.5 max-w-md">
          <h3
            className={cn(
              "font-display text-lg sm:text-xl font-bold uppercase tracking-tight",
              callState === "AI_SPEAKING"
                ? "text-primary"
                : callState === "USER_SPEAKING"
                  ? "text-emerald-500"
                  : "text-foreground",
            )}
          >
            {isAr ? currentLabel.ar : currentLabel.en}
          </h3>
          <p className="font-sans text-xs text-muted-foreground">
            {isAr ? currentLabel.descAr : currentLabel.descEn}
          </p>
        </div>

        {/* Subtitles / Latest Exchange */}
        {latestMessage && (
          <div className="w-full max-w-lg mt-4 p-3 sm:p-4 rounded-control border border-border/30 bg-surface-elevated/40 text-start space-y-1 shadow-2xs">
            <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground block">
              {latestMessage.role === "assistant"
                ? counterpartRole
                : isAr
                  ? "أنت"
                  : "You"}
            </span>
            <p className="font-sans text-xs sm:text-sm text-foreground line-clamp-3 leading-relaxed">
              {latestMessage.text}
            </p>
          </div>
        )}
      </div>

      {/* C. Bottom Live Call Control Bar */}
      <div className="pt-4 border-t border-border/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-control border-2 transition-colors cursor-pointer",
              isMuted
                ? "bg-alert/15 border-alert text-alert"
                : "bg-surface-elevated border-border text-foreground hover:bg-surface-elevated/80",
            )}
            title={isMuted ? (isAr ? "إلغاء الكتم" : "Unmute") : (isAr ? "كتم الصوت" : "Mute")}
          >
            {isMuted ? (
              <MicOffIcon className="w-5 h-5" />
            ) : (
              <MicIcon className="w-5 h-5" />
            )}
          </button>

          {/* Manual Interrupt Button (visible while AI speaks) */}
          {callState === "AI_SPEAKING" && (
            <button
              type="button"
              onClick={interruptAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-control border-2 border-primary bg-primary/10 text-primary font-display text-xs font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <VolumeIcon className="w-4 h-4" />
              <span>{isAr ? "مقاطعة المحاور" : "Interrupt"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Open Transcript Drawer */}
          <button
            type="button"
            onClick={onOpenTranscript}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-control border border-border bg-surface-elevated text-foreground font-meta text-xs font-bold uppercase tracking-wider hover:bg-surface-elevated/80 transition-colors cursor-pointer"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isAr ? "نص المحادثة" : "Transcript"}
            </span>
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={() => {
              endCall();
              onFinish();
            }}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-control border-2 border-alert bg-alert text-alert-foreground font-display text-xs sm:text-sm font-bold uppercase tracking-wider brutalist-interactive cursor-pointer shadow-[3px_3px_0px_0px_#1a1a1a]"
          >
            <PhoneOffIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isAr ? "إنهاء المكالمة" : "End Call"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
