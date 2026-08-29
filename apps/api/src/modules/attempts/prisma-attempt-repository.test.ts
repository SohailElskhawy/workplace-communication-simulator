import type { PrismaClient } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";

import { createPrismaAttemptRepository } from "./prisma-attempt-repository.js";

const input = {
  attemptId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  clientRequestId: "request-stable",
  text: "I would like to discuss compensation.",
  inputMethod: "TEXT" as const,
  currentTime: new Date("2026-08-29T10:00:00.000Z"),
};

const existingTurn = {
  id: "33333333-3333-4333-8333-333333333333",
  sequence: 1,
  clientRequestId: input.clientRequestId,
  inputMethod: "TEXT" as const,
  userText: input.text,
  assistantText: null,
  status: "PENDING" as const,
  createdAt: input.currentTime,
  completedAt: null,
};

function createRacePrisma(findFirstResults: unknown[]): PrismaClient {
  return {
    conversationTurn: {
      findFirst: vi.fn(async () => findFirstResults.shift() ?? null),
    },
    $transaction: vi.fn(async () => {
      throw { code: "P2002" };
    }),
  } as unknown as PrismaClient;
}

describe("Prisma attempt repository race recovery", () => {
  it("returns the existing logical turn after an idempotency constraint race", async () => {
    const repository = createPrismaAttemptRepository(
      createRacePrisma([null, existingTurn]),
    );

    await expect(repository.createTurn(input)).resolves.toEqual({
      kind: "existing",
      turn: existingTurn,
    });
  });

  it("returns a stable pending-turn conflict after a partial-index race", async () => {
    const repository = createPrismaAttemptRepository(
      createRacePrisma([null, null, { id: existingTurn.id }]),
    );

    await expect(repository.createTurn(input)).resolves.toEqual({
      kind: "rejected",
      code: "TURN_ALREADY_PENDING",
    });
  });

  it("atomically finalizes a roleplay turn and stores safe usage metadata", async () => {
    const completedTurn = {
      ...existingTurn,
      assistantText: "Assistant response",
      status: "COMPLETED" as const,
      completedAt: input.currentTime,
    };
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: input.attemptId }]),
      conversationTurn: {
        findFirst: vi.fn().mockResolvedValue({ id: existingTurn.id }),
        update: vi.fn().mockResolvedValue(completedTurn),
      },
      aiUsageEvent: {
        create: vi.fn().mockResolvedValue({ id: "usage-event-id" }),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;
    const repository = createPrismaAttemptRepository(prisma);

    await expect(
      repository.finalizeRoleplayTurn({
        attemptId: input.attemptId,
        userId: input.userId,
        turnId: existingTurn.id,
        assistantText: completedTurn.assistantText,
        turnStatus: "COMPLETED",
        completedAt: input.currentTime,
        usage: {
          provider: "openrouter",
          model: "deepseek/deepseek-v4-flash-0731",
          status: "SUCCESS",
          latencyMs: 100,
          inputTokens: 40,
          outputTokens: 8,
          estimatedCost: null,
          errorCode: null,
        },
      }),
    ).resolves.toEqual({ kind: "updated", turn: completedTurn });
    expect(transaction.aiUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "ROLEPLAY",
        provider: "openrouter",
        status: "SUCCESS",
        errorCode: null,
      }),
    });
  });
});
