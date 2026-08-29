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
    <main className="mx-auto max-w-xl p-6 text-center" role="alert">
      <h1 className="text-2xl font-bold">This page could not be loaded</h1>
      <p className="mt-2 text-slate-600">
        Please try again. No practice response was deleted.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}
