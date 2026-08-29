import type { Difficulty } from "@kalemny/contracts";

import type { ScenarioDefinition } from "../scenarios/scenario-definition.js";
import type {
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

export interface AiService {
  readonly roleplayModel: string;
  generateRoleplayReply(
    input: GenerateRoleplayReplyInput,
  ): Promise<OpenRouterRoleplayResult>;
}

interface AiServiceOptions {
  provider: OpenRouterProvider;
  roleplayModel: string;
  roleplayPromptVersion: typeof ROLEPLAY_PROMPT_VERSION;
  roleplayTimeoutMs: number;
}

export function createAiService(options: AiServiceOptions): AiService {
  return {
    roleplayModel: options.roleplayModel,
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
  };
}
