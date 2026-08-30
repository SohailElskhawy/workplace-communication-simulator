import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
}

export function GlassCard({
  as: Component = "div",
  className,
  ...props
}: GlassCardProps) {
  return (
    <Component
      className={cn("glass-surface rounded-card p-5 sm:p-8", className)}
      {...props}
    />
  );
}
