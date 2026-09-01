import {
  ApiErrorResponseSchema,
  ScenarioDetailResponseSchema,
  ScenarioListResponseSchema,
} from "@kalemny/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { createScenarioService } from "./scenario-service.js";

const summary = {
  key: salaryNegotiationV1.key,
  version: salaryNegotiationV1.version,
  title: salaryNegotiationV1.title,
  category: salaryNegotiationV1.category,
  summary: salaryNegotiationV1.summary,
};

const unusedAttemptService = {
  create: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  getOwned: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  getComparison: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  createTurn: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  retryTurn: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  finish: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  importRealtimeTranscript: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
  delete: async () => {
    throw new Error("Attempt service should not run for scenario routes");
  },
};

function createScenarioApp() {
  return createApp({
    attemptService: unusedAttemptService,
    authenticationMiddleware: (_request, _response, next) => next(),
    evaluationService: {
      evaluate: async () => {
        throw new Error(
          "Evaluation service should not run for scenario routes",
        );
      },
    },
    historyService: {
      getHistory: async () => {
        throw new Error("History service should not run for scenario routes");
      },
    },
    progressService: {
      getProgress: async () => {
        throw new Error("Progress service should not run for scenario routes");
      },
    },
    resolveAuthProviderUserId: () => null,
    scenarioService: createScenarioService({
      async listActive() {
        return [summary];
      },
      async findActiveByKey(key) {
        return key === salaryNegotiationV1.key
          ? { ...summary, definition: salaryNegotiationV1 }
          : null;
      },
    }),
    userProvisioner: {
      ensureUser: () => {
        throw new Error("Public scenario retrieval must not provision a user");
      },
    },
    voiceService: {
      transcribe: async () => {
        throw new Error("Voice service should not run for scenario routes");
      },
    },
    webOrigin: "http://localhost:3000",
  });
}

describe("scenario endpoints", () => {
  it("returns active public scenario summaries", async () => {
    const response =
      await request(createScenarioApp()).get("/api/v1/scenarios");

    expect(response.status).toBe(200);
    expect(ScenarioListResponseSchema.parse(response.body)).toEqual({
      data: [summary],
    });
  });

  it("returns a frontend-safe active scenario detail", async () => {
    const response = await request(createScenarioApp()).get(
      "/api/v1/scenarios/salary-negotiation",
    );
    const parsed = ScenarioDetailResponseSchema.parse(response.body);
    const serialized = JSON.stringify(parsed);

    expect(response.status).toBe(200);
    expect(parsed.data.availableDifficulties).toEqual([
      "EASY",
      "MEDIUM",
      "HARD",
    ]);
    for (const hiddenField of [
      "persona",
      "aiObjective",
      "motivations",
      "constraints",
      "objectives",
      "openingMessage",
      "roleplayRules",
      "behaviorGuidance",
    ]) {
      expect(serialized).not.toContain(hiddenField);
    }
  });

  it("returns a stable not-found error for an inactive or unknown key", async () => {
    const response = await request(createScenarioApp()).get(
      "/api/v1/scenarios/unknown",
    );

    expect(response.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "NOT_FOUND",
    );
  });

  it("returns validation failed for an invalid scenario key", async () => {
    const response = await request(createScenarioApp()).get(
      "/api/v1/scenarios/%20",
    );

    expect(response.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "VALIDATION_FAILED",
    );
  });
});
