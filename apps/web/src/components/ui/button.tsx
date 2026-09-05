import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground brutalist-interactive",
  secondary:
    "border border-border bg-surface-solid text-foreground shadow-xs hover:border-foreground/35 hover:bg-surface-subtle",
  ghost:
    "border border-transparent bg-transparent text-foreground hover:border-border hover:bg-surface-subtle",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold leading-none transition-colors disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
