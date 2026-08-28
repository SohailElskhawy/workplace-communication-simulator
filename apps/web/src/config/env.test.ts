import { describe, expect, it } from "vitest";

import { parseWebEnv } from "./env";

describe("parseWebEnv", () => {
  it("provides the local API URL by default", () => {
    expect(parseWebEnv({})).toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    });
  });

  it("rejects a non-URL API value", () => {
    expect(() => parseWebEnv({ NEXT_PUBLIC_API_URL: "not-a-url" })).toThrow();
  });
});
