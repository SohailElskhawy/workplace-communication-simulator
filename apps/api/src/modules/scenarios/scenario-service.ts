import { randomUUID } from "node:crypto";
import type {
  PublicScenarioDetail,
  PublicScenarioSummary,
} from "@kalemny/contracts";

import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import type { EntitlementService } from "../entitlements/entitlement-service.js";
import { parsePdfCvFromBuffer } from "./cv-parser.js";
import { ScenarioDefinitionSchema } from "./scenario-definition.js";
import { ScenarioError } from "./scenario-errors.js";

export interface ScenarioSummaryRecord {
  key: string;
  version: number;
  title: string;
  category: string;
  summary: string;
  userId?: string | null;
}

export interface ScenarioDetailRecord extends ScenarioSummaryRecord {
  definition: unknown;
}

export interface CreateCustomScenarioRepositoryInput {
  userId: string;
  key: string;
  title: string;
  summary: string;
  definition: unknown;
  usage: {
    provider: "openrouter";
    model: string;
    status: "SUCCESS" | "FAILED";
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCost: number | null;
    errorCode: "AI_TIMEOUT" | "AI_PROVIDER_ERROR" | null;
  };
}

export interface ScenarioRepository {
  listActive(userId?: string): Promise<ScenarioSummaryRecord[]>;
  findActiveByKey(
    key: string,
    userId?: string,
  ): Promise<ScenarioDetailRecord | null>;
  createCustomScenario?(
    input: CreateCustomScenarioRepositoryInput,
  ): Promise<ScenarioDetailRecord>;
  deleteCustomScenario?(key: string, userId: string): Promise<boolean>;
}

export interface CreateCustomInterviewScenarioInput {
  userId: string;
  cvBuffer: Buffer;
  cvMimeType: string;
  jobDescription: string;
}

export interface ScenarioService {
  listActive(userId?: string): Promise<PublicScenarioSummary[]>;
  getActiveByKey(
    key: string,
    userId?: string,
  ): Promise<PublicScenarioDetail | null>;
  createCustomInterviewScenario?(
    input: CreateCustomInterviewScenarioInput,
  ): Promise<PublicScenarioDetail>;
  deleteCustomScenario?(key: string, userId: string): Promise<void>;
}

export interface ScenarioServiceOptions {
  ttlMs?: number;
  clock?: () => number;
  aiService?: AiService;
  entitlementService?: EntitlementService;
}

const DEFAULT_SCENARIO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createScenarioService(
  repository: ScenarioRepository,
  options: ScenarioServiceOptions = {},
): ScenarioService {
  const ttlMs = options.ttlMs ?? DEFAULT_SCENARIO_CACHE_TTL_MS;
  const clock = options.clock ?? Date.now;
  const aiService = options.aiService;

  let cachedPublicList: {
    data: PublicScenarioSummary[];
    expiresAt: number;
  } | null = null;
  const cachedPublicDetails = new Map<
    string,
    { detail: PublicScenarioDetail | null; expiresAt: number }
  >();

  return {
    async listActive(userId) {
      const now = clock();
      if (!userId && cachedPublicList && now < cachedPublicList.expiresAt) {
        return cachedPublicList.data;
      }

      const records = await repository.listActive(userId);
      const data: PublicScenarioSummary[] = records.map((record) => ({
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
        ...(record.userId ? { isCustom: true } : {}),
      }));

      if (!userId) {
        cachedPublicList = { data, expiresAt: now + ttlMs };
      }
      return data;
    },

    async getActiveByKey(key, userId) {
      const now = clock();
      if (!userId) {
        const cached = cachedPublicDetails.get(key);
        if (cached && now < cached.expiresAt) {
          return cached.detail;
        }
      }

      const record = await repository.findActiveByKey(key, userId);

      if (!record) {
        if (!userId) {
          cachedPublicDetails.set(key, {
            detail: null,
            expiresAt: now + ttlMs,
          });
        }
        return null;
      }

      const definition = ScenarioDefinitionSchema.parse(record.definition);

      const detail: PublicScenarioDetail = {
        key: record.key,
        version: record.version,
        title: record.title,
        category: record.category,
        summary: record.summary,
        ...(record.userId ? { isCustom: true } : {}),
        context: definition.publicContext,
        availableDifficulties: ["EASY", "MEDIUM", "HARD"],
      };

      if (!userId) {
        cachedPublicDetails.set(key, { detail, expiresAt: now + ttlMs });
      }
      return detail;
    },

    async createCustomInterviewScenario(input) {
      const parsedCv = await parsePdfCvFromBuffer(
        input.cvBuffer,
        input.cvMimeType,
      );

      const trimmedJd = input.jobDescription.trim();
      if (trimmedJd.length < 50 || trimmedJd.length > 20000) {
        throw new ScenarioError(
          "VALIDATION_FAILED",
          "Job description must be between 50 and 20,000 characters.",
        );
      }

      if (!aiService || !aiService.generateCustomScenario) {
        throw new ScenarioError(
          "INTERNAL_ERROR",
          "AI scenario generation service is not configured.",
        );
      }

      const scenarioKey = `custom-interview-${randomUUID()}`;

      try {
        const aiResult = await aiService.generateCustomScenario({
          scenarioKey,
          cvText: parsedCv.text,
          jobDescription: trimmedJd,
        });

        if (!repository.createCustomScenario) {
          throw new ScenarioError(
            "INTERNAL_ERROR",
            "Scenario creation repository is not configured.",
          );
        }

        const record = await repository.createCustomScenario({
          userId: input.userId,
          key: scenarioKey,
          title: aiResult.definition.title,
          summary: aiResult.definition.summary,
          definition: aiResult.definition,
          usage: {
            provider: "openrouter",
            model: aiService.evaluationModel,
            status: "SUCCESS",
            latencyMs: aiResult.latencyMs,
            inputTokens: aiResult.inputTokens,
            outputTokens: aiResult.outputTokens,
            estimatedCost: aiResult.estimatedCost,
            errorCode: null,
          },
        });

        const definition = ScenarioDefinitionSchema.parse(record.definition);

        return {
          key: record.key,
          version: record.version,
          title: record.title,
          category: record.category,
          summary: record.summary,
          isCustom: true,
          context: definition.publicContext,
          availableDifficulties: ["EASY", "MEDIUM", "HARD"],
        };
      } catch (error) {
        if (error instanceof AiProviderError) {
          throw new ScenarioError(error.code);
        }
        if (error instanceof ScenarioError) {
          throw error;
        }
        throw new ScenarioError(
          "AI_PROVIDER_ERROR",
          error instanceof Error ? error.message : undefined,
        );
      }
    },

    async deleteCustomScenario(key: string, userId: string): Promise<void> {
      const record = await repository.findActiveByKey(key, userId);
      if (!record) {
        throw new ScenarioError("NOT_FOUND", "Scenario not found.");
      }

      if (!record.userId || record.userId !== userId) {
        throw new ScenarioError(
          "FORBIDDEN",
          "You do not have permission to delete this scenario.",
        );
      }

      if (!repository.deleteCustomScenario) {
        throw new ScenarioError(
          "INTERNAL_ERROR",
          "Custom scenario deletion is not configured.",
        );
      }

      const deleted = await repository.deleteCustomScenario(key, userId);
      if (!deleted) {
        throw new ScenarioError("NOT_FOUND", "Scenario not found.");
      }

      cachedPublicList = null;
      cachedPublicDetails.delete(key);
    },
  };
}
