import { describe, expect, it } from "vitest";

import { parseApiEnv } from "./env.js";

describe("parseApiEnv", () => {
  it("provides safe local defaults", () => {
    expect(parseApiEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects a port outside the TCP range", () => {
    expect(() => parseApiEnv({ PORT: "70000" })).toThrow();
  });
});
