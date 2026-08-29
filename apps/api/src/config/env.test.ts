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
    EVALUATION_MODEL: "provider/evaluation-model",
    TRANSCRIPTION_MODEL: "provider/transcription-model",
  };

  it("applies safe local defaults when required settings exist", () => {
    expect(parseApiEnv(requiredEnvironment)).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
      ROLEPLAY_TIMEOUT_MS: 15_000,
      EVALUATION_TIMEOUT_MS: 30_000,
      TRANSCRIPTION_TIMEOUT_MS: 20_000,
      TTS_TIMEOUT_MS: 15_000,
      TTS_MODEL: "",
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

  it("rejects OpenRouter automatic model routing", () => {
    expect(() =>
      parseApiEnv({
        ...requiredEnvironment,
        ROLEPLAY_MODEL: "openrouter/auto",
      }),
    ).toThrow("OpenRouter automatic model routing is not allowed");
  });

  it("keeps TTS unconfigured until its milestone", () => {
    expect(
      parseApiEnv({ ...requiredEnvironment, TTS_MODEL: "" }).TTS_MODEL,
    ).toBe("");
  });
});
