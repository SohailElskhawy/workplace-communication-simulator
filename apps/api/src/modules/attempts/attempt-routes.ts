import {
  CreateAttemptRequestSchema,
  CreateTurnRequestSchema,
  type AttemptDetailResponse,
  type CreateAttemptResponse,
  type FinishAttemptResponse,
  type TurnResponse,
} from "@kalemny/contracts";
import type { Express, Request } from "express";
import { z } from "zod";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import type { AttemptService } from "./attempt-service.js";

const AttemptParamsSchema = z.strictObject({ attemptId: z.uuid() });
const TurnParamsSchema = z.strictObject({
  attemptId: z.uuid(),
  turnId: z.uuid(),
});

export interface AttemptRouteDependencies {
  attemptService: AttemptService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function registerAttemptRoutes(
  app: Express,
  dependencies: AttemptRouteDependencies,
): void {
  app.post("/api/v1/attempts", async (request, response, next) => {
    try {
      const userId = await resolveLocalUserId(request, response, dependencies);
      if (!userId) return;

      const parsed = CreateAttemptRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        sendError(
          response,
          400,
          "VALIDATION_FAILED",
          "Request body is invalid.",
        );
        return;
      }

      const body: CreateAttemptResponse = {
        data: await dependencies.attemptService.create(userId, parsed.data),
      };
      response.status(201).json(body);
    } catch (error) {
      if (!handleAttemptError(response, error)) next(error);
    }
  });

  app.get("/api/v1/attempts/:attemptId", async (request, response, next) => {
    try {
      const userId = await resolveLocalUserId(request, response, dependencies);
      if (!userId) return;

      const parsed = AttemptParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        sendError(response, 400, "VALIDATION_FAILED", "Attempt ID is invalid.");
        return;
      }

      const body: AttemptDetailResponse = {
        data: await dependencies.attemptService.getOwned(
          userId,
          parsed.data.attemptId,
        ),
      };
      response.status(200).json(body);
    } catch (error) {
      if (!handleAttemptError(response, error)) next(error);
    }
  });

  app.post(
    "/api/v1/attempts/:attemptId/turns",
    async (request, response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;

        const parsedParams = AttemptParamsSchema.safeParse(request.params);
        const parsedBody = CreateTurnRequestSchema.safeParse(request.body);
        if (!parsedParams.success || !parsedBody.success) {
          sendError(response, 400, "VALIDATION_FAILED", "Request is invalid.");
          return;
        }

        const result = await dependencies.attemptService.createTurn(
          userId,
          parsedParams.data.attemptId,
          parsedBody.data,
        );
        const body: TurnResponse = { data: result.data };
        response.status(result.created ? 201 : 200).json(body);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );

  app.post(
    "/api/v1/attempts/:attemptId/turns/:turnId/retry",
    async (request, response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;

        const parsed = TurnParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          sendError(response, 400, "VALIDATION_FAILED", "Turn ID is invalid.");
          return;
        }

        const body: TurnResponse = {
          data: await dependencies.attemptService.retryTurn(
            userId,
            parsed.data.attemptId,
            parsed.data.turnId,
          ),
        };
        response.status(200).json(body);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );

  app.post(
    "/api/v1/attempts/:attemptId/finish",
    async (request, response, next) => {
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

        const body: FinishAttemptResponse = {
          data: await dependencies.attemptService.finish(
            userId,
            parsed.data.attemptId,
          ),
        };
        response.status(200).json(body);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );
}
