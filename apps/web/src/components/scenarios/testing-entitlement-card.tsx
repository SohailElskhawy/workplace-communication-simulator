"use client";

import { AlertTriangleIcon, SparklesIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface TestingEntitlementCardProps {
  remaining: number;
  limit: number;
  resetWindowDays?: number;
  loading?: boolean;
}

export function TestingEntitlementCard({
  remaining,
  limit,
  resetWindowDays = 7,
  loading = false,
}: TestingEntitlementCardProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const isExhausted = remaining <= 0;

  if (loading) {
    return (
      <div
        role="status"
        aria-label={isArabic ? "جارٍ تحميل الرصيد..." : "Loading practice balance..."}
        className="animate-pulse rounded-card border border-border-subtle bg-surface-solid p-5 sm:p-6"
      >
        <span className="sr-only">
          {isArabic ? "جارٍ تحميل الرصيد..." : "Loading practice balance..."}
        </span>
        <div className="h-4 w-32 rounded bg-surface-subtle" />
        <div className="mt-2 h-6 w-56 rounded bg-surface-subtle" />
      </div>
    );
  }

  return (
    <section
      aria-label={isArabic ? "رصيد التجربة الأسبوعي" : "Weekly testing practice quota"}
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-card border p-5 sm:p-6 transition-colors shadow-xs",
        isExhausted
          ? "border-alert/30 bg-alert-surface text-alert-foreground"
          : "border-border-subtle bg-surface-solid text-foreground",
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isExhausted
              ? "bg-alert/10 text-alert"
              : "bg-primary-muted text-primary",
          )}
        >
          {isExhausted ? (
            <AlertTriangleIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isArabic ? "وصول مجاني للتجربة" : "Free Testing Access"}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                isExhausted
                  ? "bg-alert/15 text-alert"
                  : "bg-primary-muted text-primary",
              )}
            >
              {isArabic
                ? `متبقي ${remaining} من ${limit}`
                : `${remaining} of ${limit} remaining`}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {isExhausted
              ? isArabic
                ? `لقد استخدمت جميع الجلسات المتاحة لهذا الأسبوع. يتجدد الرصيد تلقائياً كل ${resetWindowDays} أيام.`
                : `You have used all ${limit} sessions for this period. Practice quota resets automatically every ${resetWindowDays} days.`
              : isArabic
                ? `لديك ${remaining} من أصل ${limit} جلسات محاكاة مجانية هذا الأسبوع. تتجدد الجلسات تلقائياً كل ${resetWindowDays} أيام.`
                : `You have ${remaining} of ${limit} free simulation sessions available. Sessions reset automatically on a rolling ${resetWindowDays}-day window.`}
          </p>
        </div>
      </div>
    </section>
  );
}
