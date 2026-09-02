import { describe, expect, it } from "vitest";
import {
  buildCustomScenarioMessages,
  buildCustomScenarioSystemPrompt,
  buildCustomScenarioUserPrompt,
  validateCustomScenarioOutput,
} from "./custom-scenario-prompt.js";

describe("custom-scenario-prompt", () => {
  it("builds system and user prompts with grounding instructions", () => {
    const systemPrompt = buildCustomScenarioSystemPrompt();
    expect(systemPrompt).toContain("STRICT FACTUAL GROUNDING");

    const userPrompt = buildCustomScenarioUserPrompt({
      scenarioKey: "custom-interview-test-123",
      cvText: "5 years React experience.",
      jobDescription: "Senior Frontend Engineer.",
    });
    expect(userPrompt).toContain("custom-interview-test-123");
  });

  it("builds prompt messages containing system instructions, key, and user inputs", () => {
    const messages = buildCustomScenarioMessages({
      scenarioKey: "custom-interview-test-123",
      cvText: "5 years React and Node.js experience at Acme.",
      jobDescription: "Senior Frontend Engineer with React knowledge.",
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).toContain("STRICT FACTUAL GROUNDING");
    expect(messages[1]!.role).toBe("user");
    expect(messages[1]!.content).toContain("custom-interview-test-123");
    expect(messages[1]!.content).toContain("5 years React and Node.js");
    expect(messages[1]!.content).toContain("Senior Frontend Engineer");
  });

  it("validates and parses valid scenario JSON conforming to ScenarioDefinitionSchema", () => {
    const validJson = {
      key: "temp-key",
      version: 99,
      title: "Senior Frontend Engineer Interview - TechCorp",
      category: "CUSTOM",
      summary: "Practice interviewing for a senior frontend role at TechCorp.",
      publicContext: {
        description: "Interviewing for Senior Frontend Engineer.",
        userRole: "Frontend Candidate",
        aiRole: "Engineering Hiring Manager",
        userObjective:
          "Demonstrate technical depth and structured problem solving.",
        stakes: "Advancing to executive interview round.",
      },
      persona: {
        role: "Engineering Director",
        traits: ["pragmatic", "technical", "evidence-focused"],
        communicationStyle: "Concise and probing.",
      },
      aiObjective: "Verify deep React and system architecture experience.",
      motivations: [
        "Find a strong technical lead",
        "Ensure clear communication",
      ],
      constraints: ["Do not invent candidate facts", "Stay in character"],
      openingMessage:
        "Thanks for joining us today. Can you walk me through your React experience at Acme?",
      difficulties: {
        EASY: {
          cooperativeness: 5,
          objectionIntensity: 1,
          followUpPressure: 2,
          weakReasoningTolerance: 4,
          concessionThreshold: 2,
          behaviorGuidance: "Supportive, limited follow-ups.",
        },
        MEDIUM: {
          cooperativeness: 3,
          objectionIntensity: 3,
          followUpPressure: 3,
          weakReasoningTolerance: 3,
          concessionThreshold: 3,
          behaviorGuidance: "Realistic follow-up questioning.",
        },
        HARD: {
          cooperativeness: 2,
          objectionIntensity: 4,
          followUpPressure: 5,
          weakReasoningTolerance: 1,
          concessionThreshold: 5,
          behaviorGuidance: "Deep probing on architecture and trade-offs.",
        },
      },
      objectives: [
        {
          id: "REACT_ARCHITECTURE",
          description: "Explain React architecture choices clearly.",
          successSignals: ["Explains component state models"],
          failureSignals: ["Vague generalities"],
        },
        {
          id: "COMMUNICATION_STRUCTURE",
          description: "Structure answers with clear context and outcomes.",
          successSignals: ["Uses STAR method"],
          failureSignals: ["Rambles without clear point"],
        },
      ],
      skillEmphasis: ["CLARITY", "STRUCTURE"],
      roleplayRules: ["Stay in character", "Do not coach"],
    };

    const parsed = validateCustomScenarioOutput(
      validJson,
      "custom-interview-final",
    );
    expect(parsed.key).toBe("custom-interview-final");
    expect(parsed.version).toBe(1);
    expect(parsed.category).toBe("CUSTOM");
    expect(parsed.title).toBe("Senior Frontend Engineer Interview - TechCorp");
    expect(parsed.objectives).toHaveLength(2);
  });

  it("normalizes and sanitizes loose LLM outputs gracefully", () => {
    const looseJson = {
      title: "Backend Engineer Interview",
      persona: {
        traits: "curious, technical, direct",
      },
      skillEmphasis: ["clarity", "invalid_skill", "empathy"],
      objectives: [
        {
          id: "1. Problem Solving & Design",
          description: "Solve backend architectural questions.",
          successSignals: "Good structure, clear tradeoffs",
          failureSignals: "Cannot explain scaling",
        },
      ],
      difficulties: {
        EASY: { cooperativeness: 10, objectionIntensity: -5 },
      },
    };

    const parsed = validateCustomScenarioOutput(
      looseJson,
      "custom-interview-loose-123",
    );

    expect(parsed.key).toBe("custom-interview-loose-123");
    expect(parsed.version).toBe(1);
    expect(parsed.category).toBe("CUSTOM");
    expect(parsed.persona.traits).toEqual(["curious", "technical", "direct"]);
    expect(parsed.skillEmphasis).toEqual(["CLARITY", "EMPATHY"]);
    expect(parsed.objectives[0]!.id).toBe("PROBLEM_SOLVING_DESIGN");
    expect(parsed.objectives[0]!.successSignals).toEqual([
      "Good structure, clear tradeoffs",
    ]);
    expect(parsed.difficulties.EASY.cooperativeness).toBe(5);
    expect(parsed.difficulties.EASY.objectionIntensity).toBe(1);
  });

  it("throws validation error on non-object payload", () => {
    expect(() =>
      validateCustomScenarioOutput("not-json", "custom-interview-fail"),
    ).toThrow("AI output is not a valid JSON object.");
  });
});
