import { describe, expect, it } from "vitest";

import { parseApiEnv } from "./env.js";

describe("parseApiEnv", () => {
  const requiredEnvironment = {
    DATABASE_URL: "postgresql://user:password@pooler.example.com/kalemny",
    DIRECT_URL: "postgresql://user:password@db.example.com/kalemny",
    CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    OPENROUTER_API_KEY: "sk-or-v1-example",
    ROLEPLAY_MODEL: "provider/roleplay-model",
    ROLEPLAY_PROMPT_VERSION: "roleplay-v2",
    EVALUATION_MODEL: "provider/evaluation-model",
    EVALUATION_PROMPT_VERSION: "evaluation-v2",
    TRANSCRIPTION_MODEL: "provider/transcription-model",
    TTS_MODEL: "hexgrad/kokoro-82m",
  };

  it("applies safe local defaults when required settings exist", () => {
    expect(parseApiEnv(requiredEnvironment)).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
      ROLEPLAY_TIMEOUT_MS: 25_000,
      EVALUATION_TIMEOUT_MS: 60_000,
      TRANSCRIPTION_TIMEOUT_MS: 25_000,
      TTS_TIMEOUT_MS: 15_000,
      GENERAL_RATE_LIMIT_WINDOW_MS: 60_000,
      GENERAL_RATE_LIMIT_MAX: 120,
      AI_RATE_LIMIT_WINDOW_MS: 60_000,
      AI_RATE_LIMIT_MAX: 30,
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

  it("rejects missing OpenRouter and model settings", () => {
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, OPENROUTER_API_KEY: undefined }),
    ).toThrow();

    expect(() =>
      parseApiEnv({ ...requiredEnvironment, ROLEPLAY_MODEL: undefined }),
    ).toThrow();
  });

  it("rejects non-positive AI timeout settings", () => {
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, ROLEPLAY_TIMEOUT_MS: "0" }),
    ).toThrow();
  });

  it("rejects excessive timeout and invalid limiter settings", () => {
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, EVALUATION_TIMEOUT_MS: "120001" }),
    ).toThrow();
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, AI_RATE_LIMIT_MAX: "0" }),
    ).toThrow();
  });

  it("accepts optional Sentry settings and empty values disable monitoring", () => {
    expect(
      parseApiEnv({ ...requiredEnvironment, SENTRY_DSN: "" }).SENTRY_DSN,
    ).toBeUndefined();
    expect(
      parseApiEnv({
        ...requiredEnvironment,
        SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      }).SENTRY_DSN,
    ).toBe("https://public@example.ingest.sentry.io/1");
  });

  it("rejects OpenRouter automatic model routing", () => {
    expect(() =>
      parseApiEnv({
        ...requiredEnvironment,
        ROLEPLAY_MODEL: "openrouter/auto",
      }),
    ).toThrow("OpenRouter automatic model routing is not allowed");
  });

  it("rejects an unsupported roleplay prompt version", () => {
    expect(() =>
      parseApiEnv({
        ...requiredEnvironment,
        ROLEPLAY_PROMPT_VERSION: "roleplay-v1",
      }),
    ).toThrow();
  });

  it("requires an explicit TTS model", () => {
    expect(() =>
      parseApiEnv({ ...requiredEnvironment, TTS_MODEL: "" }),
    ).toThrow();
  });
});
