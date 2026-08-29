"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorState } from "../../components/route-state";

export default function AppError({
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
    <div className="px-4 sm:px-6">
      <ErrorState
        description="Your saved practice data is safe. Please retry this page."
        onRetry={reset}
      />
    </div>
  );
}
