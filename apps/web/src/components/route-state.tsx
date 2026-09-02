import Link from "next/link";
import type { ReactNode } from "react";

function Frame({
  children,
  live = false,
}: {
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 w-full h-full">
      <div
        aria-live={live ? "polite" : undefined}
        className="mx-auto w-full max-w-2xl rounded-card border border-border bg-surface-solid p-6 sm:p-8 text-center shadow-xs"
      >
        {children}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Frame live>
      <div
        role="status"
        aria-busy="true"
        className="flex flex-col items-center justify-center"
      >
        <span
          className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-r-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="mt-3 font-sans text-sm text-muted-foreground">{label}</p>
      </div>
    </Frame>
  );
}

export function EmptyState({
  title,
  description,
  href = "/app",
  action = "Browse scenarios",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <Frame>
      <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 font-sans text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive"
      >
        {action}
      </Link>
    </Frame>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Frame live>
      <div role="alert" className="flex flex-col items-center">
        <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 font-sans text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer"
          >
            Try again
          </button>
        ) : (
          <Link
            href="/app"
            className="mt-5 inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive"
          >
            Return to scenarios
          </Link>
        )}
      </div>
    </Frame>
  );
}
