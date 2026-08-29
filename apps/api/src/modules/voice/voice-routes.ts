import type { TranscriptionResponse } from "@kalemny/contracts";
import type { Express, Request, Response, RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import {
  handleAttemptError,
  resolveLocalUserId,
  sendError,
} from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import { VoiceValidationError, type VoiceService } from "./voice-service.js";

const AttemptParamsSchema = z.strictObject({ attemptId: z.uuid() });

export interface VoiceRouteDependencies {
  voiceService: VoiceService;
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 1,
  },
});

const uploadMiddleware: RequestHandler = (request, response, next) => {
  memoryUpload.fields([
    { name: "audio", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ])(request, response, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        sendError(
          response,
          413,
          "VALIDATION_FAILED",
          "Audio file exceeds maximum allowed size of 25MB.",
        );
        return;
      }
      sendError(
        response,
        400,
        "VALIDATION_FAILED",
        "Failed to process uploaded audio file.",
      );
      return;
    }
    next();
  });
};

export function registerVoiceRoutes(
  app: Express,
  dependencies: VoiceRouteDependencies,
): void {
  app.post(
    "/api/v1/attempts/:attemptId/transcriptions",
    uploadMiddleware,
    async (request: Request, response: Response, next) => {
      try {
        const userId = await resolveLocalUserId(
          request,
          response,
          dependencies,
        );
        if (!userId) return;

        const parsedParams = AttemptParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Attempt ID is invalid.",
          );
          return;
        }

        const files = request.files as
          { [fieldname: string]: Express.Multer.File[] } | undefined;
        const uploadedFile =
          request.file ?? files?.audio?.[0] ?? files?.file?.[0];

        if (!uploadedFile) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Audio file is required.",
          );
          return;
        }

        let durationMs: number | null = null;
        if (request.body && typeof request.body === "object") {
          const rawDuration =
            request.body.durationMs ??
            (request.body.durationSeconds != null
              ? Number(request.body.durationSeconds) * 1000
              : null);
          if (rawDuration != null) {
            const num = Number(rawDuration);
            if (!Number.isNaN(num) && num >= 0) {
              durationMs = num;
            }
          }
        }

        const result = await dependencies.voiceService.transcribe({
          userId,
          attemptId: parsedParams.data.attemptId,
          audio: {
            buffer: uploadedFile.buffer,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size,
            fileName: uploadedFile.originalname,
            durationMs,
          },
        });

        const body: TranscriptionResponse = {
          data: {
            transcript: result.transcript,
          },
        };

        response.status(200).json(body);
      } catch (error) {
        if (error instanceof VoiceValidationError) {
          sendError(response, error.status, error.code, error.message);
          return;
        }
        if (!handleAttemptError(response, error)) next(error);
      }
    },
  );
}
