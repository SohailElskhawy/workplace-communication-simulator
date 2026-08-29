import { describe, expect, it, vi } from "vitest";

import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
import { calculateAttemptComparison } from "./attempt-comparison.js";
import { getFinishStatus, getTurnRejection } from "./attempt-rules.js";
import {
  createAttemptService,
  type AttemptRecord,
  type AttemptRepository,
  type ConversationTurnRecord,
} from "./attempt-service.js";

const now = new Date("2026-08-29T10:00:00.000Z");
const ownerId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

function createSuccessfulAiService(
  overrides: Partial<AiService> = {},
): AiService {
  return {
    roleplayModel: "deepseek/deepseek-v4-flash-0731",
    evaluationModel: "openai/gpt-5.6-luna-pro",
    generateRoleplayReply: vi.fn().mockResolvedValue({
      text: "What evidence supports the adjustment you have in mind?",
      latencyMs: 125,
      inputTokens: 120,
      outputTokens: 18,
      estimatedCost: 0.00012,
    }),
    evaluateSimulation: vi.fn(),
    ...overrides,
  };
}

function createTurn(
  sequence: number,
  overrides: Partial<ConversationTurnRecord> = {},
): ConversationTurnRecord {
  return {
    id: `30000000-0000-4000-8000-${sequence.toString().padStart(12, "0")}`,
    sequence,
    clientRequestId: `request-${sequence}`,
    inputMethod: "TEXT",
    userText: `Learner message ${sequence}`,
    assistantText: null,
    status: "COMPLETED",
    createdAt: now,
    completedAt: now,
    ...overrides,
  };
}

function createMemoryRepository() {
  const attempts = new Map<string, AttemptRecord>();
  const usageEvents: Array<
    Parameters<AttemptRepository["finalizeRoleplayTurn"]>[0]
  > = [];
  let nextAttempt = 1;

  const repository: AttemptRepository = {
    async createAttempt(input) {
      if (input.scenarioKey !== salaryNegotiationV1.key) {
        return { kind: "not_found" };
      }

      if (input.retryOfAttemptId) {
        const source = attempts.get(input.retryOfAttemptId);
        if (
          !source ||
          source.userId !== input.userId ||
          source.scenario.key !== input.scenarioKey
        ) {
          return { kind: "not_found" };
        }
      }

      const id = `10000000-0000-4000-8000-${nextAttempt
        .toString()
        .padStart(12, "0")}`;
      nextAttempt += 1;
      const attempt: AttemptRecord = {
        id,
        userId: input.userId,
        difficulty: input.difficulty,
        status: "ACTIVE",
        retryOfAttemptId: input.retryOfAttemptId,
        startedAt: input.startedAt,
        endedAt: null,
        expiresAt: input.expiresAt,
        evaluationStartedAt: null,
        scenario: {
          id: "20000000-0000-4000-8000-000000000001",
          key: salaryNegotiationV1.key,
          version: salaryNegotiationV1.version,
          title: salaryNegotiationV1.title,
          definition: structuredClone(salaryNegotiationV1),
        },
        turns: [],
        evaluation: null,
        comparison: null,
      };
      attempts.set(id, attempt);
      return { kind: "created", attempt };
    },

    async findOwnedAttempt(attemptId, userId) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) return null;
      const source = attempt.retryOfAttemptId
        ? attempts.get(attempt.retryOfAttemptId)
        : null;
      const comparison = calculateAttemptComparison(attempt, source ?? null);
      return { ...attempt, comparison };
    },

    async createTurn(input) {
      const attempt = attempts.get(input.attemptId);
      if (!attempt || attempt.userId !== input.userId) {
        return { kind: "not_found" };
      }

      const existing = attempt.turns.find(
        (turn) => turn.clientRequestId === input.clientRequestId,
      );
      if (existing) {
        return { kind: "existing", turn: existing };
      }

      const rejection = getTurnRejection(
        {
          status: attempt.status,
          expiresAt: attempt.expiresAt,
          learnerTurnCount: attempt.turns.length,
          hasPendingTurn: attempt.turns.some(
            (turn) => turn.status === "PENDING",
          ),
        },
        input.currentTime,
      );
      if (rejection) {
        return { kind: "rejected", code: rejection };
      }

      const turn = createTurn(attempt.turns.length + 1, {
        clientRequestId: input.clientRequestId,
        inputMethod: input.inputMethod,
        userText: input.text,
        status: "PENDING",
        completedAt: null,
      });
      attempt.turns.push(turn);
      return { kind: "created", turn };
    },

    async prepareFailedTurnRetry(attemptId, userId, turnId) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) return { kind: "not_found" };
      const turn = attempt.turns.find((candidate) => candidate.id === turnId);
      if (!turn) return { kind: "not_found" };
      if (attempt.status !== "ACTIVE") {
        return { kind: "rejected", code: "INVALID_ATTEMPT_STATE" };
      }
      if (
        turn.status === "PENDING" ||
        attempt.turns.some((candidate) => candidate.status === "PENDING")
      ) {
        return { kind: "rejected", code: "TURN_ALREADY_PENDING" };
      }
      if (turn.status !== "FAILED") {
        return { kind: "rejected", code: "INVALID_ATTEMPT_STATE" };
      }
      turn.status = "PENDING";
      turn.assistantText = null;
      turn.completedAt = null;
      return { kind: "ready", turn };
    },

    async finalizeRoleplayTurn(input) {
      const attempt = attempts.get(input.attemptId);
      const turn = attempt?.turns.find(
        (candidate) => candidate.id === input.turnId,
      );
      if (!attempt || attempt.userId !== input.userId || !turn) {
        return { kind: "not_found" };
      }
      turn.assistantText = input.assistantText;
      turn.status = input.turnStatus;
      turn.completedAt = input.completedAt;
      usageEvents.push(input);
      return { kind: "updated", turn };
    },

    async finishAttempt(attemptId, userId, currentTime) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) {
        return { kind: "not_found" };
      }

      if (attempt.turns.some((turn) => turn.status === "PENDING")) {
        return { kind: "rejected", code: "TURN_ALREADY_PENDING" };
      }

      const nextStatus = getFinishStatus(attempt.status, attempt.turns.length);
      if (nextStatus !== attempt.status) {
        attempt.status = nextStatus;
        attempt.endedAt = currentTime;
        attempt.evaluationStartedAt =
          nextStatus === "EVALUATING" ? currentTime : null;
      }
      return { kind: "finished", id: attempt.id, status: attempt.status };
    },

    async deleteAttempt(attemptId, userId) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) {
        return false;
      }
      attempts.delete(attemptId);
      return true;
    },
  };

  return { attempts, repository, usageEvents };
}

async function startAttempt(
  service: ReturnType<typeof createAttemptService>,
  userId = ownerId,
) {
  return service.create(userId, {
    scenarioKey: "salary-negotiation",
    difficulty: "MEDIUM",
    retryOfAttemptId: null,
  });
}

describe("attempt service", () => {
  it("creates an active attempt with a 15-minute expiry and opening message", async () => {
    const { repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );

    const attempt = await startAttempt(service);

    expect(attempt).toMatchObject({
      status: "ACTIVE",
      difficulty: "MEDIUM",
      scenario: { key: "salary-negotiation", version: 1 },
      openingMessage: salaryNegotiationV1.openingMessage,
      startedAt: "2026-08-29T10:00:00.000Z",
      expiresAt: "2026-08-29T10:15:00.000Z",
    });
  });

  it("hides non-owned and scenario-mismatched retry sources", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const source = await startAttempt(service);

    await expect(
      service.getOwned(otherUserId, source.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.create(otherUserId, {
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        retryOfAttemptId: source.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const storedSource = attempts.get(source.id);
    if (!storedSource) throw new Error("Expected stored retry source");
    storedSource.scenario.key = "behavioral-interview";
    await expect(
      service.create(ownerId, {
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        retryOfAttemptId: source.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns one logical turn for a duplicate client request before state checks", async () => {
    const { attempts, repository } = createMemoryRepository();
    const aiService = createSuccessfulAiService();
    const service = createAttemptService(repository, aiService, () => now);
    const attempt = await startAttempt(service);
    const request = {
      clientRequestId: "request-stable",
      text: "I would like to discuss compensation.",
      inputMethod: "TEXT" as const,
    };

    const first = await service.createTurn(ownerId, attempt.id, request);
    const stored = attempts.get(attempt.id);
    if (!stored) throw new Error("Expected stored attempt");
    stored.status = "ABANDONED";
    stored.expiresAt = new Date("2026-08-29T09:00:00.000Z");
    const duplicate = await service.createTurn(ownerId, attempt.id, request);

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.data.id).toBe(first.data.id);
    expect(stored.turns).toHaveLength(1);
    expect(aiService.generateRoleplayReply).toHaveBeenCalledTimes(1);
  });

  it("completes roleplay with chronological authoritative context and usage", async () => {
    const { attempts, repository, usageEvents } = createMemoryRepository();
    const aiService = createSuccessfulAiService();
    const service = createAttemptService(repository, aiService, () => now);
    const attempt = await startAttempt(service);
    const stored = attempts.get(attempt.id);
    if (!stored) throw new Error("Expected stored attempt");
    stored.turns.push(
      createTurn(2, {
        userText: "Second learner message",
        assistantText: "Second assistant response",
      }),
      createTurn(1, {
        userText: "First learner message",
        assistantText: "First assistant response",
      }),
    );

    const result = await service.createTurn(ownerId, attempt.id, {
      clientRequestId: "request-current",
      text: "My current persisted request",
      inputMethod: "TEXT",
    });

    expect(result.data).toMatchObject({
      status: "COMPLETED",
      assistantText: "What evidence supports the adjustment you have in mind?",
    });
    expect(aiService.generateRoleplayReply).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "MEDIUM",
        previousTurns: [
          expect.objectContaining({
            sequence: 1,
            userText: "First learner message",
          }),
          expect.objectContaining({
            sequence: 2,
            userText: "Second learner message",
          }),
        ],
        latestLearnerMessage: "My current persisted request",
      }),
    );
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0]?.usage).toEqual({
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash-0731",
      status: "SUCCESS",
      latencyMs: 125,
      inputTokens: 120,
      outputTokens: 18,
      estimatedCost: 0.00012,
      errorCode: null,
    });
  });

  it("preserves learner text and records safe usage when roleplay fails", async () => {
    const { attempts, repository, usageEvents } = createMemoryRepository();
    const aiService = createSuccessfulAiService({
      generateRoleplayReply: vi
        .fn<AiService["generateRoleplayReply"]>()
        .mockRejectedValue(new AiProviderError("AI_PROVIDER_ERROR", 75)),
    });
    const service = createAttemptService(repository, aiService, () => now);
    const attempt = await startAttempt(service);

    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "request-fails",
        text: "Please preserve this learner message.",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR", status: 502 });

    const stored = attempts.get(attempt.id)?.turns[0];
    expect(stored).toMatchObject({
      userText: "Please preserve this learner message.",
      assistantText: null,
      status: "FAILED",
    });
    expect(usageEvents[0]?.usage).toMatchObject({
      status: "FAILED",
      errorCode: "AI_PROVIDER_ERROR",
      inputTokens: null,
      outputTokens: null,
      estimatedCost: null,
    });
  });

  it("retries a failed response on the same conversation turn", async () => {
    const { attempts, repository } = createMemoryRepository();
    const generateRoleplayReply = vi
      .fn<AiService["generateRoleplayReply"]>()
      .mockRejectedValueOnce(new AiProviderError("AI_TIMEOUT", 15_000))
      .mockResolvedValueOnce({
        text: "I can take that request back for approval.",
        latencyMs: 110,
        inputTokens: 100,
        outputTokens: 12,
        estimatedCost: null,
      });
    const service = createAttemptService(
      repository,
      createSuccessfulAiService({ generateRoleplayReply }),
      () => now,
    );
    const attempt = await startAttempt(service);

    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "request-retry",
        text: "Could you seek approval for 90,000?",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT", status: 504 });
    const failedTurn = attempts.get(attempt.id)?.turns[0];
    if (!failedTurn) throw new Error("Expected failed turn");
    expect(failedTurn).toMatchObject({
      userText: "Could you seek approval for 90,000?",
      assistantText: null,
      status: "FAILED",
    });

    const retried = await service.retryTurn(ownerId, attempt.id, failedTurn.id);

    expect(retried).toMatchObject({
      id: failedTurn.id,
      userText: "Could you seek approval for 90,000?",
      status: "COMPLETED",
      assistantText: "I can take that request back for approval.",
    });
    expect(attempts.get(attempt.id)?.turns).toHaveLength(1);
    expect(generateRoleplayReply).toHaveBeenCalledTimes(2);
  });

  it("hides non-owned retry turns and rejects retry after the attempt is frozen", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const attempt = await startAttempt(service);
    const stored = attempts.get(attempt.id);
    if (!stored) throw new Error("Expected stored attempt");
    const failedTurn = createTurn(1, { status: "FAILED", completedAt: null });
    stored.turns.push(failedTurn);

    await expect(
      service.retryTurn(otherUserId, attempt.id, failedTurn.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    stored.status = "EVALUATING";
    await expect(
      service.retryTurn(ownerId, attempt.id, failedTurn.id),
    ).rejects.toMatchObject({ code: "INVALID_ATTEMPT_STATE" });
  });

  it("enforces pending, expiry, turn-count, and lifecycle limits", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const attempt = await startAttempt(service);
    const stored = attempts.get(attempt.id);
    if (!stored) throw new Error("Expected stored attempt");

    stored.turns.push(createTurn(1, { status: "PENDING", completedAt: null }));
    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "new-request",
        text: "New message",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "TURN_ALREADY_PENDING" });

    stored.turns = [];
    stored.expiresAt = now;
    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "expired-request",
        text: "New message",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "SESSION_LIMIT_REACHED" });

    stored.expiresAt = new Date("2026-08-29T10:15:00.000Z");
    stored.turns = Array.from({ length: 20 }, (_, index) =>
      createTurn(index + 1),
    );
    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "turn-21",
        text: "One too many",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "SESSION_LIMIT_REACHED" });

    stored.turns = [];
    stored.status = "EVALUATING";
    await expect(
      service.createTurn(ownerId, attempt.id, {
        clientRequestId: "frozen-request",
        text: "Frozen transcript",
        inputMethod: "TEXT",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ATTEMPT_STATE" });
  });

  it("finishes zero-turn and eligible attempts idempotently", async () => {
    const { repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const empty = await startAttempt(service);

    await expect(service.finish(ownerId, empty.id)).resolves.toEqual({
      id: empty.id,
      status: "ABANDONED",
    });
    await expect(service.finish(ownerId, empty.id)).resolves.toEqual({
      id: empty.id,
      status: "ABANDONED",
    });

    const eligible = await startAttempt(service);
    await service.createTurn(ownerId, eligible.id, {
      clientRequestId: "request-eligible",
      text: "A substantive message",
      inputMethod: "TEXT",
    });
    await expect(service.finish(ownerId, eligible.id)).resolves.toEqual({
      id: eligible.id,
      status: "EVALUATING",
    });
    await expect(service.finish(ownerId, eligible.id)).resolves.toEqual({
      id: eligible.id,
      status: "EVALUATING",
    });
  });

  it("computes attempt comparison when both current and previous attempts are evaluated", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );

    const first = await service.create(ownerId, {
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
      retryOfAttemptId: null,
    });
    const firstStored = attempts.get(first.id);
    if (!firstStored) throw new Error("Expected first attempt");
    firstStored.status = "COMPLETED";
    firstStored.evaluation = {
      attemptId: first.id,
      skills: {
        clarity: 60,
        assertiveness: 55,
        empathy: 70,
        structure: 65,
        conciseness: 75,
      },
      universalScore: 65,
      scenarioScore: 50,
      overallScore: 61,
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "PARTIALLY_ACHIEVED",
          explanation: "...",
          evidenceTurnIds: [],
        },
      ],
      strengths: [],
      improvements: [],
      moments: [],
      summary: "First summary",
      nextFocus: { skill: "ASSERTIVENESS", reason: "Focus on assertiveness" },
      createdAt: now.toISOString(),
    };

    const retry = await service.create(ownerId, {
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM",
      retryOfAttemptId: first.id,
    });
    const retryStored = attempts.get(retry.id);
    if (!retryStored) throw new Error("Expected retry attempt");
    retryStored.status = "COMPLETED";
    retryStored.evaluation = {
      attemptId: retry.id,
      skills: {
        clarity: 75,
        assertiveness: 70,
        empathy: 75,
        structure: 70,
        conciseness: 80,
      },
      universalScore: 74,
      scenarioScore: 100,
      overallScore: 82,
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED",
          explanation: "...",
          evidenceTurnIds: [],
        },
      ],
      strengths: [],
      improvements: [],
      moments: [],
      summary: "Retry summary",
      nextFocus: { skill: "STRUCTURE", reason: "Structure focus" },
      createdAt: now.toISOString(),
    };

    const comparison = await service.getComparison(ownerId, retry.id);
    expect(comparison).not.toBeNull();
    expect(comparison?.comparable).toBe(true);
    expect(comparison?.overallDelta).toBe(21);
    expect(comparison?.skillDeltas.assertiveness).toBe(15);
    expect(comparison?.weakArea?.improved).toBe(true);

    const retryDetail = await service.getOwned(ownerId, retry.id);
    expect(retryDetail.comparison).toEqual(comparison);
  });

  it("returns null comparison when attempt is not a retry", async () => {
    const { repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const attempt = await startAttempt(service);

    const comparison = await service.getComparison(ownerId, attempt.id);
    expect(comparison).toBeNull();
  });

  it("deletes an owned attempt successfully", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const attempt = await startAttempt(service);
    expect(attempts.has(attempt.id)).toBe(true);

    await service.delete(ownerId, attempt.id);
    expect(attempts.has(attempt.id)).toBe(false);
  });

  it("rejects deleting non-owned attempt or non-existent attempt with NOT_FOUND", async () => {
    const { repository } = createMemoryRepository();
    const service = createAttemptService(
      repository,
      createSuccessfulAiService(),
      () => now,
    );
    const attempt = await startAttempt(service);

    await expect(service.delete(otherUserId, attempt.id)).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
      },
    );
    await expect(
      service.delete(ownerId, "99999999-9999-4999-8999-999999999999"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
