import { describe, expect, it } from "vitest";

import { scrubSentryEvent } from "./sentry-scrub";

describe("scrubSentryEvent", () => {
  it("retains operational tags while removing sensitive event content", () => {
    const result = scrubSentryEvent({
      type: undefined,
      event_id: "event-1",
      tags: { route: "/app/results" },
      request: {
        headers: { authorization: "Bearer secret" },
        data: "learner transcript",
      },
      breadcrumbs: [{ message: "prompt content" }],
      extra: { transcript: "private" },
      exception: {
        values: [
          {
            type: "Error",
            value: "upstream secret",
            stacktrace: { frames: [] },
          },
        ],
      },
    });
    expect(result.tags).toEqual({ route: "/app/results" });
    expect(result.request).toBeUndefined();
    expect(result.breadcrumbs).toBeUndefined();
    expect(result.extra).toBeUndefined();
    expect(result.exception).toEqual({ values: [{ type: "Error" }] });
  });
});
