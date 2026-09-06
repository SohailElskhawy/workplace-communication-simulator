"use client";

import type { InteractionMode, SupportedLanguage } from "@kalemny/contracts";

import { CheckIcon, MicIcon, PhoneIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface PracticeModeOption {
  key: InteractionMode;
  titleEn: string;
  titleAr: string;
  badgeEn: string;
  badgeAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const PRACTICE_MODE_OPTIONS: Record<InteractionMode, PracticeModeOption> = {
  PUSH_TO_TALK: {
    key: "PUSH_TO_TALK",
    titleEn: "Push-to-Talk",
    titleAr: "اضغط للتحدث",
    badgeEn: "Recommended",
    badgeAr: "موصى به",
    descriptionEn:
      "Hold Space or tap the mic to record. Review and edit your transcript before sending, with typing always available.",
    descriptionAr:
      "اضغط على المسافة أو زر الميكروفون للتحدث. يمكنك مراجعة وتعديل النص قبل الإرسال مع إمكانية الكتابة في أي وقت.",
  },
  REALTIME: {
    key: "REALTIME",
    titleEn: "Live Call (Hands-Free)",
    titleAr: "مكالمة صوتية مباشرة",
    badgeEn: "Fast & Natural",
    badgeAr: "طبيعي وسريع",
    descriptionEn:
      "Continuous hands-free voice call. The AI automatically detects when you speak, replies with neural voice, and supports interruption.",
    descriptionAr:
      "مكالمة صوتية متواصلة بدون استخدام اليدين. يكتشف النظام صوتك تلقائياً ويرد بصوت طبيعي مع إمكانية المقاطعة في أي وقت.",
  },
};

export interface PracticeModeSelectorProps {
  mode: InteractionMode;
  onSelectMode: (mode: InteractionMode) => void;
  language?: SupportedLanguage;
}

export function PracticeModeSelector({
  mode,
  onSelectMode,
  language = "en",
}: PracticeModeSelectorProps) {
  const isAr = language === "ar";
  const modes: InteractionMode[] = ["PUSH_TO_TALK", "REALTIME"];

  return (
    <section
      aria-label={isAr ? "اختر طريقة التدريب" : "Select practice mode"}
      className="space-y-3 sm:space-y-4 font-sans"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
          {isAr ? "طريقة التدريب" : "Practice Mode"}
        </h2>
        <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
          {isAr
            ? "اختر بين التحكم الدقيق في كل جولة أو المكالمة الصوتية المباشرة"
            : "Choose between deliberate turn-taking or a hands-free continuous call"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {modes.map((key) => {
          const opt = PRACTICE_MODE_OPTIONS[key];
          const isSelected = mode === key;
          const Icon = key === "REALTIME" ? PhoneIcon : MicIcon;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectMode(key)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex min-h-36 flex-col justify-between rounded-card border-2 p-4 sm:p-5 text-start transition-all cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 shadow-[3px_3px_0px_0px_#1a1a1a]"
                  : "border-border-subtle bg-surface-solid hover:border-border hover:bg-surface-elevated/40 shadow-xs",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-control border border-border/40",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-elevated text-muted-foreground",
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "font-display text-base sm:text-lg font-bold uppercase tracking-tight",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {isAr ? opt.titleAr : opt.titleEn}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="w-3 h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border/40 bg-surface-solid" />
                  )}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {isAr ? opt.descriptionAr : opt.descriptionEn}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/10 flex items-center justify-between">
                <span
                  className={cn(
                    "font-meta text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                    isSelected
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-surface-elevated text-muted-foreground border-border/20",
                  )}
                >
                  {isAr ? opt.badgeAr : opt.badgeEn}
                </span>
                {key === "REALTIME" && (
                  <span className="font-meta text-[9px] uppercase font-bold text-muted-foreground/80">
                    {isAr ? "صوت عصبي بدون تكلفة" : "$0 Neural Voice"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
