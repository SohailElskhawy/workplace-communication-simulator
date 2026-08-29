import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createAiRateLimiter } from "./rate-limits.js";

describe("rate limits", () => {
  it("returns a stable safe error above the configured limit", async () => {
    const app = express();
    app.use((_request, response, next) => {
      response.locals.requestId = "request-rate";
      next();
    });
    app.use(
      createAiRateLimiter({
        windowMs: 60_000,
        limit: 1,
        resolveUserId: () => "user-1",
      }),
    );
    app.post("/ai", (_request, response) => response.sendStatus(204));
    expect((await request(app).post("/ai")).status).toBe(204);
    const limited = await request(app).post("/ai");
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatchObject({
      code: "RATE_LIMITED",
      requestId: "request-rate",
    });
    expect(limited.headers["ratelimit"]).toBeDefined();
  });
});
