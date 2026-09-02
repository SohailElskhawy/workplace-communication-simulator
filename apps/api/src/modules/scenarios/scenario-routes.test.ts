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

  it("rejects unauthenticated custom scenario creation with 401", async () => {
    const response = await request(createScenarioApp())
      .post("/api/v1/scenarios/custom")
      .field(
        "jobDescription",
        "Sample job description with over 50 characters here for test.",
      );

    expect(response.status).toBe(401);
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      "UNAUTHENTICATED",
    );
  });

  it("creates custom scenario for authenticated user and returns 201", async () => {
    const testPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 55 >> stream\nBT /F1 12 Tf 100 700 Td (Software Engineer with 8 years experience) Tj ET\nendstream endobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000228 00000 n \n0000000300 00000 n \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n370\n%%EOF",
      "binary",
    );

    const customScenarioDetail = {
      key: "custom-interview-test-uuid",
      version: 1,
      title: "Senior Backend Engineer Interview",
      category: "CUSTOM",
      summary: "Interview simulation for Senior Backend Engineer.",
      isCustom: true,
      context: salaryNegotiationV1.publicContext,
      availableDifficulties: ["EASY", "MEDIUM", "HARD"] as (
        "EASY" | "MEDIUM" | "HARD"
      )[],
    };

    const customApp = createApp({
      attemptService: unusedAttemptService,
      authenticationMiddleware: (_request, _response, next) => next(),
      evaluationService: {
        evaluate: async () => {
          throw new Error("Not used");
        },
      },
      historyService: {
        getHistory: async () => {
          throw new Error("Not used");
        },
      },
      progressService: {
        getProgress: async () => {
          throw new Error("Not used");
        },
      },
      resolveAuthProviderUserId: () => "auth_user_1",
      userProvisioner: {
        ensureUser: async () => ({
          id: "db_user_1",
          authProviderUserId: "auth_user_1",
          email: "user1@example.com",
          name: "User One",
          imageUrl: null,
          role: "LEARNER",
          plan: "PLUS",
          planExpiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      scenarioService: {
        listActive: async (userId) => {
          return userId === "db_user_1"
            ? [
                summary,
                {
                  ...summary,
                  key: "custom-interview-test-uuid",
                  category: "CUSTOM",
                  isCustom: true,
                },
              ]
            : [summary];
        },
        getActiveByKey: async (key, userId) => {
          if (key === "custom-interview-test-uuid" && userId === "db_user_1") {
            return customScenarioDetail;
          }
          return key === salaryNegotiationV1.key
            ? {
                ...summary,
                context: salaryNegotiationV1.publicContext,
                availableDifficulties: ["EASY", "MEDIUM", "HARD"],
              }
            : null;
        },
        createCustomInterviewScenario: async () => {
          return customScenarioDetail;
        },
      },
      voiceService: {
        transcribe: async () => {
          throw new Error("Not used");
        },
      },
      webOrigin: "http://localhost:3000",
    });

    const response = await request(customApp)
      .post("/api/v1/scenarios/custom")
      .attach("cv", testPdf, "resume.pdf")
      .field(
        "jobDescription",
        "We are looking for a Senior Backend Engineer with deep TypeScript, Node.js, and PostgreSQL expertise.",
      );

    expect(response.status).toBe(201);
    expect(response.body.data.key).toBe("custom-interview-test-uuid");
    expect(response.body.data.isCustom).toBe(true);

    // Verify user scoping in list
    const listRes = await request(customApp).get("/api/v1/scenarios");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.data[1].isCustom).toBe(true);
  });
});
