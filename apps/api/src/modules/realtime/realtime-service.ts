import type { Difficulty } from "@kalemny/contracts";

import { buildRoleplaySystemPrompt } from "../ai/roleplay-prompt.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import type { AttemptRepository } from "../attempts/attempt-service.js";
import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";
import { resolveScenarioVariation } from "../scenarios/scenario-variation.js";
import type { ElevenLabsProvider } from "./elevenlabs-provider.js";
import {
  signContextToken,
  verifyContextToken,
} from "./realtime-context-token.js";

/**
 * Default timeout for the ElevenLabs conversation-token request. Kept local
 * to the realtime bootstrap; it is an infrastructure credential call, not a
 * model call, so it stays well under the roleplay timeout.
 */
export const ELEVENLABS_TOKEN_TIMEOUT_MS = 10_000;

export interface RealtimeSessionData {
  attemptId: string;
  agentId: string;
  /** Short-lived ElevenLabs WebRTC conversation token for the browser. */
  conversationToken: string;
  /** Short-lived signed token the ElevenLabs agent exchanges for context. */
  contextToken: string;
  contextTokenExpiresAt: string;
  scenario: {
    key: string;
    version: number;
    title: string;
  };
  difficulty: Difficulty;
  openingMessage: string;
  expiresAt: string;
}

/**
 * Hidden realtime roleplay context returned only to the ElevenLabs agent
 * through the tool-secret-protected context endpoint. Never returned to the
 * browser.
 */
export interface RealtimeScenarioContext {
  attemptId: string;
  userId: string;
  difficulty: Difficulty;
  scenario: {
    key: string;
    version: number;
  };
  systemPrompt: string;
  openingMessage: string;
}

export interface RealtimeVoiceService {
  createSession(
    userId: string,
    attemptId: string,
  ): Promise<RealtimeSessionData>;
  bindConversation(
    userId: string,
    attemptId: string,
    conversationId: string,
  ): Promise<void>;
  resolveScenarioContext(
    contextToken: string,
  ): Promise<RealtimeScenarioContext | null>;
}

export interface RealtimeVoiceServiceOptions {
  repository: Pick<
    AttemptRepository,
    "findOwnedAttempt" | "bindRealtimeConversation"
  >;
  elevenLabsProvider: ElevenLabsProvider;
  /** Server-only secret used to sign context tokens. */
  contextTokenSecret: string;
  agentId: string;
  clock?: () => Date;
}

/**
 * Resolves the attempt's stored variation, difficulty, and scenario version
 * server-side and builds the hidden roleplay context. Never selects a new
 * variation: the attempt's persisted `variationId` is authoritative.
 */
function resolveAttemptContext(attempt: {
  difficulty: Difficulty;
  variationId: string | null;
  scenario: { key: string; version: number; definition: unknown };
}) {
  const definition = ScenarioDefinitionSchema.parse(
    attempt.scenario.definition,
  );
  const variation = resolveScenarioVariation(definition, attempt.variationId);
  return {
    definition,
    variation,
    systemPrompt: buildRoleplaySystemPrompt({
      scenario: definition,
      difficulty: attempt.difficulty,
      variation,
    }),
    openingMessage: variation?.openingMessage ?? definition.openingMessage,
  };
}

export function createRealtimeVoiceService(
  options: RealtimeVoiceServiceOptions,
): RealtimeVoiceService {
  const clock = options.clock ?? (() => new Date());

  return {
    async createSession(userId, attemptId) {
      const attempt = await options.repository.findOwnedAttempt(
        attemptId,
        userId,
      );
      if (!attempt) {
        throw new AttemptError("NOT_FOUND");
      }
      if (attempt.status !== "ACTIVE") {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }
      if (clock().getTime() >= attempt.expiresAt.getTime()) {
        throw new AttemptError("SESSION_LIMIT_REACHED");
      }

      const context = resolveAttemptContext(attempt);

      let conversationToken: string;
      try {
        const result = await options.elevenLabsProvider.issueConversationToken({
          timeoutMs: ELEVENLABS_TOKEN_TIMEOUT_MS,
        });
        conversationToken = result.token;
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error.code === "AI_TIMEOUT" || error.code === "AI_PROVIDER_ERROR")
        ) {
          throw new AttemptError(error.code);
        }
        throw new AttemptError("AI_PROVIDER_ERROR");
      }

      const { token, expiresAt } = signContextToken({
        secret: options.contextTokenSecret,
        attemptId: attempt.id,
        userId,
        currentTime: clock(),
      });

      return {
        attemptId: attempt.id,
        agentId: options.agentId,
        conversationToken,
        contextToken: token,
        contextTokenExpiresAt: expiresAt.toISOString(),
        scenario: {
          key: attempt.scenario.key,
          version: attempt.scenario.version,
          title: attempt.scenario.title,
        },
        difficulty: attempt.difficulty,
        openingMessage: context.openingMessage,
        expiresAt: attempt.expiresAt.toISOString(),
      };
    },

    async bindConversation(userId, attemptId, conversationId) {
      const result = await options.repository.bindRealtimeConversation(
        attemptId,
        userId,
        conversationId,
        clock(),
      );
      if (result === "not_found") throw new AttemptError("NOT_FOUND");
      if (result === "invalid_state") {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }
      if (result === "expired") throw new AttemptError("SESSION_LIMIT_REACHED");
    },

    async resolveScenarioContext(contextToken) {
      const verified = verifyContextToken({
        secret: options.contextTokenSecret,
        token: contextToken,
        currentTime: clock(),
      });
      if (!verified) {
        return null;
      }

      const attempt = await options.repository.findOwnedAttempt(
        verified.attemptId,
        verified.userId,
      );
      if (!attempt) {
        return null;
      }

      const context = resolveAttemptContext(attempt);
      return {
        attemptId: attempt.id,
        userId: verified.userId,
        difficulty: attempt.difficulty,
        scenario: {
          key: attempt.scenario.key,
          version: attempt.scenario.version,
        },
        systemPrompt: context.systemPrompt,
        openingMessage: context.openingMessage,
      };
    },
  };
}
