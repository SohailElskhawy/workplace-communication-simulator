import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaVoiceRepository } from "./prisma-voice-repository.js";

describe("PrismaVoiceRepository", () => {
  const attemptId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";

  it("finds owned attempt for transcription", async () => {
    const attemptRow = {
      id: attemptId,
      status: "ACTIVE" as const,
      expiresAt: new Date("2026-08-29T12:15:00.000Z"),
    };

    const prisma = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue(attemptRow),
      },
    } as unknown as PrismaClient;

    const repository = createPrismaVoiceRepository(prisma);
    const result = await repository.findAttemptForTranscription(
      attemptId,
      userId,
    );

    expect(result).toEqual({
      id: attemptId,
      status: "ACTIVE",
      expiresAt: attemptRow.expiresAt,
    });
    expect(prisma.simulationAttempt.findFirst).toHaveBeenCalledWith({
      where: { id: attemptId, userId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });
  });

  it("returns null when attempt is not found or not owned", async () => {
    const prisma = {
      simulationAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    const repository = createPrismaVoiceRepository(prisma);
    const result = await repository.findAttemptForTranscription(
      attemptId,
      userId,
    );

    expect(result).toBeNull();
  });

  it("records AI transcription usage event in database", async () => {
    const prisma = {
      aiUsageEvent: {
        create: vi.fn().mockResolvedValue({ id: "usage-1" }),
      },
    } as unknown as PrismaClient;

    const repository = createPrismaVoiceRepository(prisma);
    await repository.recordTranscriptionUsage({
      userId,
      attemptId,
      provider: "openrouter",
      model: "openai/whisper-large-v3-turbo",
      status: "SUCCESS",
      latencyMs: 320,
      audioDurationMs: 4500,
      estimatedCost: 0.0002,
      errorCode: null,
    });

    expect(prisma.aiUsageEvent.create).toHaveBeenCalledWith({
      data: {
        userId,
        attemptId,
        operation: "TRANSCRIPTION",
        provider: "openrouter",
        model: "openai/whisper-large-v3-turbo",
        status: "SUCCESS",
        latencyMs: 320,
        audioDurationMs: 4500,
        estimatedCost: 0.0002,
        errorCode: null,
      },
    });
  });
});
