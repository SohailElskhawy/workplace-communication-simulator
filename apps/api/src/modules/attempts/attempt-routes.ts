import {
  CreateAttemptRequestSchema,
  CreateTurnRequestSchema,
  type ApiErrorResponse,
  type AttemptDetailResponse,
  type CreateAttemptResponse,
  type FinishAttemptResponse,
  type TurnResponse,
} from "@kalemny/contracts";
import type { Express, Request, Response } from "express";
import { z } from "zod";

import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import { AttemptError } from "./attempt-errors.js";
import type { AttemptService } from "./attempt-service.js";

const AttemptParamsSchema = z.strictObject({ attemptId: z.uuid() });

export interface AttemptRouteDependencies {
  attemptService: AttemptService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      requestId: response.locals.requestId as string,
    },
  };
  response.status(status).json(body);
}

async function resolveLocalUserId(
  request: Request,
  response: Response,
  dependencies: AttemptRouteDependencies,
): Promise<string | null> {
  const authProviderUserId = dependencies.resolveAuthProviderUserId(request);

  if (!authProviderUserId) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication is required.");
    return null;
  }

  const user =
    await dependencies.userProvisioner.ensureUser(authProviderUserId);
  return user.id;
}

function handleAttemptError(response: Response, error: unknown): boolean {
  if (!(error instanceof AttemptError)) {
    return false;
  }

  sendError(response, error.status, error.code, error.message);
  return true;
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
