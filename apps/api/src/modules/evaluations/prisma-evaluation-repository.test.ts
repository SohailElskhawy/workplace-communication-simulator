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
      data: { status: "EVALUATION_FAILED" },
    });
    expect(transaction.aiUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "EVALUATION",
        status: "FAILED",
        errorCode: "AI_TIMEOUT",
      }),
    });
  });
});
