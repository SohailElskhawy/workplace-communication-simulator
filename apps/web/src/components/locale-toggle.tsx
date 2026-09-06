"use client";

import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/cn";

export interface LocaleToggleProps {
  className?: string;
}

export function LocaleToggle({ className }: LocaleToggleProps) {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-control border border-border bg-surface-solid px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-border-active hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer select-none",
        className,
      )}
      aria-label={
        locale === "en" ? "تبديل اللغة إلى العربية" : "Switch language to English"
      }
      title={
        locale === "en" ? "تبديل اللغة إلى العربية" : "Switch language to English"
      }
    >
      <svg
        className="h-3.5 w-3.5 text-muted-foreground shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      <span>{t("locale.switch")}</span>
    </button>
  );
}
