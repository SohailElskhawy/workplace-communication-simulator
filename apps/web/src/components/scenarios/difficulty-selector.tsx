"use client";

import type { Difficulty } from "@kalemny/contracts";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface DifficultyOption {
  key: Difficulty;
  title: string;
  titleAr: string;
  counterpart: string;
  counterpartAr: string;
  description: string;
  descriptionAr: string;
}

export const DIFFICULTY_OPTIONS: Record<Difficulty, DifficultyOption> = {
  EASY: {
    key: "EASY",
    title: "Easy",
    titleAr: "أساسي",
    counterpart: "Supportive Counterpart",
    counterpartAr: "محاور داعم",
    description: "Concedes easily to reasonable points with minimal pushback.",
    descriptionAr: "يتقبل الأفكار المنطقية بسهولة مع أقل قدر من الاعتراضات.",
  },
  MEDIUM: {
    key: "MEDIUM",
    title: "Medium",
    titleAr: "متوسط",
    counterpart: "Realistic Pushback",
    counterpartAr: "اعتراضات واقعية",
    description:
      "Standard workplace objections and challenges unsupported claims.",
    descriptionAr: "اعتراضات مهنية واقعية وتحدي الطروحات غير المدعومة بأدلة.",
  },
  HARD: {
    key: "HARD",
    title: "Hard",
    titleAr: "متقدم",
    counterpart: "Challenging Negotiation",
    counterpartAr: "تفاوض صعب",
    description: "Skeptical counterpart who challenges vague reasoning firmly.",
    descriptionAr: "محاور حذر ومشكك يختبر قوة حجتك وحدودك المهنية بصرامة.",
  },
};

const ALL_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface DifficultySelectorProps {
  availableDifficulties: Difficulty[];
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

export function DifficultySelector({
  availableDifficulties,
  selectedDifficulty,
  onSelectDifficulty,
}: DifficultySelectorProps) {
  const { locale, direction } = useLocale();
  const isAr = locale === "ar";

  return (
    <section
      aria-label={isAr ? "اختر مستوى الصعوبة" : "Select simulation difficulty"}
      className="space-y-3 sm:space-y-4"
      dir={direction}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {isAr ? "اختر مستوى الصعوبة" : "Choose difficulty"}
        </h2>
        <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
          {isAr
            ? "يحدد مستوى تشكك المحاور وتعامله مع حججك المهنية"
            : "Calibrates counterpart skepticism and objection thresholds"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {ALL_DIFFICULTIES.map((diffKey) => {
          const opt = DIFFICULTY_OPTIONS[diffKey];
          const isAvailable = availableDifficulties.includes(diffKey);
          const isSelected = selectedDifficulty === diffKey;

          return (
            <button
              key={diffKey}
              type="button"
              disabled={!isAvailable}
              aria-disabled={!isAvailable}
              aria-pressed={isAvailable ? isSelected : false}
              onClick={() => {
                if (isAvailable) {
                  onSelectDifficulty(diffKey);
                }
              }}
              className={cn(
                "relative flex min-h-[44px] flex-col justify-between rounded-card border p-4 text-start transition sm:p-5",
                !isAvailable
                  ? "cursor-not-allowed border-border-subtle bg-surface-subtle opacity-50 text-muted-foreground"
                  : isSelected
                    ? "border-primary bg-selected-surface text-primary shadow-xs ring-1 ring-primary/30 cursor-pointer"
                    : "border-border-subtle bg-surface-solid text-foreground hover:border-border hover:bg-surface-subtle cursor-pointer",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span
                    className={cn(
                      "font-display text-lg font-semibold",
                      !isAvailable
                        ? "text-muted-foreground"
                        : isSelected
                          ? "text-primary"
                          : "text-foreground",
                    )}
                  >
                    {isAr ? opt.titleAr : opt.title}
                  </span>
                  {isSelected && isAvailable ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "h-5 w-5 shrink-0 rounded-full border",
                        !isAvailable
                          ? "border-border-subtle bg-surface-subtle"
                          : "border-border bg-surface-solid",
                      )}
                    />
                  )}
                </div>

                <div className="font-meta text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground mb-1.5 sm:mb-2">
                  {isAr ? opt.counterpartAr : opt.counterpart}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {isAr ? opt.descriptionAr : opt.description}
                </p>
              </div>

              {diffKey === "MEDIUM" && (
                <div className="mt-3 sm:mt-4 pt-2 border-t border-border-subtle/50">
                  <span className="font-meta text-[9px] sm:text-[10px] uppercase font-bold text-primary">
                    {isAr ? "موصى به" : "Recommended"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
