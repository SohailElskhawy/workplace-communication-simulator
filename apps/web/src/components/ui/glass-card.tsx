import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("glass-surface rounded-card p-5 sm:p-8", className)} {...props} />;
}
