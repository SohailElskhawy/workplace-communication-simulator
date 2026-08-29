import type {
  ApiErrorResponse,
  HealthResponse,
  MeResponse,
} from "@kalemny/contracts";
import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
} from "express";
import { randomUUID } from "node:crypto";

import { registerAttemptRoutes } from "./modules/attempts/attempt-routes.js";
import type { AttemptService } from "./modules/attempts/attempt-service.js";
import { registerEvaluationRoutes } from "./modules/evaluations/evaluation-routes.js";
import type { EvaluationService } from "./modules/evaluations/evaluation-service.js";
import { registerHistoryRoutes } from "./modules/history/history-routes.js";
import type { HistoryService } from "./modules/history/history-service.js";
import { registerProgressRoutes } from "./modules/progress/progress-routes.js";
import type { ProgressService } from "./modules/progress/progress-service.js";
import { registerScenarioRoutes } from "./modules/scenarios/scenario-routes.js";
import type { ScenarioService } from "./modules/scenarios/scenario-service.js";
import type { LocalUserProvisioner } from "./modules/users/provision-local-user.js";
import { registerTtsRoutes } from "./modules/tts/tts-routes.js";
import type { TtsService } from "./modules/tts/tts-service.js";
import { registerVoiceRoutes } from "./modules/voice/voice-routes.js";
import type { VoiceService } from "./modules/voice/voice-service.js";

export interface AuthenticatedAppDependencies {
  attemptService: AttemptService;
  authenticationMiddleware: RequestHandler;
  evaluationService: EvaluationService;
  historyService: HistoryService;
  progressService: ProgressService;
  resolveAuthProviderUserId(request: Request): string | null;
  scenarioService: ScenarioService;
  userProvisioner: LocalUserProvisioner;
  voiceService: VoiceService;
  ttsService?: TtsService;
  webOrigin: string;
}

function unauthenticated(requestId: string): ApiErrorResponse {
  return {
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
      requestId,
    },
  };
}

export function createApp(dependencies: AuthenticatedAppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use((_request, response, next) => {
    response.locals.requestId = randomUUID();
    next();
  });

  app.use(
    cors({
      origin: dependencies.webOrigin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );

  app.use(express.json({ limit: "64kb" }));

  app.use(dependencies.authenticationMiddleware);

  app.get("/api/v1/health", (_request, response) => {
    const body: HealthResponse = {
      data: {
        status: "ok",
      },
    };

    response.status(200).json(body);
  });

  app.get("/api/v1/me", async (request, response) => {
    const authProviderUserId = dependencies.resolveAuthProviderUserId(request);

    if (!authProviderUserId) {
      response
        .status(401)
        .json(unauthenticated(response.locals.requestId as string));
      return;
    }

    const user =
      await dependencies.userProvisioner.ensureUser(authProviderUserId);
    const body: MeResponse = { data: { id: user.id } };

    response.status(200).json(body);
  });

  registerScenarioRoutes(app, dependencies.scenarioService);
  registerAttemptRoutes(app, dependencies);
  registerEvaluationRoutes(app, dependencies);
  registerHistoryRoutes(app, dependencies);
  registerProgressRoutes(app, dependencies);
  registerVoiceRoutes(app, dependencies);
  if (dependencies.ttsService)
    registerTtsRoutes(
      app,
      dependencies as AuthenticatedAppDependencies & { ttsService: TtsService },
    );

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    void _next;

    const requestId =
      (response.locals.requestId as string | undefined) ?? randomUUID();

    const syntaxError =
      error instanceof SyntaxError &&
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 400;
    const payloadTooLarge =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 413;

    if (syntaxError || payloadTooLarge) {
      const body: ApiErrorResponse = {
        error: {
          code: "VALIDATION_FAILED",
          message: payloadTooLarge
            ? "Request body is too large."
            : "Request body is invalid.",
          requestId,
        },
      };
      response.status(payloadTooLarge ? 413 : 400).json(body);
      return;
    }

    console.error(`[${requestId}] Unhandled API error.`);

    const body: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId,
      },
    };

    response.status(500).json(body);
  };

  app.use(errorHandler);

  return app;
}
