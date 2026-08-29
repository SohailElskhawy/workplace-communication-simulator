import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import type { TtsService } from "./tts-service.js";

const attemptId = "11111111-1111-4111-8111-111111111111";
const turnId = "22222222-2222-4222-8222-222222222222";

function createTestApp(ttsService: TtsService, authenticated = true) {
  return createApp({
    attemptService: {
      create: vi.fn(),
      getOwned: vi.fn(),
      getComparison: vi.fn(),
      createTurn: vi.fn(),
      retryTurn: vi.fn(),
      finish: vi.fn(),
      delete: vi.fn(),
    },
    authenticationMiddleware: (_request, _response, next) => next(),
    evaluationService: { evaluate: vi.fn() },
    historyService: { getHistory: vi.fn() },
    progressService: { getProgress: vi.fn() },
    resolveAuthProviderUserId: () => (authenticated ? "clerk-user" : null),
    scenarioService: { listActive: vi.fn(), getActiveByKey: vi.fn() },
    userProvisioner: {
      ensureUser: vi.fn().mockResolvedValue({ id: "local-user" }),
    },
    voiceService: { transcribe: vi.fn() },
    ttsService,
    webOrigin: "http://localhost:3000",
  });
}

describe("POST /api/v1/attempts/:attemptId/turns/:turnId/speech", () => {
  it("returns non-cacheable audio bytes from the owned stored turn", async () => {
    const generate = vi.fn().mockResolvedValue({
      audio: Buffer.from([1, 2, 3]),
      contentType: "audio/mpeg",
    });
    const response = await request(createTestApp({ generate })).post(
      `/api/v1/attempts/${attemptId}/turns/${turnId}/speech`,
    );
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("audio/mpeg");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(generate).toHaveBeenCalledWith("local-user", attemptId, turnId);
  });

  it("rejects unauthenticated speech requests", async () => {
    const generate = vi.fn();
    const response = await request(createTestApp({ generate }, false)).post(
      `/api/v1/attempts/${attemptId}/turns/${turnId}/speech`,
    );
    expect(response.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });
});
