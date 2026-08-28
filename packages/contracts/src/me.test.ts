import { describe, expect, it } from "vitest";

import { MeResponseSchema } from "./me.js";

describe("MeResponseSchema", () => {
  it("accepts the frontend-safe local user response", () => {
    expect(
      MeResponseSchema.parse({
        data: { id: "ef4d8dd1-d525-45d7-91f6-3a180db74eac" },
      }),
    ).toEqual({
      data: { id: "ef4d8dd1-d525-45d7-91f6-3a180db74eac" },
    });
  });

  it("rejects a provider identity in place of a local UUID", () => {
    expect(() =>
      MeResponseSchema.parse({ data: { id: "user_clerk_123" } }),
    ).toThrow();
  });
});
