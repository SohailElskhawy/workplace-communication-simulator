import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
import {
  buildEvaluationMessages,
  EVALUATION_PROMPT_VERSION,
  RawAiEvaluationSchema,
} from "./evaluation-prompt.js";

describe("evaluation-prompt", () => {
  const turns = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sequence: 1,
      userText: "I would like to discuss a base salary adjustment to $120k.",
      assistantText: "We have budget constraints, but what is your reasoning?",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      sequence: 2,
      userText:
        "Based on my market research and leading similar initiatives, $120k matches the role scope.",
      assistantText: "That makes sense. I can check with leadership.",
    },
  ];

  it("builds structured evaluation messages including prompt version, rubric, objectives, and transcript turns", () => {
    const messages = buildEvaluationMessages({
      scenario: salaryNegotiationV1,
      difficulty: "MEDIUM",
      turns,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain(EVALUATION_PROMPT_VERSION);
    expect(messages[0]?.content).toContain("CLEAR_REQUEST");
    expect(messages[0]?.content).toContain("EVIDENCE_BASED_CASE");
    expect(messages[0]?.content).toContain("CLARITY");

    expect(messages[1]?.role).toBe("user");
    expect(messages[1]?.content).toContain(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(messages[1]?.content).toContain(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(messages[1]?.content).toContain("Learner: I would like to discuss");
  });

  it("validates raw AI evaluation schema", () => {
    const raw = {
      skills: {
        clarity: { score: 85, explanation: "Very clear" },
        assertiveness: { score: 80, explanation: "Advocated well" },
        empathy: { score: 75, explanation: "Acknowledged constraints" },
        structure: { score: 90, explanation: "Logical flow" },
        conciseness: { score: 80, explanation: "Direct" },
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED",
          explanation: "Explicitly requested $120k",
          evidenceTurnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      strengths: [
        {
          title: "Clear opening",
          explanation: "Direct ask",
          turnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      improvements: [
        {
          title: "Follow up timeline",
          explanation: "Confirm next steps",
          turnIds: ["22222222-2222-4222-8222-222222222222"],
        },
      ],
      moments: [
        {
          turnId: "11111111-1111-4111-8111-111111111111",
          type: "STRENGTH",
          explanation: "Strong ask",
        },
      ],
      summary: "Good session",
      nextFocus: {
        skill: "ASSERTIVENESS",
        reason: "Maintain confidence",
      },
    };

    const parsed = RawAiEvaluationSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});
