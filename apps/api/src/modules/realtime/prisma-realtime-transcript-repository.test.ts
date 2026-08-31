import { describe, expect, it, vi } from "vitest";

import { createPrismaRealtimeTranscriptRepository } from "./prisma-realtime-transcript-repository.js";

const attemptId = "11111111-1111-4111-8111-111111111111";
const completedAt = new Date("2026-08-31T10:00:00.000Z");

function createPrisma(status: string | null = "ACTIVE") {
  const records: Array<{
    attemptId: string;
    sequence: number;
    clientRequestId: string;
    inputMethod: string;
    userText: string;
    assistantText: string | null;
    status: string;
    completedAt: Date | null;
  }> = [
    {
      attemptId,
      sequence: 1,
      clientRequestId: "text-existing",
      inputMethod: "TEXT",
      userText: "Existing text turn",
      assistantText: "Existing reply",
      status: "COMPLETED",
      completedAt,
    },
  ];
  const transaction = {
    $queryRaw: vi
      .fn()
      .mockResolvedValue(status === null ? [] : [{ attemptId, status }]),
    conversationTurn: {
      findMany: vi.fn(
        async ({ where }: { where: { clientRequestId: { in: string[] } } }) =>
          records
            .filter((record) =>
              where.clientRequestId.in.includes(record.clientRequestId),
            )
            .map((record) => ({ clientRequestId: record.clientRequestId })),
      ),
      aggregate: vi.fn(async () => ({
        _max: {
          sequence: Math.max(...records.map((record) => record.sequence)),
        },
      })),
      create: vi.fn(async ({ data }) => {
        records.push(data);
        return data;
      }),
    },
    realtimeConversation: {
      update: vi.fn(async () => undefined),
    },
  };
  return {
    records,
    prisma: {
      $transaction: async (
        callback: (tx: typeof transaction) => Promise<unknown>,
      ) => callback(transaction),
    },
  };
}

const importedTurns = [
  {
    clientRequestId: "realtime:conv_example:1",
    userText: "Learner one",
    assistantText: "Agent one",
    status: "COMPLETED" as const,
  },
  {
    clientRequestId: "realtime:conv_example:3",
    userText: "Learner two",
    assistantText: null,
    status: "FAILED" as const,
  },
];

describe("Prisma realtime transcript repository", () => {
  it("continues an existing turn sequence and does not duplicate a webhook retry", async () => {
    const { prisma, records } = createPrisma();
    const repository = createPrismaRealtimeTranscriptRepository(
      prisma as never,
    );

    await repository.importTranscript(
      "conv_example",
      importedTurns,
      completedAt,
    );
    await repository.importTranscript(
      "conv_example",
      importedTurns,
      completedAt,
    );

    expect(records).toHaveLength(3);
    expect(records.slice(1)).toEqual([
      expect.objectContaining({
        sequence: 2,
        inputMethod: "VOICE",
        status: "COMPLETED",
        completedAt,
      }),
      expect.objectContaining({
        sequence: 3,
        inputMethod: "VOICE",
        status: "FAILED",
        completedAt: null,
      }),
    ]);
  });

  it("does not disclose or mutate an unknown conversation mapping", async () => {
    const { prisma, records } = createPrisma(null);
    const repository = createPrismaRealtimeTranscriptRepository(
      prisma as never,
    );

    await expect(
      repository.importTranscript("conv_unknown", importedTurns, completedAt),
    ).resolves.toBe("unknown");
    expect(records).toHaveLength(1);
  });
});
