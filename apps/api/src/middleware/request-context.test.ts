import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { requestContext } from "./request-context.js";

describe("requestContext", () => {
  it("sets a safe response request ID and logs completion metadata", async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const app = express();
    app.use(requestContext(logger));
    app.get("/health", (_request, response) => response.sendStatus(204));
    const response = await request(app)
      .get("/health")
      .set("X-Request-Id", "safe_request_123");
    expect(response.headers["x-request-id"]).toBe("safe_request_123");
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "http_request_completed",
        route: "/health",
        status: 204,
      }),
    );
  });
});
