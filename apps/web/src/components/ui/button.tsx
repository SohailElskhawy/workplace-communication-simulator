import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "coral"
  | "destructive";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:translate-y-px transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  secondary:
    "border border-border bg-surface-solid text-foreground shadow-sm hover:border-border-active hover:bg-surface-subtle transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  ghost:
    "border border-transparent bg-transparent text-foreground hover:bg-surface-subtle hover:text-foreground transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  coral:
    "border border-transparent bg-brand-coral text-foreground font-semibold shadow-sm hover:opacity-90 active:translate-y-px transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-coral",
  destructive:
    "border border-transparent bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 active:translate-y-px transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2.5 text-sm font-semibold",
  sm: "min-h-9 px-3 py-1.5 text-xs font-semibold",
  lg: "min-h-12 px-6 py-3 text-base font-semibold",
  icon: "min-h-11 min-w-11 p-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control leading-none transition-colors select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
