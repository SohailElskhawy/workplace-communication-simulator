"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      className="mx-auto max-w-xl p-6 sm:p-10 text-center font-sans"
      role="alert"
    >
      <div className="glass-surface rounded-card p-8 border border-border shadow-brutal">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
          This page could not be loaded
        </h1>
        <p className="mt-2.5 font-sans text-sm text-muted-foreground leading-relaxed">
          Please try again. No practice response was deleted.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center rounded-control bg-primary px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
