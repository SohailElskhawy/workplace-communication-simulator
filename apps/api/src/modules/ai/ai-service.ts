import type { Difficulty } from "@kalemny/contracts";

import type { ScenarioDefinition } from "../scenarios/scenario-definition.js";
import {
  buildEvaluationMessages,
  EVALUATION_PROMPT_VERSION,
  type EvaluationTranscriptTurn,
} from "./evaluation-prompt.js";
import type {
  OpenRouterEvaluationResult,
  OpenRouterRoleplayResult,
  OpenRouterProvider,
} from "./openrouter-provider.js";
import {
  buildRoleplayMessages,
  ROLEPLAY_PROMPT_VERSION,
  type RoleplayTranscriptTurn,
} from "./roleplay-prompt.js";

export interface GenerateRoleplayReplyInput {
  scenario: ScenarioDefinition;
  difficulty: Difficulty;
  previousTurns: RoleplayTranscriptTurn[];
  latestLearnerMessage: string;
}

export interface EvaluateSimulationInput {
  scenario: ScenarioDefinition;
  difficulty: Difficulty;
  turns: EvaluationTranscriptTurn[];
}

export interface AiService {
  readonly roleplayModel: string;
  readonly evaluationModel: string;
  generateRoleplayReply(
    input: GenerateRoleplayReplyInput,
  ): Promise<OpenRouterRoleplayResult>;
  evaluateSimulation(
    input: EvaluateSimulationInput,
  ): Promise<OpenRouterEvaluationResult>;
}

export interface AiServiceOptions {
  provider: OpenRouterProvider;
  roleplayModel: string;
  roleplayPromptVersion: typeof ROLEPLAY_PROMPT_VERSION;
  roleplayTimeoutMs: number;
  evaluationModel: string;
  evaluationPromptVersion: typeof EVALUATION_PROMPT_VERSION;
  evaluationTimeoutMs: number;
}

export function createAiService(options: AiServiceOptions): AiService {
  return {
    roleplayModel: options.roleplayModel,
    evaluationModel: options.evaluationModel,
    generateRoleplayReply(input) {
      if (options.roleplayPromptVersion !== ROLEPLAY_PROMPT_VERSION) {
        throw new Error("Unsupported roleplay prompt version.");
      }

      return options.provider.generateRoleplayReply({
        model: options.roleplayModel,
        messages: buildRoleplayMessages(input),
        timeoutMs: options.roleplayTimeoutMs,
      });
    },
    evaluateSimulation(input) {
      if (options.evaluationPromptVersion !== EVALUATION_PROMPT_VERSION) {
        throw new Error("Unsupported evaluation prompt version.");
      }

      return options.provider.evaluateSimulation({
        model: options.evaluationModel,
        messages: buildEvaluationMessages(input),
        timeoutMs: options.evaluationTimeoutMs,
      });
    },
  };
}
