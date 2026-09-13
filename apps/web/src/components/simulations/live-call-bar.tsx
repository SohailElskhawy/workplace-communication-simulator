"use client";

import type { SupportedLanguage } from "@kalemny/contracts";
import { Keyboard as KeyboardIcon } from "lucide-react";

import { MicIcon, MicOffIcon, VolumeIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface LiveCallBarProps {
  connected: boolean;
  microphoneLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isCounterpartSpeaking: boolean;
  onInterruptAudio: () => void;
  onToggleTyping: () => void;
  isTypingOpen: boolean;
  language?: SupportedLanguage | undefined;
}

const WAVEFORM_MULTIPLIERS = [0.35, 0.7, 1.0, 0.65, 0.4];

export function LiveCallBar({
  connected,
  microphoneLevel,
  isMuted,
  onToggleMute,
  isCounterpartSpeaking,
  onInterruptAudio,
  onToggleTyping,
  isTypingOpen,
  language,
}: LiveCallBarProps) {
  const { locale: appLocale } = useLocale();
  const activeLocale = (language ?? appLocale) as "en" | "ar";
  const isAr = activeLocale === "ar";

  const clampedLevel = Math.min(1, Math.max(0, microphoneLevel));

  return (
    <div
      data-testid="live-call-bar"
      role="region"
      aria-label={isAr ? "شريط المكالمة المباشرة" : "Live call bar"}
      className="border-t border-border-subtle bg-surface-solid p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs"
    >
      {/* Status section (left in LTR, right in RTL) */}
      <div className="flex items-center gap-3">
        {/* Connection indicator */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            data-testid="connection-status-dot"
            className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              connected
                ? "bg-emerald-500 animate-pulse"
                : "bg-muted-foreground/40",
            )}
          />
          <span
            data-testid="connection-status-label"
            className="text-xs sm:text-sm font-medium text-foreground"
          >
            {connected
              ? isAr
                ? "متصل • مكالمة صوتية مباشرة"
                : "Connected • Live Call"
              : isAr
                ? "جارٍ الاتصال…"
                : "Connecting…"}
          </span>
        </div>

        {/* Voice activity / audio level visualizer (when connected and unmuted) */}
        {connected && !isMuted && (
          <div
            aria-hidden="true"
            data-testid="live-call-waveform"
            className="flex items-center gap-0.5 h-5 px-1"
          >
            {WAVEFORM_MULTIPLIERS.map((mult, idx) => {
              const heightPercent = Math.max(
                20,
                Math.min(100, Math.round(clampedLevel * mult * 100)),
              );
              return (
                <span
                  key={idx}
                  data-testid="waveform-bar"
                  className="w-1 bg-primary rounded-full transition-all duration-75"
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: "4px",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* When isMuted, display muted status indicator or text: "Muted" (Arabic: "مكتوم") */}
        {connected && isMuted && (
          <span
            data-testid="live-call-muted-badge"
            className="text-xs text-muted-foreground font-medium flex items-center gap-1"
          >
            <MicOffIcon className="h-3.5 w-3.5 text-alert" aria-hidden="true" />
            <span>{isAr ? "مكتوم" : "Muted"}</span>
          </span>
        )}
      </div>

      {/* Action Controls section */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Barge-in Interrupt Button: Rendered when isCounterpartSpeaking === true */}
        {isCounterpartSpeaking && (
          <button
            type="button"
            onClick={onInterruptAudio}
            aria-label={isAr ? "اضغط للمقاطعة" : "Tap to interrupt"}
            className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <VolumeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm">
              {isAr ? "اضغط للمقاطعة" : "Tap to interrupt"}
            </span>
          </button>
        )}

        {/* Mute / Unmute Button: Rendered always when connected */}
        {connected && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={
              isMuted
                ? isAr
                  ? "إلغاء كتم الميكروفون"
                  : "Unmute microphone"
                : isAr
                  ? "كتم الميكروفون"
                  : "Mute microphone"
            }
            title={
              isMuted
                ? isAr
                  ? "إلغاء كتم الميكروفون"
                  : "Unmute microphone"
                : isAr
                  ? "كتم الميكروفون"
                  : "Mute microphone"
            }
            className={cn(
              "min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors cursor-pointer",
              isMuted
                ? "bg-alert-surface border-alert/30 text-alert-foreground hover:bg-alert-surface/80"
                : "bg-surface-subtle border-border text-foreground hover:bg-surface-solid",
            )}
          >
            {isMuted ? (
              <MicOffIcon className="h-5 w-5 text-alert-foreground" aria-hidden="true" />
            ) : (
              <MicIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Hybrid Typing Toggle */}
        <button
          type="button"
          onClick={onToggleTyping}
          aria-expanded={isTypingOpen}
          aria-label={
            isTypingOpen
              ? isAr
                ? "إخفاء النص"
                : "Hide text"
              : isAr
                ? "اكتب رداً"
                : "Type response"
          }
          className={cn(
            "min-h-[44px] min-w-[44px] border rounded-control px-4 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer",
            isTypingOpen
              ? "bg-primary-muted border-primary/30 text-primary"
              : "border-border bg-surface-subtle text-foreground hover:bg-surface-solid",
          )}
        >
          <KeyboardIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {isTypingOpen
              ? isAr
                ? "إخفاء النص"
                : "Hide text"
              : isAr
                ? "اكتب رداً"
                : "Type response"}
          </span>
        </button>
      </div>
    </div>
  );
}
