import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import { createLogger } from "./logger.js";

describe("createLogger", () => {
  it("emits allowlisted structured metadata without sensitive content", () => {
    let output = "";
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    createLogger(destination).info({
      event: "http_request_completed",
      requestId: "request-1",
      route: "/api/v1/attempts",
      status: 200,
    });
    expect(JSON.parse(output)).toMatchObject({
      event: "http_request_completed",
      requestId: "request-1",
      status: 200,
    });
    expect(output).not.toContain("authorization");
    expect(output).not.toContain("transcript");
  });
});
