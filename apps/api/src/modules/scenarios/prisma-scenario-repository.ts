import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";

import type {
  CreateCustomScenarioRepositoryInput,
  ScenarioDetailRecord,
  ScenarioRepository,
  ScenarioSummaryRecord,
} from "./scenario-service.js";

const summarySelection = {
  key: true,
  version: true,
  title: true,
  category: true,
  summary: true,
  userId: true,
} as const;

export function createPrismaScenarioRepository(
  prisma: PrismaClient,
): ScenarioRepository {
  return {
    async listActive(userId?: string): Promise<ScenarioSummaryRecord[]> {
      const records = await prisma.scenario.findMany({
        where: {
          isActive: true,
          OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
        },
        orderBy: [{ createdAt: "desc" }, { title: "asc" }],
        select: { ...summarySelection, definition: true },
      });

      return records.map((record) => {
        const def = record.definition as Record<string, unknown> | null;
        return {
          key: record.key,
          version: record.version,
          title: record.title,
          titleAr: typeof def?.titleAr === "string" ? def.titleAr : null,
          category: record.category,
          summary: record.summary,
          summaryAr: typeof def?.summaryAr === "string" ? def.summaryAr : null,
          userId: record.userId,
        };
      });
    },
    async findActiveByKey(
      key: string,
      userId?: string,
    ): Promise<ScenarioDetailRecord | null> {
      const record = await prisma.scenario.findFirst({
        where: {
          key,
          isActive: true,
          OR: [{ userId: null }, ...(userId ? [{ userId }] : [])],
        },
        select: { ...summarySelection, definition: true },
      });

      if (!record) {
        return null;
      }

      const def = record.definition as Record<string, unknown> | null;
      return {
        key: record.key,
        version: record.version,
        title: record.title,
        titleAr: typeof def?.titleAr === "string" ? def.titleAr : null,
        category: record.category,
        summary: record.summary,
        summaryAr: typeof def?.summaryAr === "string" ? def.summaryAr : null,
        userId: record.userId,
        definition: record.definition,
      };
    },
    async createCustomScenario(
      input: CreateCustomScenarioRepositoryInput,
    ): Promise<ScenarioDetailRecord> {
      return prisma.$transaction(async (transaction) => {
        const scenario = await transaction.scenario.create({
          data: {
            userId: input.userId,
            key: input.key,
            version: 1,
            title: input.title,
            category: "CUSTOM",
            summary: input.summary,
            definition: input.definition as Prisma.InputJsonValue,
            isActive: true,
          },
          select: {
            ...summarySelection,
            definition: true,
          },
        });

        await transaction.aiUsageEvent.create({
          data: {
            userId: input.userId,
            operation: "SCENARIO_GENERATION",
            provider: input.usage.provider,
            model: input.usage.model,
            status: input.usage.status,
            latencyMs: input.usage.latencyMs,
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            estimatedCost: input.usage.estimatedCost,
            errorCode: input.usage.errorCode,
          },
        });

        return scenario;
      });
    },
    async deleteCustomScenario(key: string, userId: string): Promise<boolean> {
      const result = await prisma.scenario.updateMany({
        where: {
          key,
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
      return result.count > 0;
    },
  };
}
