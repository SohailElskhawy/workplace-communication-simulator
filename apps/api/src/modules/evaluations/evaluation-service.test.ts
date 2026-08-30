import { describe, expect, it, vi } from "vitest";

import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";
import type {
  AttemptForEvaluationRecord,
  EvaluationRecord,
  EvaluationRepository,
} from "./evaluation-repository.js";
import { createEvaluationService } from "./evaluation-service.js";

describe("EvaluationService", () => {
  const userId = "user-123";
  const attemptId = "attempt-123";
  const turnId1 = "11111111-1111-4111-8111-111111111111";
  const turnId2 = "22222222-2222-4222-8222-222222222222";
  const turnId3 = "33333333-3333-4333-8333-333333333333";

  const baseAttempt: AttemptForEvaluationRecord = {
    id: attemptId,
    userId,
    status: "EVALUATING",
    difficulty: "MEDIUM",
    variationId: null,
    endedAt: new Date("2026-08-29T12:10:00.000Z"),
    scenario: {
      id: "scenario-1",
      key: "salary-negotiation",
      version: 1,
      title: "Salary Negotiation",
      definition: salaryNegotiationV1,
    },
    turns: [
      {
        id: turnId1,
        sequence: 1,
        userText: "I'd like to discuss my offer and target $120k.",
        assistantText: "We have tight budgets, why $120k?",
        status: "COMPLETED",
      },
      {
        id: turnId2,
        sequence: 2,
        userText: "Market data shows this range for my responsibilities.",
        assistantText: "Let me see what we can do.",
        status: "COMPLETED",
      },
      {
        id: turnId3,
        sequence: 3,
        userText: "Great, could we follow up on Monday?",
        assistantText: "Sounds good, I will get back to you Monday.",
        status: "COMPLETED",
      },
    ],
    evaluation: null,
  };

  const validRawEvaluation = {
    skills: {
      clarity: { score: 85, explanation: "Clear points" },
      assertiveness: { score: 75, explanation: "Good advocacy" },
      empathy: { score: 70, explanation: "Acknowledged budget" },
      structure: { score: 90, explanation: "Logical conversation" },
      conciseness: { score: 80, explanation: "Direct" },
    },
    objectives: [
      {
        objectiveId: "CLEAR_REQUEST",
        status: "ACHIEVED" as const,
        explanation: "Asked for $120k clearly",
        evidenceTurnIds: [turnId1],
      },
      {
        objectiveId: "EVIDENCE_BASED_CASE",
        status: "ACHIEVED" as const,
        explanation: "Cited market data",
        evidenceTurnIds: [turnId2],
      },
      {
        objectiveId: "COLLABORATIVE_RESPONSE",
        status: "ACHIEVED" as const,
        explanation: "Worked with manager constraints",
        evidenceTurnIds: [turnId2],
      },
      {
        objectiveId: "CONCRETE_NEXT_STEP",
        status: "ACHIEVED" as const,
        explanation: "Agreed to follow up Monday",
        evidenceTurnIds: [turnId3],
      },
    ],
    strengths: [
      {
        title: "Clear opening",
        explanation: "Direct ask",
        turnIds: [turnId1],
      },
    ],
    improvements: [
      {
        title: "Empathy on budget",
        explanation: "Acknowledge budget limits earlier",
        turnIds: [turnId2],
      },
    ],
    moments: [
      {
        turnId: turnId1,
        type: "STRENGTH" as const,
        explanation: "Strong anchoring",
        betterResponse: null,
      },
    ],
    summary: "Solid negotiation attempt.",
    nextFocus: {
      skill: "EMPATHY" as const,
      reason: "Validate budget pressures further.",
    },
  };

  it("returns existing evaluation without calling AI if attempt is already COMPLETED", async () => {
    const existingEvaluationData = {
      attemptId,
      skills: {
        clarity: 85,
        assertiveness: 75,
        empathy: 70,
        structure: 90,
        conciseness: 80,
      },
      universalScore: 80,
      scenarioScore: 100,
      overallScore: 86,
      objectives: [],
      strengths: [],
      improvements: [],
      moments: [],
      summary: "Existing summary",
      nextFocus: { skill: "EMPATHY" as const, reason: "Practice empathy" },
      createdAt: "2026-08-29T12:15:00.000Z",
    };

    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({
        kind: "existing",
        evaluation: {
          id: "eval-existing",
          attemptId,
          clarity: 85,
          assertiveness: 75,
          empathy: 70,
          structure: 90,
          conciseness: 80,
          universalScore: 80,
          scenarioScore: 100,
          overallScore: 86,
          objectiveResults: [],
          strengths: [],
          improvements: [],
          moments: [],
          nextFocusSkill: "EMPATHY",
          nextFocusReason: "Practice empathy",
          summary: "Existing summary",
          model: "openai/gpt-5.6-luna-pro",
          promptVersion: "evaluation-v1",
          createdAt: new Date("2026-08-29T12:15:00.000Z"),
        },
      }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue({
        ...baseAttempt,
        status: "COMPLETED",
        evaluation: existingEvaluationData,
      }),
      findExistingEvaluation: vi.fn(),
      saveEvaluation: vi.fn(),
      markEvaluationFailed: vi.fn(),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi.fn(),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);
    const result = await service.evaluate(userId, attemptId);

    expect(result).toEqual(existingEvaluationData);
    expect(aiService.evaluateSimulation).not.toHaveBeenCalled();
  });

  it("generates evaluation, computes deterministic scores, and saves evaluation for EVALUATING attempt", async () => {
    const savedRecord: EvaluationRecord = {
      id: "eval-1",
      attemptId,
      clarity: 85,
      assertiveness: 75,
      empathy: 70,
      structure: 90,
      conciseness: 80,
      universalScore: 80,
      scenarioScore: 100,
      overallScore: 86,
      objectiveResults: validRawEvaluation.objectives,
      strengths: validRawEvaluation.strengths,
      improvements: validRawEvaluation.improvements,
      moments: validRawEvaluation.moments.map((m) => ({
        ...m,
        betterResponse: m.betterResponse ?? null,
      })),
      nextFocusSkill: "EMPATHY",
      nextFocusReason: "Validate budget pressures further.",
      summary: "Solid negotiation attempt.",
      model: "openai/gpt-5.6-luna-pro",
      promptVersion: "evaluation-v1",
      createdAt: new Date("2026-08-29T12:15:00.000Z"),
    };

    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({
        kind: "claimed",
        attempt: baseAttempt,
      }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue(baseAttempt),
      findExistingEvaluation: vi.fn().mockResolvedValue(null),
      saveEvaluation: vi.fn().mockResolvedValue(savedRecord),
      markEvaluationFailed: vi.fn(),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi.fn().mockResolvedValue({
        evaluation: validRawEvaluation,
        latencyMs: 500,
        inputTokens: 200,
        outputTokens: 100,
        estimatedCost: 0.002,
      }),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);
    const result = await service.evaluate(userId, attemptId);

    expect(result.overallScore).toBe(86);
    expect(result.universalScore).toBe(80);
    expect(result.scenarioScore).toBe(100);
    expect(aiService.evaluateSimulation).toHaveBeenCalledWith(
      expect.objectContaining({ variation: null }),
    );
    expect(repository.saveEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId,
        userId,
        progressEligible: true,
        universalScore: 80,
        scenarioScore: 100,
        overallScore: 86,
      }),
    );
  });

  it("passes the attempt's stored variation to the evaluator", async () => {
    const variedDefinition = ScenarioDefinitionSchema.parse({
      ...salaryNegotiationV1,
      variations: [
        {
          id: "tight-budget",
          category: "TIGHT_BUDGET",
          openingMessage: "Tight budget opening.",
        },
      ],
    });
    const savedRecord: EvaluationRecord = {
      id: "eval-variation",
      attemptId,
      clarity: 85,
      assertiveness: 75,
      empathy: 70,
      structure: 90,
      conciseness: 80,
      universalScore: 80,
      scenarioScore: 100,
      overallScore: 86,
      objectiveResults: validRawEvaluation.objectives,
      strengths: validRawEvaluation.strengths,
      improvements: validRawEvaluation.improvements,
      moments: validRawEvaluation.moments.map((m) => ({
        ...m,
        betterResponse: m.betterResponse ?? null,
      })),
      nextFocusSkill: "EMPATHY",
      nextFocusReason: "Validate budget pressures further.",
      summary: "Solid negotiation attempt.",
      model: "openai/gpt-5.6-luna-pro",
      promptVersion: "evaluation-v2",
      createdAt: new Date("2026-08-29T12:15:00.000Z"),
    };

    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({
        kind: "claimed",
        attempt: {
          ...baseAttempt,
          variationId: "tight-budget",
          scenario: { ...baseAttempt.scenario, definition: variedDefinition },
        },
      }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue(baseAttempt),
      findExistingEvaluation: vi.fn().mockResolvedValue(null),
      saveEvaluation: vi.fn().mockResolvedValue(savedRecord),
      markEvaluationFailed: vi.fn(),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi.fn().mockResolvedValue({
        evaluation: validRawEvaluation,
        latencyMs: 500,
        inputTokens: 200,
        outputTokens: 100,
        estimatedCost: 0.002,
      }),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);
    await service.evaluate(userId, attemptId);

    expect(aiService.evaluateSimulation).toHaveBeenCalledWith(
      expect.objectContaining({
        variation: expect.objectContaining({ id: "tight-budget" }),
      }),
    );
  });

  it("retries once if first AI call fails and succeeds on second call", async () => {
    const savedRecord: EvaluationRecord = {
      id: "eval-1",
      attemptId,
      clarity: 85,
      assertiveness: 75,
      empathy: 70,
      structure: 90,
      conciseness: 80,
      universalScore: 80,
      scenarioScore: 100,
      overallScore: 86,
      objectiveResults: validRawEvaluation.objectives,
      strengths: validRawEvaluation.strengths,
      improvements: validRawEvaluation.improvements,
      moments: validRawEvaluation.moments.map((m) => ({
        ...m,
        betterResponse: m.betterResponse ?? null,
      })),
      nextFocusSkill: "EMPATHY",
      nextFocusReason: "Validate budget pressures further.",
      summary: "Solid negotiation attempt.",
      model: "openai/gpt-5.6-luna-pro",
      promptVersion: "evaluation-v1",
      createdAt: new Date("2026-08-29T12:15:00.000Z"),
    };

    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({
        kind: "claimed",
        attempt: baseAttempt,
      }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue(baseAttempt),
      findExistingEvaluation: vi.fn().mockResolvedValue(null),
      saveEvaluation: vi.fn().mockResolvedValue(savedRecord),
      markEvaluationFailed: vi.fn(),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi
        .fn()
        .mockRejectedValueOnce(new AiProviderError("AI_PROVIDER_ERROR", 200))
        .mockResolvedValueOnce({
          evaluation: validRawEvaluation,
          latencyMs: 400,
          inputTokens: 200,
          outputTokens: 100,
          estimatedCost: 0.002,
        }),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);
    const result = await service.evaluate(userId, attemptId);

    expect(aiService.evaluateSimulation).toHaveBeenCalledTimes(2);
    expect(result.overallScore).toBe(86);
  });

  it("marks attempt EVALUATION_FAILED when both initial call and retry fail", async () => {
    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({
        kind: "claimed",
        attempt: baseAttempt,
      }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue(baseAttempt),
      findExistingEvaluation: vi.fn().mockResolvedValue(null),
      saveEvaluation: vi.fn(),
      markEvaluationFailed: vi.fn().mockResolvedValue(undefined),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi
        .fn()
        .mockRejectedValue(new AiProviderError("AI_TIMEOUT", 30_000)),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);

    await expect(service.evaluate(userId, attemptId)).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });

    expect(repository.markEvaluationFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId,
        userId,
        usage: expect.objectContaining({
          status: "FAILED",
          errorCode: "AI_TIMEOUT",
        }),
      }),
    );
  });

  it("rejects evaluation when attempt is in ACTIVE state", async () => {
    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({ kind: "rejected" }),
      findAttemptForEvaluation: vi.fn().mockResolvedValue({
        ...baseAttempt,
        status: "ACTIVE",
      }),
      findExistingEvaluation: vi.fn(),
      saveEvaluation: vi.fn(),
      markEvaluationFailed: vi.fn(),
    };

    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi.fn(),
      transcribeAudio: vi.fn(),
    };

    const service = createEvaluationService(repository, aiService);
    await expect(service.evaluate(userId, attemptId)).rejects.toMatchObject({
      code: "INVALID_ATTEMPT_STATE",
    });
  });

  it("does not call AI when another request has already claimed evaluation", async () => {
    const repository: EvaluationRepository = {
      claimEvaluation: vi.fn().mockResolvedValue({ kind: "in_progress" }),
      findAttemptForEvaluation: vi.fn(),
      findExistingEvaluation: vi.fn(),
      saveEvaluation: vi.fn(),
      markEvaluationFailed: vi.fn(),
    };
    const aiService: AiService = {
      roleplayModel: "deepseek/deepseek-v4-flash-0731",
      evaluationModel: "openai/gpt-5.6-luna-pro",
      transcriptionModel: "openai/whisper-large-v3-turbo",
      ttsModel: "hexgrad/kokoro-82m",
      generateSpeech: vi.fn(),
      generateRoleplayReply: vi.fn(),
      evaluateSimulation: vi.fn(),
      transcribeAudio: vi.fn(),
    };

    await expect(
      createEvaluationService(repository, aiService).evaluate(
        userId,
        attemptId,
      ),
    ).rejects.toMatchObject({ code: "EVALUATION_IN_PROGRESS" });
    expect(aiService.evaluateSimulation).not.toHaveBeenCalled();
  });
});
