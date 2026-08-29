import type {
  ApiErrorResponse,
  ScenarioDetailResponse,
  ScenarioListResponse,
} from "@kalemny/contracts";
import type { Express } from "express";

import type { ScenarioService } from "./scenario-service.js";

export function registerScenarioRoutes(
  app: Express,
  scenarioService: ScenarioService,
): void {
  app.get("/api/v1/scenarios", async (_request, response) => {
    const body: ScenarioListResponse = {
      data: await scenarioService.listActive(),
    };

    response.status(200).json(body);
  });

  app.get("/api/v1/scenarios/:scenarioKey", async (request, response) => {
    const scenario = await scenarioService.getActiveByKey(
      request.params.scenarioKey,
    );

    if (!scenario) {
      const body: ApiErrorResponse = {
        error: {
          code: "NOT_FOUND",
          message: "Scenario not found.",
          requestId: response.locals.requestId as string,
        },
      };
      response.status(404).json(body);
      return;
    }

    const body: ScenarioDetailResponse = { data: scenario };
    response.status(200).json(body);
  });
}
