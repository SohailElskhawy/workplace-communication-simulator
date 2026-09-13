"use client";

import type { ArabicDialect, SupportedLanguage } from "@kalemny/contracts";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface LanguageOption {
  key: SupportedLanguage;
  title: string;
  nativeTitle: string;
  tagline: string;
  description: string;
}

export const LANGUAGE_OPTIONS: Record<SupportedLanguage, LanguageOption> = {
  en: {
    key: "en",
    title: "English",
    nativeTitle: "English",
    tagline: "Professional English",
    description:
      "Practice conversations in natural workplace English with standard professional business vocabulary.",
  },
  ar: {
    key: "ar",
    title: "Arabic",
    nativeTitle: "العربية",
    tagline: "محاكاة واقعية باللغة العربية",
    description:
      "محادثة واقعية باللغة العربية العامية المعتمدة في بيئات العمل والتفاوض المهني.",
  },
};

export interface DialectOption {
  key: ArabicDialect;
  title: string;
  englishLabel: string;
  tagline: string;
  description: string;
  recommended?: boolean;
}

export const DIALECT_OPTIONS: Record<ArabicDialect, DialectOption> = {
  EGYPTIAN: {
    key: "EGYPTIAN",
    title: "لهجة مصرية",
    englishLabel: "Egyptian Dialect",
    tagline: "القاهرة وبيئات العمل الإقليمية",
    description:
      "اللهجة الأكثر انتشاراً واستيعاباً في التواصل المهني والتفاوض عبر الوطن العربي.",
    recommended: true,
  },
  GULF: {
    key: "GULF",
    title: "لهجة خليجية",
    englishLabel: "Gulf Dialect",
    tagline: "دول مجلس التعاون الخليجي",
    description:
      "لهجة خليجية بيضاء تناسب المحادثات المهنية وبيئات الشركات في منطقة الخليج العربي.",
  },
};

export interface LanguageDialectSelectorProps {
  language: SupportedLanguage;
  dialect: ArabicDialect;
  onSelectLanguage: (language: SupportedLanguage) => void;
  onSelectDialect: (dialect: ArabicDialect) => void;
}

export function LanguageDialectSelector({
  language,
  dialect,
  onSelectLanguage,
  onSelectDialect,
}: LanguageDialectSelectorProps) {
  const { locale, direction } = useLocale();
  const isAr = locale === "ar";

  return (
    <section
      aria-label={isAr ? "اختر لغة التدريب واللهجة" : "Select simulation language and dialect"}
      className="space-y-4 sm:space-y-5"
      dir={direction}
    >
      {/* 1. Language Selection */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {isAr ? "اختر لغة المحادثة" : "Choose language"}
          </h2>
          <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
            {isAr
              ? "تحدد لغة الحوار الأساسية ولغة المحاور"
              : "Sets the primary dialogue and counterpart language"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {(["en", "ar"] as const).map((langKey) => {
            const opt = LANGUAGE_OPTIONS[langKey];
            const isSelected = language === langKey;

            return (
              <button
                key={langKey}
                type="button"
                onClick={() => onSelectLanguage(langKey)}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex min-h-[44px] flex-col justify-between rounded-card border p-4 text-start transition sm:p-5 cursor-pointer",
                  isSelected
                    ? "border-primary bg-selected-surface text-primary shadow-xs ring-1 ring-primary/30"
                    : "border-border-subtle bg-surface-solid text-foreground hover:border-border hover:bg-surface-subtle",
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-display text-lg font-semibold",
                          isSelected ? "text-primary" : "text-foreground",
                        )}
                      >
                        {opt.nativeTitle}
                      </span>
                      {langKey === "ar" && (
                        <span className="font-meta text-[11px] text-muted-foreground font-medium">
                          ({opt.title})
                        </span>
                      )}
                    </div>
                    {isSelected ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border border-border bg-surface-solid" />
                    )}
                  </div>

                  <div
                    className="font-meta text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground mb-1.5 sm:mb-2"
                    dir={langKey === "ar" ? "rtl" : "ltr"}
                  >
                    {opt.tagline}
                  </div>

                  <p
                    className="font-sans text-xs text-muted-foreground leading-relaxed"
                    dir={langKey === "ar" ? "rtl" : "ltr"}
                  >
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dialect Selection (Conditional on Arabic) */}
      {language === "ar" && (
        <div className="space-y-3 sm:space-y-4 pt-4 border-t border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h3 className="font-display text-xl font-semibold text-foreground">
              {isAr ? "اختر اللهجة" : "اختر اللهجة (Choose Dialect)"}
            </h3>
            <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
              {isAr
                ? "اختر اللهجة العامية العربية للمحاور"
                : "Select colloquial Arabic counterpart dialect"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {(["EGYPTIAN", "GULF"] as const).map((dialectKey) => {
              const opt = DIALECT_OPTIONS[dialectKey];
              const isSelected = dialect === dialectKey;

              return (
                <button
                  key={dialectKey}
                  type="button"
                  onClick={() => onSelectDialect(dialectKey)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex min-h-[44px] flex-col justify-between rounded-card border p-4 text-start transition sm:p-5 cursor-pointer",
                    isSelected
                      ? "border-primary bg-selected-surface text-primary shadow-xs ring-1 ring-primary/30"
                      : "border-border-subtle bg-surface-solid text-foreground hover:border-border hover:bg-surface-subtle",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-display text-lg font-semibold",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                          dir="rtl"
                        >
                          {opt.title}
                        </span>
                        <span className="font-meta text-[11px] text-muted-foreground font-medium">
                          ({opt.englishLabel})
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border border-border bg-surface-solid" />
                      )}
                    </div>

                    <div
                      className="font-meta text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground mb-1.5 sm:mb-2"
                      dir="rtl"
                    >
                      {opt.tagline}
                    </div>

                    <p
                      className="font-sans text-xs text-muted-foreground leading-relaxed"
                      dir="rtl"
                    >
                      {opt.description}
                    </p>
                  </div>

                  {opt.recommended && (
                    <div className="mt-3 sm:mt-4 pt-2 border-t border-border-subtle/50">
                      <span className="font-meta text-[9px] sm:text-[10px] uppercase font-bold text-primary">
                        {isAr ? "الافتراضية" : "Default / الافتراضية"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
