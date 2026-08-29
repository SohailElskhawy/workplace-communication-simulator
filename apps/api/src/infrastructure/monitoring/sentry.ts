import * as Sentry from "@sentry/node";
import type { ErrorEvent } from "@sentry/node";

export interface MonitoringConfig {
  dsn: string | undefined;
  environment: string | undefined;
  release: string | undefined;
}

export type CaptureException = (
  error: unknown,
  context: { requestId: string; route: string },
) => void;

export function scrubApiEvent(event: ErrorEvent): ErrorEvent {
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

export function initializeApiMonitoring(
  config: MonitoringConfig,
): CaptureException {
  if (!config.dsn) return () => undefined;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    beforeSend: scrubApiEvent,
  });
  return (error: unknown, context: { requestId: string; route: string }) => {
    Sentry.withScope((scope) => {
      scope.setTag("requestId", context.requestId);
      scope.setTag("route", context.route);
      Sentry.captureException(error);
    });
  };
}
