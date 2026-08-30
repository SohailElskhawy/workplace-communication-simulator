import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

import type { AppLogger } from "../infrastructure/logging/logger.js";

export function requestContext(appLogger: AppLogger): RequestHandler {
  return (request, response, next) => {
    const supplied = request.header("x-request-id");
    const requestId =
      supplied && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied)
        ? supplied
        : randomUUID();
    const startedAt = performance.now();
    response.locals.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    response.once("finish", () => {
      appLogger.info({
        event: "http_request_completed",
        requestId,
        method: request.method,
        route: request.route?.path ?? request.path,
        status: response.statusCode,
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    });
    next();
  };
}
