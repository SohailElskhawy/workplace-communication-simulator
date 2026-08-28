import { describe, expect, it } from "vitest";

import { parseWebEnv } from "./env";

describe("parseWebEnv", () => {
  it("accepts the public API and Clerk settings", () => {
    expect(
      parseWebEnv({
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      }),
    ).toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    });
  });

  it("rejects a non-URL API value", () => {
    expect(() =>
      parseWebEnv({
        NEXT_PUBLIC_API_URL: "not-a-url",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      }),
    ).toThrow();
  });

  it("rejects a missing Clerk publishable key", () => {
    expect(() =>
      parseWebEnv({ NEXT_PUBLIC_API_URL: "http://localhost:4000" }),
    ).toThrow();
  });
});
