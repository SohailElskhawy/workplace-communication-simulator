import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeTone = "default" | "success" | "alert" | "analysis";
const toneClasses: Record<BadgeTone, string> = {
  default: "border-border-subtle bg-surface-subtle text-foreground",
  success: "border-success/20 bg-success/10 text-success",
  alert: "border-alert/20 bg-alert/10 text-alert",
  analysis: "border-analysis/20 bg-analysis/10 text-analysis",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
