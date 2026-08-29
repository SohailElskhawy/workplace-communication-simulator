import type { ProgressResponse } from "@kalemny/contracts";
import type { Express, Request } from "express";

import {
  handleAttemptError,
  resolveLocalUserId,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import type { ProgressService } from "./progress-service.js";

export interface ProgressRouteDependencies {
  progressService: ProgressService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function registerProgressRoutes(
  app: Express,
  dependencies: ProgressRouteDependencies,
): void {
  app.get("/api/v1/progress", async (request, response, next) => {
    try {
      const userId = await resolveLocalUserId(request, response, dependencies);
      if (!userId) return;

      const progressData =
        await dependencies.progressService.getProgress(userId);
      const body: ProgressResponse = { data: progressData };
      response.status(200).json(body);
    } catch (error) {
      if (!handleAttemptError(response, error)) next(error);
    }
  });
}
