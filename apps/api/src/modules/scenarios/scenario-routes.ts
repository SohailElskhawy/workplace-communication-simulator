import type {
  ApiErrorResponse,
  ScenarioDetailResponse,
  ScenarioListResponse,
} from "@kalemny/contracts";
import type { Express } from "express";
import { z } from "zod";

import type { ScenarioService } from "./scenario-service.js";

const ScenarioParamsSchema = z.strictObject({
  scenarioKey: z.string().trim().min(1),
});

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
    const parsed = ScenarioParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      const body: ApiErrorResponse = {
        error: {
          code: "VALIDATION_FAILED",
          message: "Scenario key is invalid.",
          requestId: response.locals.requestId as string,
        },
      };
      response.status(400).json(body);
      return;
    }

    const scenario = await scenarioService.getActiveByKey(
      parsed.data.scenarioKey,
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
