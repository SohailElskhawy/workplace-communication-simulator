import { describe, expect, it } from "vitest";

import { initializeApiMonitoring, scrubApiEvent } from "./sentry.js";

describe("initializeApiMonitoring", () => {
  it("is a safe no-op without a DSN", () => {
    const capture = initializeApiMonitoring({
      dsn: undefined,
      environment: "test",
      release: undefined,
    });
    expect(() =>
      capture(new Error("private"), { requestId: "request-1", route: "/test" }),
    ).not.toThrow();
  });

  it("removes request and exception content from monitoring events", () => {
    const result = scrubApiEvent({
      type: undefined,
      request: {
        data: "private transcript",
        headers: { authorization: "secret" },
      },
      extra: { prompt: "private prompt" },
      exception: {
        values: [
          { type: "Error", value: "private error", stacktrace: { frames: [] } },
        ],
      },
    });
    expect(result.request).toBeUndefined();
    expect(result.extra).toBeUndefined();
    expect(result.exception).toEqual({ values: [{ type: "Error" }] });
  });
});
