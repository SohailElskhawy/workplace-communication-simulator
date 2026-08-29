import { type EvaluationResponse } from "@kalemny/contracts";
import type { Express, Request } from "express";
import { z } from "zod";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import type { EvaluationService } from "./evaluation-service.js";

const AttemptParamsSchema = z.strictObject({ attemptId: z.uuid() });

export interface EvaluationRouteDependencies {
  evaluationService: EvaluationService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function registerEvaluationRoutes(
  app: Express,
  dependencies: EvaluationRouteDependencies,
): void {
  app.post(
    "/api/v1/attempts/:attemptId/evaluation",
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

        const data = await dependencies.evaluationService.evaluate(
          userId,
          parsed.data.attemptId,
        );
        const body: EvaluationResponse = { data };
        response.status(200).json(body);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );
}
