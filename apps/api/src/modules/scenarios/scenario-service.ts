import type {
  PublicScenarioDetail,
  PublicScenarioSummary,
} from "@kalemny/contracts";

import { ScenarioDefinitionSchema } from "./scenario-definition.js";

export interface ScenarioSummaryRecord {
  key: string;
  version: number;
  title: string;
  category: string;
  summary: string;
}

export interface ScenarioDetailRecord extends ScenarioSummaryRecord {
  definition: unknown;
}

export interface ScenarioRepository {
  listActive(): Promise<ScenarioSummaryRecord[]>;
  findActiveByKey(key: string): Promise<ScenarioDetailRecord | null>;
}

export interface ScenarioService {
  listActive(): Promise<PublicScenarioSummary[]>;
  getActiveByKey(key: string): Promise<PublicScenarioDetail | null>;
}

export function createScenarioService(
  repository: ScenarioRepository,
): ScenarioService {
  return {
    async listActive() {
      const records = await repository.listActive();

      return records.map((record) => ({
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
      }));
    },
    async getActiveByKey(key) {
      const record = await repository.findActiveByKey(key);

      if (!record) {
        return null;
      }

      const definition = ScenarioDefinitionSchema.parse(record.definition);

      return {
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
        context: definition.publicContext,
        availableDifficulties: ["EASY", "MEDIUM", "HARD"],
      };
    },
  };
}
