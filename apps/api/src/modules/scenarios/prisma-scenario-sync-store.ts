import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";

import type { ScenarioDefinition } from "./scenario-definition.js";
import type {
  PersistedScenarioVersion,
  ScenarioSyncStore,
  ScenarioSyncTransaction,
} from "./sync-scenarios.js";

const persistedScenarioSelection = {
  key: true,
  version: true,
  title: true,
  category: true,
  summary: true,
  definition: true,
} as const;

function createTransactionAdapter(
  transaction: Prisma.TransactionClient,
): ScenarioSyncTransaction {
  return {
    ensureVersion(
      definition: ScenarioDefinition,
    ): Promise<PersistedScenarioVersion> {
      return transaction.scenario.upsert({
        where: {
          key_version: {
            key: definition.key,
            version: definition.version,
          },
        },
        update: {},
        create: {
          key: definition.key,
          version: definition.version,
          title: definition.title,
          category: definition.category,
          summary: definition.summary,
          definition: definition as Prisma.InputJsonValue,
          isActive: false,
        },
        select: persistedScenarioSelection,
      });
    },
    async setActiveVersion(key: string, version: number): Promise<void> {
      await transaction.scenario.updateMany({
        where: { key, isActive: true, version: { not: version } },
        data: { isActive: false },
      });
      await transaction.scenario.update({
        where: { key_version: { key, version } },
        data: { isActive: true },
      });
    },
  };
}

export function createPrismaScenarioSyncStore(
  prisma: PrismaClient,
): ScenarioSyncStore {
  return {
    async transaction(operation) {
      await prisma.$transaction(async (transaction) => {
        await operation(createTransactionAdapter(transaction));
      });
    },
  };
}
