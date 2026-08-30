import type {
  AttemptComparison,
  AttemptDetailResponse,
  AttemptStatus,
  ConversationTurn,
  CreateAttemptRequest,
  CreateAttemptResponse,
  CreateTurnRequest,
  Difficulty,
  EvaluationData,
  FinishAttemptResponse,
  InputMethod,
  TurnStatus,
} from "@kalemny/contracts";

import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";
import {
  resolveScenarioVariation,
  selectScenarioVariation,
} from "../scenarios/scenario-variation.js";
import { AttemptError, type AttemptErrorCode } from "./attempt-errors.js";
import { ATTEMPT_DURATION_MS } from "./attempt-rules.js";

export interface AttemptScenarioRecord {
  id: string;
  key: string;
  version: number;
  title: string;
  definition: unknown;
}

export interface ConversationTurnRecord {
  id: string;
  sequence: number;
  clientRequestId: string;
  inputMethod: InputMethod;
  userText: string;
  assistantText: string | null;
  status: TurnStatus;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  difficulty: Difficulty;
  status: AttemptStatus;
  retryOfAttemptId: string | null;
  variationId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  expiresAt: Date;
  evaluationStartedAt: Date | null;
  scenario: AttemptScenarioRecord;
  turns: ConversationTurnRecord[];
  evaluation: EvaluationData | null;
  comparison: AttemptComparison | null;
}

export interface CreateAttemptRepositoryInput {
  userId: string;
  scenarioKey: string;
  difficulty: Difficulty;
  retryOfAttemptId: string | null;
  startedAt: Date;
  /**
   * Chooses the variation id to persist for the new attempt. Receives the
   * active scenario definition (unparsed) and the retry source's variation id
   * to exclude, so retries use a different variation when possible.
   */
  selectVariationId: (
    definition: unknown,
    excludeVariationId: string | null,
  ) => string | null;
  expiresAt: Date;
}

export type CreateAttemptRepositoryResult =
  { kind: "created"; attempt: AttemptRecord } | { kind: "not_found" };

export interface CreateTurnRepositoryInput {
  attemptId: string;
  userId: string;
  clientRequestId: string;
  text: string;
  inputMethod: InputMethod;
  currentTime: Date;
}

export type CreateTurnRepositoryResult =
  | { kind: "created" | "existing"; turn: ConversationTurnRecord }
  | { kind: "not_found" }
  | { kind: "rejected"; code: AttemptErrorCode };

export interface AiUsageRecordInput {
  provider: "openrouter";
  model: string;
  status: "SUCCESS" | "FAILED";
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  errorCode: "AI_TIMEOUT" | "AI_PROVIDER_ERROR" | null;
}

export interface FinalizeRoleplayTurnInput {
  attemptId: string;
  userId: string;
  turnId: string;
  assistantText: string | null;
  turnStatus: "COMPLETED" | "FAILED";
  completedAt: Date | null;
  usage: AiUsageRecordInput;
}

export type FinalizeRoleplayTurnRepositoryResult =
  { kind: "updated"; turn: ConversationTurnRecord } | { kind: "not_found" };

export type RetryTurnRepositoryResult =
  | { kind: "ready"; turn: ConversationTurnRecord }
  | { kind: "not_found" }
  | { kind: "rejected"; code: AttemptErrorCode };

export type FinishAttemptRepositoryResult =
  | { kind: "finished"; id: string; status: AttemptStatus }
  | { kind: "not_found" }
  | { kind: "rejected"; code: AttemptErrorCode };

export interface RoleplayContextTurn {
  sequence: number;
  userText: string;
  assistantText: string;
}

export interface RoleplayContextRecord {
  difficulty: Difficulty;
  variationId: string | null;
  scenarioDefinition: unknown;
  previousTurns: RoleplayContextTurn[];
}

export interface FindRoleplayContextInput {
  attemptId: string;
  userId: string;
  beforeSequence: number;
}

export interface AttemptRepository {
  createAttempt(
    input: CreateAttemptRepositoryInput,
  ): Promise<CreateAttemptRepositoryResult>;
  findOwnedAttempt(
    attemptId: string,
    userId: string,
  ): Promise<AttemptRecord | null>;
  /**
   * Loads only the data required to build the roleplay prompt for the next
   * turn: difficulty, variation, scenario definition, and completed turns
   * before `beforeSequence`. Avoids loading the full attempt aggregate
   * (evaluation, comparison, every turn) on each conversation turn.
   */
  findRoleplayContext(
    input: FindRoleplayContextInput,
  ): Promise<RoleplayContextRecord | null>;
  createTurn(
    input: CreateTurnRepositoryInput,
  ): Promise<CreateTurnRepositoryResult>;
  prepareFailedTurnRetry(
    attemptId: string,
    userId: string,
    turnId: string,
  ): Promise<RetryTurnRepositoryResult>;
  finalizeRoleplayTurn(
    input: FinalizeRoleplayTurnInput,
  ): Promise<FinalizeRoleplayTurnRepositoryResult>;
  finishAttempt(
    attemptId: string,
    userId: string,
    currentTime: Date,
  ): Promise<FinishAttemptRepositoryResult>;
  deleteAttempt(attemptId: string, userId: string): Promise<boolean>;
}

export interface CreatedTurnResult {
  data: ConversationTurn;
  created: boolean;
}

export interface AttemptService {
  create(
    userId: string,
    request: CreateAttemptRequest,
  ): Promise<CreateAttemptResponse["data"]>;
  getOwned(
    userId: string,
    attemptId: string,
  ): Promise<AttemptDetailResponse["data"]>;
  getComparison(
    userId: string,
    attemptId: string,
  ): Promise<AttemptComparison | null>;
  createTurn(
    userId: string,
    attemptId: string,
    request: CreateTurnRequest,
  ): Promise<CreatedTurnResult>;
  retryTurn(
    userId: string,
    attemptId: string,
    turnId: string,
  ): Promise<ConversationTurn>;
  finish(
    userId: string,
    attemptId: string,
  ): Promise<FinishAttemptResponse["data"]>;
  delete(userId: string, attemptId: string): Promise<void>;
}

function mapScenario(
  scenario: AttemptScenarioRecord,
  variationId: string | null,
) {
  let openingMessage: string | undefined;
  const parsed = ScenarioDefinitionSchema.safeParse(scenario.definition);
  if (parsed.success) {
    const variation = resolveScenarioVariation(parsed.data, variationId);
    openingMessage = variation?.openingMessage ?? parsed.data.openingMessage;
  }
  return {
    key: scenario.key,
    version: scenario.version,
    title: scenario.title,
    ...(openingMessage ? { openingMessage } : {}),
  };
}

function mapTurn(turn: ConversationTurnRecord): ConversationTurn {
  return {
    id: turn.id,
    sequence: turn.sequence,
    inputMethod: turn.inputMethod,
    userText: turn.userText,
    assistantText: turn.assistantText,
    status: turn.status,
    createdAt: turn.createdAt.toISOString(),
    completedAt: turn.completedAt?.toISOString() ?? null,
  };
}

function mapAttempt(attempt: AttemptRecord): AttemptDetailResponse["data"] {
  return {
    id: attempt.id,
    status: attempt.status,
    difficulty: attempt.difficulty,
    scenario: mapScenario(attempt.scenario, attempt.variationId),
    retryOfAttemptId: attempt.retryOfAttemptId,
    turns: attempt.turns.map(mapTurn),
    evaluation: attempt.evaluation,
    comparison: attempt.comparison,
    startedAt: attempt.startedAt.toISOString(),
    endedAt: attempt.endedAt?.toISOString() ?? null,
    expiresAt: attempt.expiresAt.toISOString(),
  };
}

export function createAttemptService(
  repository: AttemptRepository,
  aiService: AiService,
  clock: () => Date = () => new Date(),
  random: () => number = Math.random,
): AttemptService {
  async function generateRoleplayReply(
    userId: string,
    attemptId: string,
    turn: ConversationTurnRecord,
  ): Promise<ConversationTurn> {
    const context = await repository.findRoleplayContext({
      attemptId,
      userId,
      beforeSequence: turn.sequence,
    });
    if (!context) throw new AttemptError("NOT_FOUND");

    const scenario = ScenarioDefinitionSchema.parse(
      context.scenarioDefinition,
    );
    const variation = resolveScenarioVariation(scenario, context.variationId);

    try {
      const reply = await aiService.generateRoleplayReply({
        scenario,
        difficulty: context.difficulty,
        previousTurns: context.previousTurns,
        latestLearnerMessage: turn.userText,
        variation,
      });
      const finalized = await repository.finalizeRoleplayTurn({
        attemptId,
        userId,
        turnId: turn.id,
        assistantText: reply.text,
        turnStatus: "COMPLETED",
        completedAt: clock(),
        usage: {
          provider: "openrouter",
          model: aiService.roleplayModel,
          status: "SUCCESS",
          latencyMs: reply.latencyMs,
          inputTokens: reply.inputTokens,
          outputTokens: reply.outputTokens,
          estimatedCost: reply.estimatedCost,
          errorCode: null,
        },
      });

      if (finalized.kind === "not_found") throw new AttemptError("NOT_FOUND");
      return mapTurn(finalized.turn);
    } catch (error) {
      if (!(error instanceof AiProviderError)) throw error;

      const finalized = await repository.finalizeRoleplayTurn({
        attemptId,
        userId,
        turnId: turn.id,
        assistantText: null,
        turnStatus: "FAILED",
        completedAt: null,
        usage: {
          provider: "openrouter",
          model: aiService.roleplayModel,
          status: "FAILED",
          latencyMs: error.latencyMs,
          inputTokens: null,
          outputTokens: null,
          estimatedCost: null,
          errorCode: error.code,
        },
      });

      if (finalized.kind === "not_found") throw new AttemptError("NOT_FOUND");
      throw new AttemptError(error.code);
    }
  }

  return {
    async create(userId, request) {
      const startedAt = clock();
      const result = await repository.createAttempt({
        userId,
        scenarioKey: request.scenarioKey,
        difficulty: request.difficulty,
        retryOfAttemptId: request.retryOfAttemptId,
        startedAt,
        expiresAt: new Date(startedAt.getTime() + ATTEMPT_DURATION_MS),
        selectVariationId: (definition, excludeVariationId) => {
          const parsed = ScenarioDefinitionSchema.safeParse(definition);
          if (!parsed.success) {
            return null;
          }
          return (
            selectScenarioVariation(parsed.data, {
              excludeVariationId,
              random,
            })?.id ?? null
          );
        },
      });

      if (result.kind === "not_found") {
        throw new AttemptError("NOT_FOUND");
      }

      const attempt = result.attempt;
      const definition = ScenarioDefinitionSchema.parse(
        attempt.scenario.definition,
      );
      const variation = resolveScenarioVariation(
        definition,
        attempt.variationId,
      );

      return {
        id: attempt.id,
        status: "ACTIVE",
        difficulty: attempt.difficulty,
        scenario: mapScenario(attempt.scenario, attempt.variationId),
        openingMessage: variation?.openingMessage ?? definition.openingMessage,
        startedAt: attempt.startedAt.toISOString(),
        expiresAt: attempt.expiresAt.toISOString(),
      };
    },

    async getOwned(userId, attemptId) {
      const attempt = await repository.findOwnedAttempt(attemptId, userId);

      if (!attempt) {
        throw new AttemptError("NOT_FOUND");
      }

      return mapAttempt(attempt);
    },

    async getComparison(userId, attemptId) {
      const attempt = await repository.findOwnedAttempt(attemptId, userId);

      if (!attempt) {
        throw new AttemptError("NOT_FOUND");
      }

      return attempt.comparison ?? null;
    },

    async createTurn(userId, attemptId, request) {
      const result = await repository.createTurn({
        attemptId,
        userId,
        clientRequestId: request.clientRequestId.trim(),
        text: request.text.trim(),
        inputMethod: request.inputMethod,
        currentTime: clock(),
      });

      if (result.kind === "not_found") {
        throw new AttemptError("NOT_FOUND");
      }

      if (result.kind === "rejected") {
        throw new AttemptError(result.code);
      }

      if (result.kind === "existing") {
        return { data: mapTurn(result.turn), created: false };
      }

      return {
        data: await generateRoleplayReply(userId, attemptId, result.turn),
        created: true,
      };
    },

    async retryTurn(userId, attemptId, turnId) {
      const result = await repository.prepareFailedTurnRetry(
        attemptId,
        userId,
        turnId,
      );

      if (result.kind === "not_found") throw new AttemptError("NOT_FOUND");
      if (result.kind === "rejected") throw new AttemptError(result.code);
      return generateRoleplayReply(userId, attemptId, result.turn);
    },

    async finish(userId, attemptId) {
      const result = await repository.finishAttempt(attemptId, userId, clock());

      if (result.kind === "not_found") {
        throw new AttemptError("NOT_FOUND");
      }

      if (result.kind === "rejected") {
        throw new AttemptError(result.code);
      }

      return { id: result.id, status: result.status };
    },

    async delete(userId, attemptId) {
      const deleted = await repository.deleteAttempt(attemptId, userId);
      if (!deleted) {
        throw new AttemptError("NOT_FOUND");
      }
    },
  };
}
