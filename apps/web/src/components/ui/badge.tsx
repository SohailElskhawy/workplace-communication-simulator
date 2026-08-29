import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeTone = "default" | "success" | "alert" | "analysis";
const toneClasses: Record<BadgeTone, string> = {
  default: "bg-surface-subtle text-foreground", success: "bg-success text-success-foreground",
  alert: "bg-alert text-alert-foreground", analysis: "bg-analysis text-analysis-foreground",
};

export function Badge({ className, tone = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-full border border-border px-2.5 py-1 font-meta text-[11px] font-medium leading-none", toneClasses[tone], className)} {...props} />;
}
