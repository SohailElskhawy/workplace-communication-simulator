import {
  BindRealtimeConversationRequestSchema,
  type BindRealtimeConversationResponse,
  type RealtimeSessionResponse,
} from "@kalemny/contracts";
import type { Express, Request, Response } from "express";
import { z } from "zod";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import { secretsMatch } from "./realtime-context-token.js";
import {
  ElevenLabsPostCallTranscriptionSchema,
  verifyElevenLabsWebhookSignature,
} from "./elevenlabs-webhook.js";
import type { RealtimeVoiceService } from "./realtime-service.js";
import type { RealtimeTranscriptService } from "./realtime-transcript-service.js";

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

export interface ElevenLabsWebhookRouteDependencies {
  agentId: string;
  transcriptService: RealtimeTranscriptService;
  webhookSecret: string;
  clock?: () => Date;
}

/** Provider callback, registered before JSON parsing and Clerk middleware. */
export function registerElevenLabsWebhookRoute(
  app: Express,
  dependencies: ElevenLabsWebhookRouteDependencies,
): void {
  const clock = dependencies.clock ?? (() => new Date());
  app.post("/api/v1/webhooks/elevenlabs", async (request, response, next) => {
    try {
      const rawBody = request.body;
      if (
        !Buffer.isBuffer(rawBody) ||
        !verifyElevenLabsWebhookSignature({
          rawBody,
          signatureHeader: request.header("ElevenLabs-Signature") ?? undefined,
          secret: dependencies.webhookSecret,
          currentTime: clock(),
        })
      ) {
        response.status(401).json({ error: "Invalid webhook signature." });
        return;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody.toString("utf8"));
      } catch {
        response.status(400).json({ error: "Invalid webhook payload." });
        return;
      }
      const parsed =
        ElevenLabsPostCallTranscriptionSchema.safeParse(parsedJson);
      if (!parsed.success) {
        response.status(400).json({ error: "Invalid webhook payload." });
        return;
      }
      if (parsed.data.data.agent_id !== dependencies.agentId) {
        response.status(204).end();
        return;
      }
      await dependencies.transcriptService.importPostCallTranscription(
        parsed.data,
      );
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
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

  app.post(
    "/api/v1/attempts/:attemptId/realtime-conversation",
    async (request: Request, response: Response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;

        const parsedParams = AttemptParamsSchema.safeParse(request.params);
        const parsedBody = BindRealtimeConversationRequestSchema.safeParse(
          request.body,
        );
        if (!parsedParams.success || !parsedBody.success) {
          sendError(response, 400, "VALIDATION_FAILED", "Request is invalid.");
          return;
        }

        await dependencies.realtimeVoiceService.bindConversation(
          userId,
          parsedParams.data.attemptId,
          parsedBody.data.conversationId,
        );
        const body: BindRealtimeConversationResponse = {
          data: {
            attemptId: parsedParams.data.attemptId,
            conversationId: parsedBody.data.conversationId,
          },
        };
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
