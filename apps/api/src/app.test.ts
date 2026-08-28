import { HealthResponseSchema } from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("GET /api/v1/health", () => {
  it("returns the shared health response", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(HealthResponseSchema.parse(response.body)).toEqual({
      data: { status: "ok" },
    });
  });
});
