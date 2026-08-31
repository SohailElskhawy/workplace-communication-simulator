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
  it("does not finish while a bound realtime conversation awaits its canonical transcript", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: input.attemptId }]),
      simulationAttempt: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: input.attemptId,
          status: "ACTIVE",
          _count: { conversationTurns: 1 },
        }),
      },
      conversationTurn: { findFirst: vi.fn().mockResolvedValue(null) },
      realtimeConversation: {
        findFirst: vi.fn().mockResolvedValue({ id: "mapping" }),
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
      repository.finishAttempt(
        input.attemptId,
        input.userId,
        input.currentTime,
      ),
    ).resolves.toEqual({
      kind: "rejected",
      code: "REALTIME_TRANSCRIPT_PENDING",
    });
  });

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
      $queryRaw: vi.fn().mockResolvedValue([completedTurn]),
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

  it("returns not_found without storing usage when no pending turn matches", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aiUsageEvent: {
        create: vi.fn(),
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
        assistantText: "Assistant response",
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
    ).resolves.toEqual({ kind: "not_found" });
    expect(transaction.aiUsageEvent.create).not.toHaveBeenCalled();
  });

  it("loads only the roleplay context needed to build the prompt", async () => {
    const previousTurn = {
      sequence: 1,
      userText: "First learner message",
      assistantText: "First assistant reply",
    };
    const findFirst = vi.fn().mockResolvedValue({
      difficulty: "MEDIUM",
      variationId: "tight-budget",
      scenario: { definition: { marker: "definition" } },
      conversationTurns: [previousTurn],
    });
    const prisma = {
      simulationAttempt: { findFirst },
    } as unknown as PrismaClient;
    const repository = createPrismaAttemptRepository(prisma);

    const context = await repository.findRoleplayContext({
      attemptId: input.attemptId,
      userId: input.userId,
      beforeSequence: 2,
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: input.attemptId, userId: input.userId },
      }),
    );
    expect(context).toEqual({
      difficulty: "MEDIUM",
      variationId: "tight-budget",
      scenarioDefinition: { marker: "definition" },
      previousTurns: [previousTurn],
    });
  });

  it("finds owned attempt and computes comparison from retryOfAttempt", async () => {
    const rawAttempt = {
      id: "22222222-2222-4222-8222-222222222222",
      userId: input.userId,
      difficulty: "MEDIUM" as const,
      status: "COMPLETED" as const,
      retryOfAttemptId: "11111111-1111-4111-8111-111111111111",
      startedAt: input.currentTime,
      endedAt: input.currentTime,
      expiresAt: input.currentTime,
      evaluationStartedAt: input.currentTime,
      scenario: {
        id: "scenario-1",
        key: "salary-negotiation",
        version: 1,
        title: "Salary Negotiation",
        definition: {},
      },
      conversationTurns: [],
      evaluation: {
        id: "eval-2",
        attemptId: "22222222-2222-4222-8222-222222222222",
        clarity: 80,
        assertiveness: 75,
        empathy: 80,
        structure: 75,
        conciseness: 80,
        universalScore: 78,
        scenarioScore: 100,
        overallScore: 85,
        objectiveResults: [
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
        nextFocusSkill: "STRUCTURE",
        nextFocusReason: "...",
        summary: "Current summary",
        model: "model",
        promptVersion: "v1",
        createdAt: input.currentTime,
      },
      retryOfAttempt: {
        id: "11111111-1111-4111-8111-111111111111",
        difficulty: "MEDIUM" as const,
        evaluation: {
          id: "eval-1",
          attemptId: "11111111-1111-4111-8111-111111111111",
          clarity: 65,
          assertiveness: 60,
          empathy: 75,
          structure: 65,
          conciseness: 75,
          universalScore: 68,
          scenarioScore: 50,
          overallScore: 63,
          objectiveResults: [
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
          nextFocusSkill: "ASSERTIVENESS",
          nextFocusReason: "...",
          summary: "Previous summary",
          model: "model",
          promptVersion: "v1",
          createdAt: input.currentTime,
        },
      },
    };

    const prisma = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue(rawAttempt),
      },
    } as unknown as PrismaClient;
    const repository = createPrismaAttemptRepository(prisma);

    const result = await repository.findOwnedAttempt(
      rawAttempt.id,
      input.userId,
    );
    expect(result).not.toBeNull();
    expect(result?.comparison).not.toBeNull();
    expect(result?.comparison?.comparable).toBe(true);
    expect(result?.comparison?.overallDelta).toBe(22);
    expect(result?.comparison?.skillDeltas.assertiveness).toBe(15);
    expect(result?.comparison?.weakArea?.improved).toBe(true);
  });
});

describe("Prisma attempt repository variation persistence", () => {
  const scenarioDefinition = { marker: "active-definition" };
  const retrySourceId = "11111111-1111-4111-8111-111111111111";

  function createCreateAttemptPrisma(options: {
    retrySource?: {
      scenario: { key: string };
      variationId: string | null;
    } | null;
  }) {
    const transaction = {
      scenario: {
        findFirst: vi.fn().mockResolvedValue({
          id: "20000000-0000-4000-8000-000000000001",
          key: "salary-negotiation",
          definition: scenarioDefinition,
        }),
      },
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue(options.retrySource ?? null),
        create: vi.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          userId: input.userId,
          difficulty: "MEDIUM",
          status: "ACTIVE",
          retryOfAttemptId: null,
          variationId: "tight-budget",
          startedAt: input.currentTime,
          endedAt: null,
          expiresAt: input.currentTime,
          evaluationStartedAt: null,
          scenario: {
            id: "20000000-0000-4000-8000-000000000001",
            key: "salary-negotiation",
            version: 1,
            title: "Salary Negotiation",
            definition: scenarioDefinition,
          },
          conversationTurns: [],
          evaluation: null,
          retryOfAttempt: null,
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;
    return { prisma, transaction };
  }

  function createRepositoryInput(overrides: {
    retryOfAttemptId?: string | null;
  }) {
    return {
      userId: input.userId,
      scenarioKey: "salary-negotiation",
      difficulty: "MEDIUM" as const,
      retryOfAttemptId: overrides.retryOfAttemptId ?? null,
      startedAt: input.currentTime,
      expiresAt: input.currentTime,
      selectVariationId: vi.fn(() => "tight-budget"),
    };
  }

  it("persists the variation id chosen by the selection callback", async () => {
    const { prisma, transaction } = createCreateAttemptPrisma({});
    const repository = createPrismaAttemptRepository(prisma);
    const repositoryInput = createRepositoryInput({});

    const result = await repository.createAttempt(repositoryInput);

    if (result.kind !== "created") throw new Error("Expected created attempt");
    expect(repositoryInput.selectVariationId).toHaveBeenCalledWith(
      scenarioDefinition,
      null,
    );
    expect(transaction.simulationAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ variationId: "tight-budget" }),
      }),
    );
    expect(result.attempt.variationId).toBe("tight-budget");
  });

  it("passes the retry source variation id as excluded to selection", async () => {
    const { prisma } = createCreateAttemptPrisma({
      retrySource: {
        scenario: { key: "salary-negotiation" },
        variationId: "standard-offer",
      },
    });
    const repository = createPrismaAttemptRepository(prisma);
    const repositoryInput = createRepositoryInput({
      retryOfAttemptId: retrySourceId,
    });

    await repository.createAttempt(repositoryInput);

    expect(repositoryInput.selectVariationId).toHaveBeenCalledWith(
      scenarioDefinition,
      "standard-offer",
    );
  });

  it("returns not_found when the retry source belongs to another scenario", async () => {
    const { prisma } = createCreateAttemptPrisma({
      retrySource: {
        scenario: { key: "behavioral-interview" },
        variationId: "standard-offer",
      },
    });
    const repository = createPrismaAttemptRepository(prisma);

    await expect(
      repository.createAttempt(
        createRepositoryInput({ retryOfAttemptId: retrySourceId }),
      ),
    ).resolves.toEqual({ kind: "not_found" });
  });
});
