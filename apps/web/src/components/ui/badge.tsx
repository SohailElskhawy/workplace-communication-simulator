import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "default" | "coral" | "success" | "alert" | "analysis";

const toneClasses: Record<BadgeTone, string> = {
  default: "border-border bg-surface-subtle text-muted-foreground",
  coral: "border-border-active/40 bg-selected-surface text-primary font-semibold",
  success: "border-success/25 bg-success-surface text-success-foreground font-semibold",
  alert: "border-alert/25 bg-alert-surface text-alert-foreground font-semibold",
  analysis: "border-analysis/25 bg-analysis-surface text-analysis-foreground font-semibold",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-pill border px-2.5 py-1 text-xs leading-none select-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
