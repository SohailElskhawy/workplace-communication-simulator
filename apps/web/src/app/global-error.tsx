"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4">
        <main className="mx-auto max-w-xl text-center" role="alert">
          <div className="glass-surface rounded-card p-8 border border-border shadow-brutal bg-surface-solid">
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2.5 font-sans text-sm text-muted-foreground leading-relaxed">
              We could not load Kalemny. Your saved practice data has not been
              changed.
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
      </body>
    </html>
  );
}
