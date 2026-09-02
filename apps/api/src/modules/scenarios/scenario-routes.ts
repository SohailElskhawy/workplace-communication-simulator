import type {
  CreateCustomScenarioResponse,
  ScenarioDetailResponse,
  ScenarioListResponse,
} from "@kalemny/contracts";
import type { Express, Request } from "express";
import multer from "multer";
import { z } from "zod";

import { resolveLocalUserId, sendError } from "../common/route-helpers.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";
import { CvParserError, MAX_CV_FILE_SIZE_BYTES } from "./cv-parser.js";
import { ScenarioError } from "./scenario-errors.js";
import type { ScenarioService } from "./scenario-service.js";

const ScenarioParamsSchema = z.strictObject({
  scenarioKey: z.string().trim().min(1),
});

export interface ScenarioRouteDependencies {
  scenarioService: ScenarioService;
  resolveAuthProviderUserId?(request: Request): string | null;
  userProvisioner?: LocalUserProvisioner;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CV_FILE_SIZE_BYTES,
    files: 1,
  },
});

export function registerScenarioRoutes(
  app: Express,
  dependencies: ScenarioRouteDependencies | ScenarioService,
): void {
  const scenarioService =
    "scenarioService" in dependencies
      ? dependencies.scenarioService
      : dependencies;

  const resolveUserId = async (
    request: Request,
  ): Promise<string | undefined> => {
    if (
      "resolveAuthProviderUserId" in dependencies &&
      dependencies.resolveAuthProviderUserId &&
      dependencies.userProvisioner
    ) {
      const authProviderUserId =
        dependencies.resolveAuthProviderUserId(request);
      if (authProviderUserId) {
        const user =
          await dependencies.userProvisioner.ensureUser(authProviderUserId);
        return user.id;
      }
    }
    return undefined;
  };

  app.get("/api/v1/scenarios", async (request, response, next) => {
    try {
      const userId = await resolveUserId(request);
      const body: ScenarioListResponse = {
        data: await scenarioService.listActive(userId),
      };

      response.status(200).json(body);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/scenarios/:scenarioKey", async (request, response, next) => {
    try {
      const parsed = ScenarioParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        sendError(
          response,
          400,
          "VALIDATION_FAILED",
          "Scenario key is invalid.",
        );
        return;
      }

      const userId = await resolveUserId(request);
      const scenario = await scenarioService.getActiveByKey(
        parsed.data.scenarioKey,
        userId,
      );

      if (!scenario) {
        sendError(response, 404, "NOT_FOUND", "Scenario not found.");
        return;
      }

      const body: ScenarioDetailResponse = { data: scenario };
      response.status(200).json(body);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/v1/scenarios/custom",
    (request, response, next) => {
      upload.single("cv")(request, response, (error) => {
        if (error) {
          if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
              sendError(
                response,
                400,
                "VALIDATION_FAILED",
                "CV file exceeds the 5MB size limit.",
              );
              return;
            }
          }
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Failed to process uploaded CV file.",
          );
          return;
        }
        next();
      });
    },
    async (request, response, next) => {
      try {
        if (
          !("resolveAuthProviderUserId" in dependencies) ||
          !dependencies.resolveAuthProviderUserId ||
          !dependencies.userProvisioner
        ) {
          sendError(
            response,
            401,
            "UNAUTHENTICATED",
            "Authentication is required.",
          );
          return;
        }

        const userId = await resolveLocalUserId(request, response, {
          resolveAuthProviderUserId: dependencies.resolveAuthProviderUserId,
          userProvisioner: dependencies.userProvisioner,
        });
        if (!userId) return;

        if (!request.file) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "CV PDF file is required.",
          );
          return;
        }

        const rawJobDescription = request.body.jobDescription;
        if (
          typeof rawJobDescription !== "string" ||
          rawJobDescription.trim().length < 50 ||
          rawJobDescription.trim().length > 20000
        ) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Job description must be between 50 and 20,000 characters.",
          );
          return;
        }

        if (!scenarioService.createCustomInterviewScenario) {
          sendError(
            response,
            500,
            "INTERNAL_ERROR",
            "Custom scenario creation is not configured.",
          );
          return;
        }

        const createdScenario =
          await scenarioService.createCustomInterviewScenario({
            userId,
            cvBuffer: request.file.buffer,
            cvMimeType: request.file.mimetype,
            jobDescription: rawJobDescription.trim(),
          });

        const body: CreateCustomScenarioResponse = {
          data: createdScenario,
        };
        response.status(201).json(body);
      } catch (error) {
        if (error instanceof ScenarioError) {
          sendError(response, error.status, error.code, error.message);
          return;
        }
        if (error instanceof CvParserError) {
          sendError(response, 400, error.code, error.message);
          return;
        }
        next(error);
      }
    },
  );

  app.delete(
    "/api/v1/scenarios/:scenarioKey",
    async (request: Request, response, next) => {
      try {
        if (
          !("resolveAuthProviderUserId" in dependencies) ||
          !dependencies.resolveAuthProviderUserId ||
          !dependencies.userProvisioner
        ) {
          sendError(
            response,
            401,
            "UNAUTHENTICATED",
            "Authentication is required.",
          );
          return;
        }

        const parsed = ScenarioParamsSchema.safeParse(request.params);
        if (!parsed.success) {
          sendError(
            response,
            400,
            "VALIDATION_FAILED",
            "Scenario key is invalid.",
          );
          return;
        }

        const userId = await resolveLocalUserId(request, response, {
          resolveAuthProviderUserId: dependencies.resolveAuthProviderUserId,
          userProvisioner: dependencies.userProvisioner,
        });
        if (!userId) return;

        if (!scenarioService.deleteCustomScenario) {
          sendError(
            response,
            500,
            "INTERNAL_ERROR",
            "Custom scenario deletion is not configured.",
          );
          return;
        }

        await scenarioService.deleteCustomScenario(
          parsed.data.scenarioKey,
          userId,
        );

        response.status(204).end();
      } catch (error) {
        if (error instanceof ScenarioError) {
          sendError(response, error.status, error.code, error.message);
          return;
        }
        next(error);
      }
    },
  );
}
