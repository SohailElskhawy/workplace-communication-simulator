import { describe, expect, it, vi } from "vitest";

import { salaryNegotiationV2 } from "../scenarios/definitions/salary-negotiation-v2.js";
import type { AttemptRecord } from "../attempts/attempt-service.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import type { ElevenLabsProvider } from "./elevenlabs-provider.js";
import { RealtimeProviderError } from "./elevenlabs-provider.js";
import {
  createRealtimeVoiceService,
  ELEVENLABS_TOKEN_TIMEOUT_MS,
} from "./realtime-service.js";
import { signContextToken } from "./realtime-context-token.js";

const now = new Date("2026-08-30T10:00:00.000Z");
const ownerId = "11111111-1111-4111-8111-111111111111";
const attemptId = "30000000-0000-4000-8000-000000000001";
const SECRET = "tool-secret-example";
const AGENT_ID = "agent_example";

function createAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: attemptId,
    userId: ownerId,
    difficulty: "MEDIUM",
    status: "ACTIVE",
    retryOfAttemptId: null,
    variationId: "budget-cap",
    startedAt: now,
    endedAt: null,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    evaluationStartedAt: null,
    scenario: {
      id: "20000000-0000-4000-8000-000000000001",
      key: salaryNegotiationV2.key,
      version: salaryNegotiationV2.version,
      title: salaryNegotiationV2.title,
      definition: structuredClone(salaryNegotiationV2),
    },
    turns: [],
    evaluation: null,
    comparison: null,
    ...overrides,
  };
}

function createRepository(attempt: AttemptRecord | null) {
  return {
    findOwnedAttempt: vi.fn(async () => attempt),
    bindRealtimeConversation: vi
      .fn<
        (
          attemptId: string,
          userId: string,
          conversationId: string,
        ) => Promise<"bound" | "not_found">
      >()
      .mockResolvedValue("bound"),
  };
}

function createProvider(
  overrides: Partial<ElevenLabsProvider> = {},
): ElevenLabsProvider {
  return {
    issueConversationToken: vi.fn(async () => ({
      token: "elevenlabs-conversationToken",
      latencyMs: 42,
    })),
    ...overrides,
  };
}

function createService(
  repository: ReturnType<typeof createRepository>,
  provider: ElevenLabsProvider = createProvider(),
) {
  return createRealtimeVoiceService({
    repository,
    elevenLabsProvider: provider,
    contextTokenSecret: SECRET,
    agentId: AGENT_ID,
    clock: () => now,
  });
}

describe("createRealtimeVoiceService.createSession", () => {
  it("returns only public scenario data plus short-lived tokens", async () => {
    const repository = createRepository(createAttempt());
    const provider = createProvider();
    const service = createService(repository, provider);

    const session = await service.createSession(ownerId, attemptId);

    expect(session).toEqual({
      attemptId,
      agentId: AGENT_ID,
      conversationToken: "elevenlabs-conversationToken",
      contextToken: expect.any(String),
      contextTokenExpiresAt: new Date(
        now.getTime() + 10 * 60 * 1000,
      ).toISOString(),
      scenario: {
        key: salaryNegotiationV2.key,
        version: salaryNegotiationV2.version,
        title: salaryNegotiationV2.title,
      },
      difficulty: "MEDIUM",
      openingMessage: expect.any(String),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    });

    // The resolved opening message comes from the stored variation.
    const budgetCap = salaryNegotiationV2.variations?.find(
      (variation) => variation.id === "budget-cap",
    );
    expect(session.openingMessage).toBe(budgetCap?.openingMessage);

    // No hidden configuration may leak into the session payload.
    const serialized = JSON.stringify(session);
    expect(serialized).not.toContain(salaryNegotiationV2.aiObjective);
    expect(serialized).not.toContain(salaryNegotiationV2.persona.role);
    for (const motivation of salaryNegotiationV2.motivations) {
      expect(serialized).not.toContain(motivation);
    }
    for (const constraint of salaryNegotiationV2.constraints) {
      expect(serialized).not.toContain(constraint);
    }

    expect(provider.issueConversationToken).toHaveBeenCalledWith({
      timeoutMs: ELEVENLABS_TOKEN_TIMEOUT_MS,
    });
  });

  it("returns 404 for a non-owned or missing attempt", async () => {
    const service = createService(createRepository(null));

    await expect(
      service.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("rejects non-ACTIVE attempts", async () => {
    const service = createService(
      createRepository(createAttempt({ status: "EVALUATING" })),
    );

    await expect(
      service.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "INVALID_ATTEMPT_STATE", status: 409 });
  });

  it("rejects expired attempts", async () => {
    const service = createService(
      createRepository(
        createAttempt({
          expiresAt: new Date(now.getTime() - 1),
        }),
      ),
    );

    await expect(
      service.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "SESSION_LIMIT_REACHED", status: 409 });
  });

  it("maps provider timeout and provider errors to attempt errors", async () => {
    const timeoutService = createService(
      createRepository(createAttempt()),
      createProvider({
        issueConversationToken: async () => {
          throw new RealtimeProviderError("AI_TIMEOUT", 10_000);
        },
      }),
    );
    await expect(
      timeoutService.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });

    const providerService = createService(
      createRepository(createAttempt()),
      createProvider({
        issueConversationToken: async () => {
          throw new RealtimeProviderError("AI_PROVIDER_ERROR", 5);
        },
      }),
    );
    await expect(
      providerService.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  });

  it("maps unexpected provider failures to AI_PROVIDER_ERROR", async () => {
    const service = createService(
      createRepository(createAttempt()),
      createProvider({
        issueConversationToken: async () => {
          throw new Error("network down");
        },
      }),
    );

    await expect(
      service.createSession(ownerId, attemptId),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  });

  it("falls back to the base opening message when no variation is stored", async () => {
    const service = createService(
      createRepository(createAttempt({ variationId: null })),
    );

    const session = await service.createSession(ownerId, attemptId);
    expect(session.openingMessage).toBe(salaryNegotiationV2.openingMessage);
  });
});

describe("createRealtimeVoiceService.bindConversation", () => {
  it("delegates an owner-scoped binding and is idempotent at the repository", async () => {
    const repository = createRepository(createAttempt());
    const service = createService(repository);

    await service.bindConversation(ownerId, attemptId, "conv_example");

    expect(repository.bindRealtimeConversation).toHaveBeenCalledWith(
      attemptId,
      ownerId,
      "conv_example",
      now,
    );
  });

  it("does not reveal a missing, foreign, or conflicting mapping", async () => {
    const repository = createRepository(createAttempt());
    repository.bindRealtimeConversation.mockResolvedValueOnce("not_found");
    const service = createService(repository);

    await expect(
      service.bindConversation(ownerId, attemptId, "conv_foreign"),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
});

describe("createRealtimeVoiceService.resolveScenarioContext", () => {
  it("returns the hidden context for a valid token bound to the attempt", async () => {
    const repository = createRepository(createAttempt());
    const service = createService(repository);
    const { token } = signContextToken({
      secret: SECRET,
      attemptId,
      userId: ownerId,
      currentTime: now,
    });

    const context = await service.resolveScenarioContext(token);

    expect(context).not.toBeNull();
    expect(context).toMatchObject({
      attemptId,
      userId: ownerId,
      difficulty: "MEDIUM",
      scenario: {
        key: salaryNegotiationV2.key,
        version: salaryNegotiationV2.version,
      },
    });
    expect(context?.openingMessage).toBe(
      salaryNegotiationV2.variations?.find(
        (variation) => variation.id === "budget-cap",
      )?.openingMessage,
    );
    // The hidden system prompt carries the private objective and variation
    // counterpart brief — exactly the content the text roleplay prompt uses.
    expect(context?.systemPrompt).toContain(salaryNegotiationV2.aiObjective);
    expect(context?.systemPrompt).toContain("roleplay-v2");
    expect(repository.findOwnedAttempt).toHaveBeenCalledWith(
      attemptId,
      ownerId,
    );
  });

  it("returns null for invalid, foreign, or expired tokens", async () => {
    const service = createService(createRepository(createAttempt()));

    expect(await service.resolveScenarioContext("not-a-token")).toBeNull();

    const foreign = signContextToken({
      secret: "other-secret",
      attemptId,
      userId: ownerId,
      currentTime: now,
    });
    expect(await service.resolveScenarioContext(foreign.token)).toBeNull();

    const expired = signContextToken({
      secret: SECRET,
      attemptId,
      userId: ownerId,
      currentTime: new Date(now.getTime() - 11 * 60 * 1000),
    });
    expect(await service.resolveScenarioContext(expired.token)).toBeNull();
  });

  it("returns null when the attempt no longer exists", async () => {
    const service = createService(createRepository(null));
    const { token } = signContextToken({
      secret: SECRET,
      attemptId,
      userId: ownerId,
      currentTime: now,
    });

    expect(await service.resolveScenarioContext(token)).toBeNull();
  });

  it("resolves the attempt server-side and never selects a new variation", async () => {
    const repository = createRepository(
      createAttempt({ variationId: "performance-evidence" }),
    );
    const service = createService(repository);
    const { token } = signContextToken({
      secret: SECRET,
      attemptId,
      userId: ownerId,
      currentTime: now,
    });

    const context = await service.resolveScenarioContext(token);

    const performanceEvidence = salaryNegotiationV2.variations?.find(
      (variation) => variation.id === "performance-evidence",
    );
    expect(context?.openingMessage).toBe(performanceEvidence?.openingMessage);
  });
});

describe("AttemptError contract", () => {
  it("keeps realtime failures on existing stable error codes", () => {
    expect(new AttemptError("NOT_FOUND").status).toBe(404);
    expect(new AttemptError("INVALID_ATTEMPT_STATE").status).toBe(409);
    expect(new AttemptError("SESSION_LIMIT_REACHED").status).toBe(409);
    expect(new AttemptError("AI_TIMEOUT").status).toBe(504);
    expect(new AttemptError("AI_PROVIDER_ERROR").status).toBe(502);
  });
});
