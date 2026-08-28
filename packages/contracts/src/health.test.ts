import { describe, expect, it } from "vitest";

import { HealthResponseSchema } from "./health.js";

describe("HealthResponseSchema", () => {
  it("accepts the API health success envelope", () => {
    expect(HealthResponseSchema.parse({ data: { status: "ok" } })).toEqual({
      data: { status: "ok" },
    });
  });

  it("rejects an unsupported health status", () => {
    expect(
      HealthResponseSchema.safeParse({ data: { status: "degraded" } }).success,
    ).toBe(false);
  });
});
