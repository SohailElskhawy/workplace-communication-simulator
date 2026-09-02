import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { createScenarioService } from "./scenario-service.js";

const summary = {
  key: salaryNegotiationV1.key,
  version: salaryNegotiationV1.version,
  title: salaryNegotiationV1.title,
  category: salaryNegotiationV1.category,
  summary: salaryNegotiationV1.summary,
};

describe("ScenarioService caching", () => {
  it("caches listActive results within TTL", async () => {
    let callCount = 0;
    const service = createScenarioService({
      async listActive() {
        callCount++;
        return [summary];
      },
      async findActiveByKey() {
        return null;
      },
    });

    const first = await service.listActive();
    const second = await service.listActive();

    expect(first).toEqual([summary]);
    expect(second).toEqual(first);
    expect(callCount).toBe(1);
  });

  it("caches getActiveByKey results within TTL and expires after TTL", async () => {
    let currentTime = 1000;
    let callCount = 0;
    const service = createScenarioService(
      {
        async listActive() {
          return [];
        },
        async findActiveByKey(key) {
          callCount++;
          return key === salaryNegotiationV1.key
            ? { ...summary, definition: salaryNegotiationV1 }
            : null;
        },
      },
      {
        ttlMs: 5000,
        clock: () => currentTime,
      },
    );

    const first = await service.getActiveByKey("salary-negotiation");
    expect(first?.key).toBe("salary-negotiation");
    expect(callCount).toBe(1);

    currentTime += 2000;
    const second = await service.getActiveByKey("salary-negotiation");
    expect(second?.key).toBe("salary-negotiation");
    expect(callCount).toBe(1);

    currentTime += 4000; // total 6000ms > 5000ms
    const third = await service.getActiveByKey("salary-negotiation");
    expect(third?.key).toBe("salary-negotiation");
    expect(callCount).toBe(2);
  });
});

describe("ScenarioService custom interview creation", () => {
  function createTestPdfBuffer(text: string): Buffer {
    const content = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
    const streamLength = content.length;
    const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000228 00000 n 
0000000300 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
370
%%EOF`;
    return Buffer.from(pdfString, "binary");
  }

  const sampleJobDescription =
    "We are seeking an experienced Staff Software Engineer to lead our distributed systems architecture and mentor junior teammates across global hubs.";

  const mockScenarioDefinition = {
    ...salaryNegotiationV1,
    key: "custom-interview-123",
    category: "CUSTOM" as const,
    title: "Staff Software Engineer Interview",
  };

  it("rejects FREE tier user with PLAN_UPGRADE_REQUIRED", async () => {
    const service = createScenarioService(
      {
        async listActive() {
          return [];
        },
        async findActiveByKey() {
          return null;
        },
        async createCustomScenario() {
          throw new Error("Should not be called");
        },
      },
      {
        entitlementService: {
          getUserEntitlement: async () => ({
            plan: "FREE",
            effectivePlan: "FREE",
            expiresAt: null,
            simulationsLimit: 3,
            simulationsUsed: 0,
            simulationsRemaining: 3,
            windowStartsAt: new Date().toISOString(),
            windowEndsAt: new Date().toISOString(),
          }),
        },
      },
    );

    await expect(
      service.createCustomInterviewScenario!({
        userId: "user-123",
        cvBuffer: createTestPdfBuffer(
          "Sample CV text with over 50 characters here for testing",
        ),
        cvMimeType: "application/pdf",
        jobDescription: sampleJobDescription,
      }),
    ).rejects.toThrow("Custom interview scenarios require a Plus or Pro plan.");
  });

  it("rejects job description shorter than 50 characters", async () => {
    const service = createScenarioService(
      {
        async listActive() {
          return [];
        },
        async findActiveByKey() {
          return null;
        },
        async createCustomScenario() {
          throw new Error("Should not be called");
        },
      },
      {
        entitlementService: {
          getUserEntitlement: async () => ({
            plan: "PLUS",
            effectivePlan: "PLUS",
            expiresAt: null,
            simulationsLimit: null,
            simulationsUsed: 0,
            simulationsRemaining: null,
            windowStartsAt: new Date().toISOString(),
            windowEndsAt: new Date().toISOString(),
          }),
        },
      },
    );

    await expect(
      service.createCustomInterviewScenario!({
        userId: "user-123",
        cvBuffer: createTestPdfBuffer(
          "Sample CV text with over 50 characters here for testing",
        ),
        cvMimeType: "application/pdf",
        jobDescription: "Too short job description",
      }),
    ).rejects.toThrow(
      "Job description must be between 50 and 20,000 characters.",
    );
  });

  it("successfully creates custom scenario for PLUS user", async () => {
    let savedInput: unknown = null;
    const service = createScenarioService(
      {
        async listActive() {
          return [];
        },
        async findActiveByKey() {
          return null;
        },
        async createCustomScenario(input) {
          savedInput = input;
          return {
            key: input.key,
            version: 1,
            title: input.title,
            category: "CUSTOM",
            summary: input.summary,
            definition: input.definition,
            userId: input.userId,
          };
        },
      },
      {
        entitlementService: {
          getUserEntitlement: async () => ({
            plan: "PLUS",
            effectivePlan: "PLUS",
            expiresAt: null,
            simulationsLimit: null,
            simulationsUsed: 0,
            simulationsRemaining: null,
            windowStartsAt: new Date().toISOString(),
            windowEndsAt: new Date().toISOString(),
          }),
        },
        aiService: {
          roleplayModel: "test-roleplay",
          evaluationModel: "test-eval",
          transcriptionModel: "test-stt",
          ttsModel: "test-tts",
          generateRoleplayReply: async () => {
            throw new Error("Not implemented");
          },
          evaluateSimulation: async () => {
            throw new Error("Not implemented");
          },
          generateCustomScenario: async (input) => ({
            definition: {
              ...mockScenarioDefinition,
              key: input.scenarioKey,
            },
            latencyMs: 1200,
            inputTokens: 500,
            outputTokens: 800,
            estimatedCost: 0.005,
          }),
          transcribeAudio: async () => {
            throw new Error("Not implemented");
          },
          generateSpeech: async () => {
            throw new Error("Not implemented");
          },
        },
      },
    );

    const result = await service.createCustomInterviewScenario!({
      userId: "user-plus-1",
      cvBuffer: createTestPdfBuffer(
        "Staff Software Engineer with 10 years distributed systems experience at Google and Stripe.",
      ),
      cvMimeType: "application/pdf",
      jobDescription: sampleJobDescription,
    });

    expect(result.isCustom).toBe(true);
    expect(result.category).toBe("CUSTOM");
    expect(result.title).toBe("Staff Software Engineer Interview");
    expect(savedInput).toBeDefined();
    expect((savedInput as { userId: string }).userId).toBe("user-plus-1");
  });
});

describe("ScenarioService custom scenario deletion", () => {
  it("rejects deletion if scenario does not exist", async () => {
    const service = createScenarioService({
      async listActive() {
        return [];
      },
      async findActiveByKey() {
        return null;
      },
    });

    await expect(
      service.deleteCustomScenario!("non-existent", "user-1"),
    ).rejects.toThrow("Scenario not found.");
  });

  it("rejects deletion if scenario is not custom (userId is null)", async () => {
    const service = createScenarioService({
      async listActive() {
        return [];
      },
      async findActiveByKey() {
        return {
          ...summary,
          userId: null,
          definition: salaryNegotiationV1,
        };
      },
    });

    await expect(
      service.deleteCustomScenario!("salary-negotiation", "user-1"),
    ).rejects.toThrow("You do not have permission to delete this scenario.");
  });

  it("rejects deletion if scenario is owned by another user", async () => {
    const service = createScenarioService({
      async listActive() {
        return [];
      },
      async findActiveByKey() {
        return {
          ...summary,
          userId: "user-owner",
          definition: salaryNegotiationV1,
        };
      },
    });

    await expect(
      service.deleteCustomScenario!("custom-123", "user-intruder"),
    ).rejects.toThrow("You do not have permission to delete this scenario.");
  });

  it("successfully deletes custom scenario and invalidates cache", async () => {
    let deleted = false;
    let repositoryActive = true;
    const service = createScenarioService({
      async listActive() {
        return repositoryActive
          ? [
              {
                ...summary,
                key: "custom-123",
                userId: "user-owner",
              },
            ]
          : [];
      },
      async findActiveByKey(key) {
        if (!repositoryActive || key !== "custom-123") return null;
        return {
          ...summary,
          key: "custom-123",
          userId: "user-owner",
          definition: salaryNegotiationV1,
        };
      },
      async deleteCustomScenario(key, userId) {
        if (key === "custom-123" && userId === "user-owner") {
          deleted = true;
          repositoryActive = false;
          return true;
        }
        return false;
      },
    });

    await service.deleteCustomScenario!("custom-123", "user-owner");
    expect(deleted).toBe(true);

    const listAfter = await service.listActive("user-owner");
    expect(listAfter).toHaveLength(0);
  });
});
