import pino, { type DestinationStream } from "pino";

export interface SafeLogContext {
  attemptId?: string;
  errorCode?: string;
  event: string;
  latencyMs?: number;
  method?: string;
  operation?: string;
  requestId?: string;
  route?: string;
  status?: number;
  userId?: string;
}

export interface AppLogger {
  error(context: SafeLogContext): void;
  info(context: SafeLogContext): void;
  warn(context: SafeLogContext): void;
}

export function createLogger(destination?: DestinationStream): AppLogger {
  const base = pino(
    {
      base: null,
      redact: {
        paths: [
          "authorization",
          "cookie",
          "body",
          "query",
          "prompt",
          "transcript",
          "audio",
          "apiKey",
        ],
        remove: true,
      },
    },
    destination,
  );
  return {
    error: (context) => base.error(context),
    info: (context) => base.info(context),
    warn: (context) => base.warn(context),
  };
}

export const logger = createLogger();
