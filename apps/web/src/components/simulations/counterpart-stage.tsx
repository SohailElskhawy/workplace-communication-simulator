"use client";

import { useState } from "react";
import Image from "next/image";

import { ChevronDownIcon, VolumeMuteIcon } from "@/components/icons";
import { useLocale } from "@/lib/locale-context";
import { getScenarioImage } from "@/lib/scenario-images";
import { cn } from "@/lib/cn";
import type { SpeechPlaybackStatus } from "@/lib/speech-playback-controller";

export type SimulationUiState =
  | "YOUR_TURN"
  | "LISTENING"
  | "TRANSCRIBING"
  | "REVIEWING"
  | "AI_THINKING"
  | "AI_SPEAKING"
  | "MIC_ERROR";

export interface CounterpartStageProps {
  scenarioKey: string;
  scenarioTitle: string;
  counterpartName: string;
  counterpartRole: string;
  userRole: string;
  userObjective: string;
  stakes?: string | undefined;
  isCustom?: boolean | undefined;
  uiState: SimulationUiState;
  counterpartSpeechStatus: SpeechPlaybackStatus;
  onStopAudio: () => void;
  isKeyboardOpen?: boolean | undefined;
}

const STATE_BADGE_CONFIG: Record<
  SimulationUiState,
  {
    en: string;
    ar: string;
    className: string;
  }
> = {
  YOUR_TURN: {
    en: "Your turn to speak",
    ar: "دورك في الحديث",
    className: "bg-primary-muted text-primary",
  },
  LISTENING: {
    en: "Listening…",
    ar: "نستمع إليك الآن…",
    className: "bg-surface-subtle text-foreground animate-pulse",
  },
  TRANSCRIBING: {
    en: "Transcribing your voice…",
    ar: "جارٍ تحويل الصوت إلى نص…",
    className: "bg-surface-subtle text-foreground",
  },
  REVIEWING: {
    en: "Review your response",
    ar: "راجع ردك",
    className: "bg-primary-muted text-primary",
  },
  AI_THINKING: {
    en: "Preparing response…",
    ar: "المحاور يجهز الرد الآن…",
    className: "bg-surface-subtle text-foreground",
  },
  AI_SPEAKING: {
    en: "Counterpart is speaking",
    ar: "المحاور يتحدث",
    className: "bg-success-surface text-success-foreground",
  },
  MIC_ERROR: {
    en: "Microphone unavailable",
    ar: "الميكروفون غير متوفر",
    className: "bg-alert-surface text-alert-foreground",
  },
};

export function CounterpartStage({
  scenarioKey,
  scenarioTitle,
  counterpartName,
  counterpartRole,
  userRole,
  userObjective,
  stakes,
  isCustom = false,
  uiState,
  counterpartSpeechStatus,
  onStopAudio,
  isKeyboardOpen = false,
}: CounterpartStageProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const [isBriefingOpen, setIsBriefingOpen] = useState(true);

  // Portrait selection: fallback to "behavioral-interview" (2.png) if null / custom
  const portrait =
    (!isCustom && scenarioKey ? getScenarioImage(scenarioKey) : null) ??
    getScenarioImage("behavioral-interview");

  const badgeConfig = STATE_BADGE_CONFIG[uiState] ?? STATE_BADGE_CONFIG.YOUR_TURN;
  const badgeText = isArabic ? badgeConfig.ar : badgeConfig.en;
  const isAudioPlaying = counterpartSpeechStatus === "playing";

  // Mobile Keyboard-Collapsed Strip (36px high: h-9)
  if (isKeyboardOpen) {
    return (
      <div
        data-testid="counterpart-stage-collapsed"
        className="h-9 px-3 flex items-center justify-between gap-2 border-b border-border-subtle bg-surface-solid w-full shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-subtle">
            {portrait ? (
              <Image
                src={portrait}
                alt={counterpartName}
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-xs font-semibold text-muted-foreground">
                {counterpartName ? counterpartName.charAt(0).toUpperCase() : "AI"}
              </div>
            )}
          </div>
          <span className="font-display text-xs font-bold text-foreground truncate">
            {counterpartName}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
              badgeConfig.className,
            )}
          >
            {badgeText}
          </span>
        </div>

        {isAudioPlaying && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Animated frequency wave bars */}
            <div
              data-testid="soundwave"
              aria-hidden="true"
              className="flex items-center gap-0.5 h-3"
            >
              <span className="w-0.5 rounded-full bg-success animate-pulse h-2 [animation-duration:500ms]" />
              <span className="w-0.5 rounded-full bg-success animate-pulse h-3 [animation-duration:700ms]" />
              <span className="w-0.5 rounded-full bg-success animate-pulse h-1.5 [animation-duration:450ms]" />
            </div>

            {/* Barge-in Stop Audio button */}
            <button
              type="button"
              onClick={onStopAudio}
              className="bg-primary text-primary-foreground min-h-[44px] min-w-[44px] px-3 rounded-control font-semibold text-xs flex items-center gap-1.5 shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
              aria-label={isArabic ? "إيقاف الصوت" : "Stop audio"}
            >
              <VolumeMuteIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isArabic ? "إيقاف الصوت" : "Stop audio"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      data-testid="counterpart-stage"
      className="flex flex-col gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-card bg-surface-solid border border-border-subtle shadow-xs w-full"
    >
      {/* Top section: Portrait + Identity + State */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Static Portrait: Desktop 80x80px, Mobile 60x60px */}
        <div className="relative h-[60px] w-[60px] md:h-20 md:w-20 shrink-0 overflow-hidden rounded-2xl border border-border-subtle shadow-xs bg-surface-subtle">
          {portrait ? (
            <Image
              src={portrait}
              alt={counterpartName}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg md:text-xl font-bold text-muted-foreground">
              {counterpartName ? counterpartName.charAt(0).toUpperCase() : "AI"}
            </div>
          )}
        </div>

        {/* Counterpart Identity and Live State Badge */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-sm sm:text-base md:text-lg font-bold text-foreground truncate">
              {counterpartName}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-muted text-primary shrink-0">
              {isArabic ? "شريك المحاكاة بالذكاء الاصطناعي" : "AI Roleplay Partner"}
            </span>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground font-medium truncate mt-0.5">
            {counterpartRole}
          </p>

          {/* Conversational State Badge & Stop Audio Button */}
          <div className="flex items-center gap-2 mt-2.5 sm:mt-3 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3 py-1 text-xs font-semibold shrink-0",
                badgeConfig.className,
              )}
            >
              <span>{badgeText}</span>
              {isAudioPlaying && (
                <div
                  data-testid="soundwave"
                  aria-hidden="true"
                  className="flex items-center gap-0.5 h-3.5 ms-1"
                >
                  <span className="w-1 rounded-full bg-success animate-pulse h-2 [animation-duration:500ms]" />
                  <span className="w-1 rounded-full bg-success animate-pulse h-3.5 [animation-duration:750ms]" />
                  <span className="w-1 rounded-full bg-success animate-pulse h-2 [animation-duration:450ms]" />
                  <span className="w-1 rounded-full bg-success animate-pulse h-3 [animation-duration:650ms]" />
                </div>
              )}
            </span>

            {/* Barge-in Stop Audio button (min 44px target) */}
            {isAudioPlaying && (
              <button
                type="button"
                onClick={onStopAudio}
                className="bg-primary text-primary-foreground min-h-[44px] min-w-[44px] px-4 rounded-control font-semibold text-xs flex items-center gap-1.5 shadow-xs hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
              >
                <VolumeMuteIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isArabic ? "إيقاف الصوت" : "Stop audio"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Briefing Accordion */}
      <div className="hidden md:block border-t border-border-subtle pt-3 mt-1">
        <button
          type="button"
          onClick={() => setIsBriefingOpen((prev) => !prev)}
          aria-expanded={isBriefingOpen}
          className="w-full flex items-center justify-between py-2 text-start font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors min-h-[44px] cursor-pointer"
        >
          <div className="flex flex-col text-start">
            <span>{isArabic ? "ملخص الموقف" : "Scenario Briefing"}</span>
            {scenarioTitle && (
              <span className="font-meta text-[10px] font-normal text-muted-foreground/80 normal-case">
                {scenarioTitle}
              </span>
            )}
          </div>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform duration-200 shrink-0",
              isBriefingOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {isBriefingOpen && (
          <div className="mt-2 space-y-2.5 text-xs">
            {/* Your Role */}
            <div className="rounded-control bg-surface-subtle p-3 border border-border/30">
              <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                {isArabic ? "دورك" : "Your Role"}
              </span>
              <p className="text-foreground font-medium leading-relaxed">{userRole}</p>
            </div>

            {/* Primary Objective */}
            <div className="rounded-control bg-primary-muted/60 p-3 border border-primary/20">
              <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">
                {isArabic ? "الهدف الأساسي" : "Primary Objective"}
              </span>
              <p className="text-foreground font-medium leading-relaxed">{userObjective}</p>
            </div>

            {/* Stakes (if present) */}
            {stakes ? (
              <div className="rounded-control bg-surface-subtle p-3 border border-border/30">
                <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  {isArabic ? "الرهانات" : "Stakes"}
                </span>
                <p className="text-muted-foreground leading-relaxed">{stakes}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
