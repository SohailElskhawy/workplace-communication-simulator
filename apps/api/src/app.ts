import type { HealthResponse } from "@kalemny/contracts";
import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.get("/api/v1/health", (_request, response) => {
    const body: HealthResponse = {
      data: {
        status: "ok",
      },
    };

    response.status(200).json(body);
  });

  return app;
}
