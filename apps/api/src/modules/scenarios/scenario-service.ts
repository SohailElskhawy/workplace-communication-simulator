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

export interface ScenarioServiceOptions {
  ttlMs?: number;
  clock?: () => number;
}

const DEFAULT_SCENARIO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createScenarioService(
  repository: ScenarioRepository,
  options: ScenarioServiceOptions = {},
): ScenarioService {
  const ttlMs = options.ttlMs ?? DEFAULT_SCENARIO_CACHE_TTL_MS;
  const clock = options.clock ?? Date.now;

  let cachedList: {
    data: PublicScenarioSummary[];
    expiresAt: number;
  } | null = null;
  const cachedDetails = new Map<
    string,
    { detail: PublicScenarioDetail | null; expiresAt: number }
  >();

  return {
    async listActive() {
      const now = clock();
      if (cachedList && now < cachedList.expiresAt) {
        return cachedList.data;
      }

      const records = await repository.listActive();
      const data: PublicScenarioSummary[] = records.map((record) => ({
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
      }));

      cachedList = { data, expiresAt: now + ttlMs };
      return data;
    },
    async getActiveByKey(key) {
      const now = clock();
      const cached = cachedDetails.get(key);
      if (cached && now < cached.expiresAt) {
        return cached.detail;
      }

      const record = await repository.findActiveByKey(key);

      if (!record) {
        cachedDetails.set(key, { detail: null, expiresAt: now + ttlMs });
        return null;
      }

      const definition = ScenarioDefinitionSchema.parse(record.definition);

      const detail: PublicScenarioDetail = {
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
        context: definition.publicContext,
        availableDifficulties: ["EASY", "MEDIUM", "HARD"],
      };

      cachedDetails.set(key, { detail, expiresAt: now + ttlMs });
      return detail;
    },
  };
}
