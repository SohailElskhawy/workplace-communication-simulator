import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import type { TtsService } from "./tts-service.js";

const ParamsSchema = z.strictObject({
  attemptId: z.uuid(),
  turnId: z.union([z.uuid(), z.literal("opening")]),
});
export interface TtsRouteDependencies {
  ttsService: TtsService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}
export function registerTtsRoutes(
  app: Express,
  dependencies: TtsRouteDependencies,
): void {
  app.post(
    "/api/v1/attempts/:attemptId/turns/:turnId/speech",
    async (request: Request, response: Response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;
        const params = ParamsSchema.safeParse(request.params);
        if (!params.success) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Attempt or turn ID is invalid.",
          );
          return;
        }
        const result = await dependencies.ttsService.generate(
          userId,
          params.data.attemptId,
          params.data.turnId,
        );
        response.setHeader("Content-Type", result.contentType);
        response.setHeader("Cache-Control", "no-store");
        response.status(200).send(result.audio);
      } catch (error) {
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );
}
