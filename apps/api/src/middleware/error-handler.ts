import type { ApiErrorResponse } from "@kalemny/contracts";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { randomUUID } from "node:crypto";

import type { AppLogger } from "../infrastructure/logging/logger.js";

export interface ErrorHandlerOptions {
  captureException?: (
    error: unknown,
    context: { requestId: string; route: string },
  ) => void;
  logger: AppLogger;
}

function requestId(response: Parameters<ErrorRequestHandler>[2]): string {
  return (response.locals.requestId as string | undefined) ?? randomUUID();
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  const body: ApiErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: "Resource not found.",
      requestId: requestId(response),
    },
  };
  response.status(404).json(body);
};

export function createErrorHandler(
  options: ErrorHandlerOptions,
): ErrorRequestHandler {
  return (error, request, response, _next) => {
    void _next;
    const id = requestId(response);
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 500;
    if (status === 400 || status === 413) {
      const body: ApiErrorResponse = {
        error: {
          code: "VALIDATION_FAILED",
          message:
            status === 413
              ? "Request body is too large."
              : "Request body is invalid.",
          requestId: id,
        },
      };
      response.status(status).json(body);
      return;
    }
    options.logger.error({
      event: "unhandled_api_error",
      requestId: id,
      route: request.path,
      status: 500,
      errorCode: "INTERNAL_ERROR",
    });
    options.captureException?.(error, { requestId: id, route: request.path });
    const body: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId: id,
      },
    };
    response.status(500).json(body);
  };
}
