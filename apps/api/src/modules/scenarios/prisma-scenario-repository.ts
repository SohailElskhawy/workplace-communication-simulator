import type { PrismaClient } from "../../generated/prisma/client.js";

import type { ScenarioRepository } from "./scenario-service.js";

const summarySelection = {
  key: true,
  version: true,
  title: true,
  category: true,
  summary: true,
} as const;

export function createPrismaScenarioRepository(
  prisma: PrismaClient,
): ScenarioRepository {
  return {
    listActive() {
      return prisma.scenario.findMany({
        where: { isActive: true },
        orderBy: { title: "asc" },
        select: summarySelection,
      });
    },
    findActiveByKey(key) {
      return prisma.scenario.findFirst({
        where: { key, isActive: true },
        select: { ...summarySelection, definition: true },
      });
    },
  };
}
