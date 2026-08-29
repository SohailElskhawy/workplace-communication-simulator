import { HistoryQuerySchema } from "@kalemny/contracts";
import type { Express, Request } from "express";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import type { HistoryService } from "./history-service.js";

export interface HistoryRouteDependencies {
  historyService: HistoryService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function registerHistoryRoutes(
  app: Express,
  dependencies: HistoryRouteDependencies,
): void {
  app.get("/api/v1/history", async (request, response, next) => {
    try {
      const userId = await resolveLocalUserId(request, response, dependencies);
      if (!userId) return;

      const parsedQuery = HistoryQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        sendError(
          response,
          400,
          "VALIDATION_FAILED",
          "Query parameters are invalid.",
        );
        return;
      }

      const history = await dependencies.historyService.getHistory(
        userId,
        parsedQuery.data,
      );
      response.status(200).json(history);
    } catch (error) {
      if (!handleAttemptError(response, error)) next(error);
    }
  });
}
