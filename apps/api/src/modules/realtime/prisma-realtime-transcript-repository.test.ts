import { describe, expect, it, vi } from "vitest";

import { createPrismaRealtimeTranscriptRepository } from "./prisma-realtime-transcript-repository.js";

const attemptId = "11111111-1111-4111-8111-111111111111";
const completedAt = new Date("2026-08-31T10:00:00.000Z");

describe("Prisma realtime transcript repository", () => {
  it("continues the turn sequence and ignores a callback after a UI import", async () => {
    const records: Array<{ clientRequestId: string }> = [
      { clientRequestId: "text-existing" },
    ];
    const transaction = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { attemptId, status: "ACTIVE", transcriptImportedAt: null },
        ]),
      conversationTurn: {
        findMany: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ _max: { sequence: 1 } }),
        create: vi.fn(async ({ data }) => records.push(data)),
      },
      realtimeConversation: { update: vi.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      $transaction: async (
        callback: (tx: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    };
    const repository = createPrismaRealtimeTranscriptRepository(
      prisma as never,
    );
    const turns = [
      {
        clientRequestId: "realtime:conv_example:1",
        userText: "Learner one",
        assistantText: "Agent one",
        status: "COMPLETED" as const,
      },
    ];

    await expect(
      repository.importTranscript("conv_example", turns, completedAt),
    ).resolves.toBe("imported");
    expect(records).toHaveLength(2);

    transaction.$queryRaw.mockResolvedValueOnce([
      { attemptId, status: "ACTIVE", transcriptImportedAt: completedAt },
    ]);
    await expect(
      repository.importTranscript("conv_example", turns, completedAt),
    ).resolves.toBe("ignored");
    expect(records).toHaveLength(2);
  });
});
