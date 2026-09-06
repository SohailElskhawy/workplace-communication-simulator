import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  selected?: boolean;
}

export function Card({
  as: Component = "div",
  className,
  selected = false,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-card border bg-surface-solid p-5 shadow-card transition-all duration-150 sm:p-6",
        selected
          ? "border-border-active bg-selected-surface shadow-raised"
          : "border-border hover:border-border-active/60 hover:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-3 sm:pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-sans text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs leading-relaxed text-muted-foreground sm:text-sm", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center pt-4 border-t border-border-subtle", className)}
      {...props}
    />
  );
}
