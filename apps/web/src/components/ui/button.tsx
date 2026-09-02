import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground brutalist-interactive",
  secondary:
    "bg-surface-solid text-foreground brutalist-interactive hover:bg-surface-subtle",
  ghost:
    "border border-border bg-transparent text-foreground hover:bg-surface-subtle",
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
        "inline-flex min-h-11 items-center justify-center rounded-control px-4 py-2.5 font-display text-sm font-bold leading-none disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
