import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createErrorHandler, notFoundHandler } from "./error-handler.js";

describe("central error middleware", () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  it("returns stable not-found errors", async () => {
    const app = express();
    app.use((_request, response, next) => {
      response.locals.requestId = "request-404";
      next();
    });
    app.use(notFoundHandler);
    const response = await request(app).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Resource not found.",
      requestId: "request-404",
    });
  });

  it("captures unexpected errors without exposing their message", async () => {
    const captureException = vi.fn();
    const app = express();
    app.use((_request, response, next) => {
      response.locals.requestId = "request-500";
      next();
    });
    app.get("/boom", () => {
      throw new Error("private transcript content");
    });
    app.use(createErrorHandler({ logger, captureException }));
    const response = await request(app).get("/boom");
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("private transcript");
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      requestId: "request-500",
      route: "/boom",
    });
  });
});
