import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaEvaluationRepository } from "./prisma-evaluation-repository.js";

describe("PrismaEvaluationRepository", () => {
  const attemptId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  it("atomically saves evaluation, completes attempt, and records AI usage event", async () => {
    const evaluationRow = {
      id: "eval-1",
      attemptId,
      clarity: 80,
      assertiveness: 75,
      empathy: 70,
      structure: 85,
      conciseness: 80,
      universalScore: 78,
      scenarioScore: 100,
      overallScore: 85,
      objectiveResults: [],
      strengths: [],
      improvements: [],
      moments: [],
      nextFocusSkill: "EMPATHY" as const,
      nextFocusReason: "Practice empathy",
      summary: "Good session",
      model: "openai/gpt-5.6-luna-pro",
      promptVersion: "evaluation-v1",
      createdAt: new Date("2026-08-29T12:00:00.000Z"),
    };

    const transaction = {
      evaluation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(evaluationRow),
      },
      simulationAttempt: {
        update: vi
          .fn()
          .mockResolvedValue({ id: attemptId, status: "COMPLETED" }),
      },
      aiUsageEvent: {
        create: vi.fn().mockResolvedValue({ id: "usage-1" }),
      },
    };

    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;

    const repository = createPrismaEvaluationRepository(prisma);

    const result = await repository.saveEvaluation({
      attemptId,
      userId,
      skills: {
        clarity: 80,
        assertiveness: 75,
        empathy: 70,
        structure: 85,
        conciseness: 80,
      },
      universalScore: 78,
      scenarioScore: 100,
      overallScore: 85,
      objectiveResults: [],
      strengths: [],
      improvements: [],
      moments: [],
      nextFocusSkill: "EMPATHY",
      nextFocusReason: "Practice empathy",
      summary: "Good session",
      model: "openai/gpt-5.6-luna-pro",
      promptVersion: "evaluation-v1",
      progressEligible: true,
      endedAt: new Date("2026-08-29T12:00:00.000Z"),
      usage: {
        provider: "openrouter",
        model: "openai/gpt-5.6-luna-pro",
        status: "SUCCESS",
        latencyMs: 500,
        inputTokens: 300,
        outputTokens: 150,
        estimatedCost: 0.002,
        errorCode: null,
      },
    });

    expect(result.id).toBe("eval-1");
    expect(result.overallScore).toBe(85);
    expect(transaction.simulationAttempt.update).toHaveBeenCalledWith({
      where: { id: attemptId },
      data: {
        status: "COMPLETED",
        progressEligible: true,
        endedAt: expect.any(Date),
        evaluationClaimedAt: null,
      },
    });
    expect(transaction.aiUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "EVALUATION",
        provider: "openrouter",
        status: "SUCCESS",
        model: "openai/gpt-5.6-luna-pro",
      }),
    });
  });

  it("marks evaluation failed and logs failed usage event", async () => {
    const transaction = {
      simulationAttempt: {
        update: vi
          .fn()
          .mockResolvedValue({ id: attemptId, status: "EVALUATION_FAILED" }),
      },
      aiUsageEvent: {
        create: vi.fn().mockResolvedValue({ id: "usage-failed-1" }),
      },
    };

    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;

    const repository = createPrismaEvaluationRepository(prisma);

    await repository.markEvaluationFailed({
      attemptId,
      userId,
      usage: {
        provider: "openrouter",
        model: "openai/gpt-5.6-luna-pro",
        status: "FAILED",
        latencyMs: 30_000,
        inputTokens: null,
        outputTokens: null,
        estimatedCost: null,
        errorCode: "AI_TIMEOUT",
      },
    });

    expect(transaction.simulationAttempt.update).toHaveBeenCalledWith({
      where: { id: attemptId },
      data: { status: "EVALUATION_FAILED", evaluationClaimedAt: null },
    });
    expect(transaction.aiUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "EVALUATION",
        status: "FAILED",
        errorCode: "AI_TIMEOUT",
      }),
    });
  });

  it("claims an unclaimed evaluation with a conditional update before AI work", async () => {
    const claimedAt = new Date("2026-08-29T12:00:00.000Z");
    const transaction = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          userId,
          status: "EVALUATING",
          difficulty: "MEDIUM",
          endedAt: claimedAt,
          evaluationClaimedAt: null,
          scenario: {
            id: "scenario-1",
            key: "salary-negotiation",
            version: 1,
            title: "Salary Negotiation",
            definition: {},
          },
          conversationTurns: [],
          evaluation: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;

    const result = await createPrismaEvaluationRepository(
      prisma,
    ).claimEvaluation(attemptId, userId, claimedAt);

    expect(result.kind).toBe("claimed");
    expect(transaction.simulationAttempt.updateMany).toHaveBeenCalledWith({
      where: {
        id: attemptId,
        userId,
        status: "EVALUATING",
        evaluationClaimedAt: null,
      },
      data: { status: "EVALUATING", evaluationClaimedAt: claimedAt },
    });
  });

  it("rejects claiming when evaluation is already actively claimed within lease window", async () => {
    const recentClaimedAt = new Date("2026-08-29T12:00:00.000Z");
    const newRequestTime = new Date("2026-08-29T12:01:00.000Z"); // 1 minute later (< 3 min lease)
    const transaction = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          userId,
          status: "EVALUATING",
          difficulty: "MEDIUM",
          endedAt: recentClaimedAt,
          evaluationClaimedAt: recentClaimedAt,
          scenario: { id: "scenario-1", key: "salary-negotiation", version: 1, title: "Salary", definition: {} },
          conversationTurns: [],
          evaluation: null,
        }),
        updateMany: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (cb: (client: typeof transaction) => Promise<unknown>) => cb(transaction)),
    } as unknown as PrismaClient;

    const result = await createPrismaEvaluationRepository(prisma).claimEvaluation(
      attemptId,
      userId,
      newRequestTime,
    );

    expect(result.kind).toBe("in_progress");
    expect(transaction.simulationAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("re-claims evaluation when prior claim has exceeded lease window (stale lock recovery)", async () => {
    const staleClaimedAt = new Date("2026-08-29T12:00:00.000Z");
    const newRequestTime = new Date("2026-08-29T12:05:00.000Z"); // 5 minutes later (> 3 min lease)
    const transaction = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          userId,
          status: "EVALUATING",
          difficulty: "MEDIUM",
          endedAt: staleClaimedAt,
          evaluationClaimedAt: staleClaimedAt,
          scenario: { id: "scenario-1", key: "salary-negotiation", version: 1, title: "Salary", definition: {} },
          conversationTurns: [],
          evaluation: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (cb: (client: typeof transaction) => Promise<unknown>) => cb(transaction)),
    } as unknown as PrismaClient;

    const result = await createPrismaEvaluationRepository(prisma).claimEvaluation(
      attemptId,
      userId,
      newRequestTime,
    );

    expect(result.kind).toBe("claimed");
    expect(transaction.simulationAttempt.updateMany).toHaveBeenCalledWith({
      where: {
        id: attemptId,
        userId,
        status: "EVALUATING",
        evaluationClaimedAt: staleClaimedAt,
      },
      data: { status: "EVALUATING", evaluationClaimedAt: newRequestTime },
    });
  });
});
