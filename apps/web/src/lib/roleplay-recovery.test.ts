import { describe, expect, it } from "vitest";

import { ApiClientError } from "./api-client";
import { isPersistedRoleplayFailure } from "./roleplay-recovery";

describe("isPersistedRoleplayFailure", () => {
  it.each(["AI_TIMEOUT", "AI_PROVIDER_ERROR"])(
    "recognizes %s as a persisted roleplay failure",
    (code) => {
      expect(
        isPersistedRoleplayFailure(
          new ApiClientError("Roleplay failed", code, 502),
        ),
      ).toBe(true);
    },
  );

  it("does not recover ordinary client and transport errors as stored turns", () => {
    expect(
      isPersistedRoleplayFailure(
        new ApiClientError("Rate limited", "RATE_LIMIT_EXCEEDED", 429),
      ),
    ).toBe(false);
    expect(isPersistedRoleplayFailure(new Error("Network failure"))).toBe(
      false,
    );
  });
});
