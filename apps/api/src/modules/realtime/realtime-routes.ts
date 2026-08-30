import type { RealtimeSessionResponse } from "@kalemny/contracts";
import type { Express, Request, Response } from "express";
import { z } from "zod";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import { secretsMatch } from "./realtime-context-token.js";
import type { RealtimeVoiceService } from "./realtime-service.js";

const AttemptParamsSchema = z.strictObject({ attemptId: z.uuid() });

const TOOL_SECRET_HEADER = "x-kalemny-tool-secret";
const CONTEXT_TOKEN_HEADER = "x-kalemny-context-token";

export interface RealtimeRouteDependencies {
  realtimeVoiceService: RealtimeVoiceService;
  /** Server-only shared secret required on the ElevenLabs context endpoint. */
  elevenLabsToolSecret: string;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function registerRealtimeVoiceRoutes(
  app: Express,
  dependencies: RealtimeRouteDependencies,
): void {
  app.post(
    "/api/v1/attempts/:attemptId/realtime-session",
    async (request: Request, response: Response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;

        const parsed = AttemptParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Attempt ID is invalid.",
          );
          return;
        }

        const session = await dependencies.realtimeVoiceService.createSession(
          userId,
          parsed.data.attemptId,
        );
        const body: RealtimeSessionResponse = { data: session };
        response.status(200).json(body);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );

  /**
   * ElevenLabs-agent-only endpoint. Protected by the shared tool secret plus
   * a short-lived signed context token bound to the attempt and user. It is
   * intentionally not Clerk-authenticated: the caller is the voice agent,
   * not the browser.
   */
  app.post(
    "/api/v1/realtime/scenario-context",
    async (request: Request, response: Response, next) => {
      try {
        const toolSecret = request.header(TOOL_SECRET_HEADER);
        if (
          !toolSecret ||
          !secretsMatch(toolSecret, dependencies.elevenLabsToolSecret)
        ) {
          sendError(
            response,
            401,
            "UNAUTHENTICATED",
            "Authentication is required.",
          );
          return;
        }

        const contextToken = request.header(CONTEXT_TOKEN_HEADER);
        if (!contextToken) {
          sendError(response, 404, "NOT_FOUND", "Resource not found.");
          return;
        }

        const context =
          await dependencies.realtimeVoiceService.resolveScenarioContext(
            contextToken,
          );
        if (!context) {
          sendError(response, 404, "NOT_FOUND", "Resource not found.");
          return;
        }

        response.status(200).json({ data: context });
      } catch (error) {
        next(error);
      }
    },
  );
}
