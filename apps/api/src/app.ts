import type {
  ApiErrorResponse,
  HealthResponse,
  MeResponse,
} from "@kalemny/contracts";
import cors from "cors";
import express, {
  type Express,
  type Request,
  type RequestHandler,
} from "express";
import helmet from "helmet";

import {
  logger as defaultLogger,
  type AppLogger,
} from "./infrastructure/logging/logger.js";
import {
  createErrorHandler,
  notFoundHandler,
} from "./middleware/error-handler.js";
import {
  createAiRateLimiter,
  createGeneralRateLimiter,
  isExpensiveAiRequest,
} from "./middleware/rate-limits.js";
import { requestContext } from "./middleware/request-context.js";

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
  logger?: AppLogger;
  captureException?: (
    error: unknown,
    context: { requestId: string; route: string },
  ) => void;
  generalRateLimit?: { windowMs: number; limit: number };
  aiRateLimit?: { windowMs: number; limit: number };
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
  const appLogger = dependencies.logger ?? defaultLogger;

  app.disable("x-powered-by");

  app.use(requestContext(appLogger));
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin: dependencies.webOrigin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );

  app.use(express.json({ limit: "64kb" }));

  app.get("/api/v1/health", (_request, response) => {
    const body: HealthResponse = {
      data: {
        status: "ok",
      },
    };

    response.status(200).json(body);
  });

  app.use(dependencies.authenticationMiddleware);

  if (dependencies.generalRateLimit) {
    app.use(
      "/api/v1",
      createGeneralRateLimiter({
        ...dependencies.generalRateLimit,
        resolveUserId: dependencies.resolveAuthProviderUserId,
      }),
    );
  }

  if (dependencies.aiRateLimit) {
    const aiLimiter = createAiRateLimiter({
      ...dependencies.aiRateLimit,
      resolveUserId: dependencies.resolveAuthProviderUserId,
    });
    app.use(isExpensiveAiRequest);
    app.use((request, response, next) => {
      if (response.locals.isExpensiveAiRequest === true) {
        aiLimiter(request, response, next);
        return;
      }
      next();
    });
  }

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

  app.use(notFoundHandler);
  app.use(
    createErrorHandler({
      logger: appLogger,
      ...(dependencies.captureException
        ? { captureException: dependencies.captureException }
        : {}),
    }),
  );

  return app;
}
