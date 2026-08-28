import { describe, expect, it } from "vitest";

import { parseApiEnv } from "./env.js";

describe("parseApiEnv", () => {
  const requiredEnvironment = {
    DATABASE_URL: "postgresql://user:password@pooler.example.com/kalemny",
    DIRECT_URL: "postgresql://user:password@db.example.com/kalemny",
    CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
  };

  it("applies safe local defaults when required settings exist", () => {
    expect(parseApiEnv(requiredEnvironment)).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
      ...requiredEnvironment,
    });
  });

  it("rejects a port outside the TCP range", () => {
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, PORT: "70000" }),
    ).toThrow();
  });

  it("rejects missing database and Clerk settings", () => {
    expect(() => parseApiEnv({})).toThrow();
  });
});
