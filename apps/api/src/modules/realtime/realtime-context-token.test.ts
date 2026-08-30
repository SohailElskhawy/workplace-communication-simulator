import { describe, expect, it } from "vitest";

import {
  REALTIME_CONTEXT_TOKEN_TTL_MS,
  secretsMatch,
  signContextToken,
  verifyContextToken,
} from "./realtime-context-token.js";

const SECRET = "tool-secret-example";
const ATTEMPT_ID = "0f0a6b70-6fbd-4c02-9e57-2f4b6f0f1f01";
const USER_ID = "8f3c1d2e-5a4b-4c3d-8e2f-1a2b3c4d5e6f";

describe("signContextToken / verifyContextToken", () => {
  const currentTime = new Date("2026-08-30T10:00:00.000Z");

  it("round-trips a signed token bound to the attempt and user", () => {
    const { token, expiresAt } = signContextToken({
      secret: SECRET,
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
      currentTime,
    });

    expect(expiresAt.getTime()).toBe(
      currentTime.getTime() + REALTIME_CONTEXT_TOKEN_TTL_MS,
    );
    expect(verifyContextToken({ secret: SECRET, token, currentTime })).toEqual({
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
    });
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = signContextToken({
      secret: SECRET,
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
      currentTime,
    });

    expect(
      verifyContextToken({
        secret: "other-secret",
        token,
        currentTime,
      }),
    ).toBeNull();
  });

  it("rejects an expired token", () => {
    const { token } = signContextToken({
      secret: SECRET,
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
      currentTime,
    });

    const afterExpiry = new Date(
      currentTime.getTime() + REALTIME_CONTEXT_TOKEN_TTL_MS + 1,
    );
    expect(
      verifyContextToken({ secret: SECRET, token, currentTime: afterExpiry }),
    ).toBeNull();
  });

  it("rejects tampered payloads", () => {
    const { token } = signContextToken({
      secret: SECRET,
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
      currentTime,
    });

    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        attemptId: "11111111-1111-4111-8111-111111111111",
        userId: USER_ID,
        exp: Math.floor(currentTime.getTime() / 1000) + 60,
      }),
    ).toString("base64url");

    expect(
      verifyContextToken({
        secret: SECRET,
        token: `${tamperedPayload}.${signature}`,
        currentTime,
      }),
    ).toBeNull();
    expect(
      verifyContextToken({
        secret: SECRET,
        token: `${payload}.deadbeef`,
        currentTime,
      }),
    ).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    const malformed = ["", ".", "abc", "abc.def.ghi", "!!!.???", "a.b"];
    for (const token of malformed) {
      expect(
        verifyContextToken({ secret: SECRET, token, currentTime }),
      ).toBeNull();
    }
  });

  it("supports a custom short ttl", () => {
    const { token, expiresAt } = signContextToken({
      secret: SECRET,
      attemptId: ATTEMPT_ID,
      userId: USER_ID,
      currentTime,
      ttlMs: 1_000,
    });

    expect(expiresAt.getTime()).toBe(currentTime.getTime() + 1_000);
    expect(
      verifyContextToken({ secret: SECRET, token, currentTime }),
    ).not.toBeNull();
  });
});

describe("secretsMatch", () => {
  it("matches equal secrets and rejects different ones", () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true);
    expect(secretsMatch(SECRET, "tool-secret-example ")).toBe(false);
    expect(secretsMatch("short", "a-very-much-longer-secret")).toBe(false);
  });

  it("rejects empty secrets", () => {
    expect(secretsMatch("", SECRET)).toBe(false);
    expect(secretsMatch(SECRET, "")).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
  });
});
