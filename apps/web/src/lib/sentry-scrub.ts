import type { ErrorEvent } from "@sentry/nextjs";

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const safe = { ...event };
  delete safe.request;
  delete safe.breadcrumbs;
  delete safe.extra;
  delete safe.contexts;
  if (safe.exception?.values) {
    safe.exception = {
      values: safe.exception.values.map((value) => {
        const clean = { ...value };
        delete clean.value;
        delete clean.stacktrace;
        return clean;
      }),
    };
  }
  return safe;
}
