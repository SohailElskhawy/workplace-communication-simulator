import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
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
      };
      attempts.set(id, attempt);
      return { kind: "created", attempt };
    },

    async findOwnedAttempt(attemptId, userId) {
      const attempt = attempts.get(attemptId);
      return attempt?.userId === userId ? attempt : null;
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

    async finishAttempt(attemptId, userId, currentTime) {
      const attempt = attempts.get(attemptId);
      if (!attempt || attempt.userId !== userId) {
        return { kind: "not_found" };
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
  };

  return { attempts, repository };
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
    const service = createAttemptService(repository, () => now);

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
    const service = createAttemptService(repository, () => now);
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
    const service = createAttemptService(repository, () => now);
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
  });

  it("enforces pending, expiry, turn-count, and lifecycle limits", async () => {
    const { attempts, repository } = createMemoryRepository();
    const service = createAttemptService(repository, () => now);
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
    const service = createAttemptService(repository, () => now);
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
});
