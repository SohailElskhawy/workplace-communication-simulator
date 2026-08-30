import type { ApiErrorResponse } from "@kalemny/contracts";
import type { RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

export interface RateLimitOptions {
  limit: number;
  resolveUserId?(request: Parameters<RequestHandler>[0]): string | null;
  windowMs: number;
}

function createLimiter(options: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (request) =>
      options.resolveUserId?.(request) ??
      ipKeyGenerator(request.ip ?? "unknown", 56),
    handler: (_request, response) => {
      const body: ApiErrorResponse = {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait and try again.",
          requestId: response.locals.requestId as string,
        },
      };
      response.status(429).json(body);
    },
  });
}

export const createGeneralRateLimiter = createLimiter;
export const createAiRateLimiter = createLimiter;

export const isExpensiveAiRequest: RequestHandler = (
  request,
  response,
  next,
) => {
  void response;
  void next;
  const path = request.path;
  const expensive =
    request.method === "POST" &&
    (/\/turns(?:\/[^/]+\/retry)?$/.test(path) ||
      /\/evaluation$/.test(path) ||
      /\/transcriptions$/.test(path) ||
      /\/speech$/.test(path) ||
      /\/realtime-session$/.test(path));
  response.locals.isExpensiveAiRequest = expensive;
  next();
};
