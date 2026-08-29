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

import { registerScenarioRoutes } from "./modules/scenarios/scenario-routes.js";
import type { ScenarioService } from "./modules/scenarios/scenario-service.js";
import type { LocalUserProvisioner } from "./modules/users/provision-local-user.js";

export interface AuthenticatedAppDependencies {
  authenticationMiddleware: RequestHandler;
  resolveAuthProviderUserId(request: Request): string | null;
  scenarioService: ScenarioService;
  userProvisioner: LocalUserProvisioner;
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

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    void _next;

    const requestId =
      (response.locals.requestId as string | undefined) ?? randomUUID();

    console.error(`[${requestId}] Unhandled API error:`, error);

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
