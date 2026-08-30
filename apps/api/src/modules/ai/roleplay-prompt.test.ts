import { describe, expect, it } from "vitest";

import { scenarioDefinitions } from "../scenarios/definitions/index.js";
import { behavioralInterviewV1 } from "../scenarios/definitions/behavioral-interview.js";
import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
import type { ScenarioVariation } from "../scenarios/scenario-definition.js";
import { buildRoleplayMessages } from "./roleplay-prompt.js";

const negotiationVariation: ScenarioVariation = {
  id: "tight-budget",
  category: "TIGHT_BUDGET",
  openingMessage: "Variation opening.",
  situation: "Variation situation context.",
  counterpartBrief: "Your budget is frozen until next quarter.",
};

const interviewVariation: ScenarioVariation = {
  id: "early-career-track",
  category: "EARLY_CAREER",
  openingMessage: "Tell me about yourself.",
  interviewTrack: {
    questions: [
      { category: "INTRODUCTION", question: "Tell me about yourself." },
      {
        category: "TEAMWORK_CONFLICT",
        question: "Describe a conflict you navigated on a team.",
      },
      {
        category: "FAILURE_LEARNING",
        question: "Tell me about a failure and what you learned.",
      },
    ],
  },
};

describe("roleplay prompt", () => {
  it.each(
    scenarioDefinitions.flatMap((scenario) =>
      (["EASY", "MEDIUM", "HARD"] as const).map((difficulty) => ({
        scenario,
        difficulty,
      })),
    ),
  )(
    "builds $scenario.key at $difficulty with its authoritative behavior",
    ({ scenario, difficulty }) => {
      const messages = buildRoleplayMessages({
        scenario,
        difficulty,
        previousTurns: [],
        latestLearnerMessage: "A substantive learner response.",
      });

      expect(messages[0]?.content).toContain(`Difficulty: ${difficulty}`);
      expect(messages[0]?.content).toContain(
        scenario.difficulties[difficulty].behaviorGuidance,
      );
      expect(messages[1]).toEqual({
        role: "assistant",
        content: scenario.openingMessage,
      });
    },
  );

  it("assembles authoritative completed turns chronologically before the latest message", () => {
    const messages = buildRoleplayMessages({
      scenario: salaryNegotiationV1,
      difficulty: "MEDIUM",
      previousTurns: [
        { sequence: 2, userText: "user-2", assistantText: "assistant-2" },
        { sequence: 1, userText: "user-1", assistantText: "assistant-1" },
      ],
      latestLearnerMessage: "latest-user-message",
    });

    expect(messages.map(({ role, content }) => [role, content])).toEqual([
      [
        "system",
        expect.stringContaining(
          "Workplace roleplay prompt version: roleplay-v2",
        ),
      ],
      ["assistant", salaryNegotiationV1.openingMessage],
      ["user", "user-1"],
      ["assistant", "assistant-1"],
      ["user", "user-2"],
      ["assistant", "assistant-2"],
      ["user", "latest-user-message"],
    ]);
    expect(messages[0]?.content).toContain(
      salaryNegotiationV1.difficulties.MEDIUM.behaviorGuidance,
    );
    expect(messages[0]?.content).toContain("Never coach, score, evaluate");
  });

  it("renders no variation sections and the base opening without a variation", () => {
    const messages = buildRoleplayMessages({
      scenario: salaryNegotiationV1,
      difficulty: "MEDIUM",
      previousTurns: [],
      latestLearnerMessage: "learner message",
      variation: null,
    });

    const system = messages[0]?.content ?? "";
    expect(system).not.toContain("Session plan");
    expect(system).not.toContain("This conversation");
    expect(system).toContain(salaryNegotiationV1.publicContext.description);
    expect(messages[1]).toEqual({
      role: "assistant",
      content: salaryNegotiationV1.openingMessage,
    });
  });

  it("seeds the variation opening and injects the hidden variation context", () => {
    const messages = buildRoleplayMessages({
      scenario: salaryNegotiationV1,
      difficulty: "MEDIUM",
      previousTurns: [],
      latestLearnerMessage: "learner message",
      variation: negotiationVariation,
    });

    expect(messages[1]).toEqual({
      role: "assistant",
      content: "Variation opening.",
    });
    const system = messages[0]?.content ?? "";
    expect(system).toContain("Situation\nVariation situation context.");
    expect(system).toContain("This conversation");
    expect(system).toContain("Your budget is frozen until next quarter.");
    expect(system).not.toContain("Session plan");
  });

  it("renders the interview track as a flexible session plan with conduct rules", () => {
    const messages = buildRoleplayMessages({
      scenario: behavioralInterviewV1,
      difficulty: "HARD",
      previousTurns: [],
      latestLearnerMessage: "learner message",
      variation: interviewVariation,
    });

    expect(messages[1]).toEqual({
      role: "assistant",
      content: "Tell me about yourself.",
    });
    const system = messages[0]?.content ?? "";
    expect(system).toContain("Session plan");
    expect(system).toContain("1. [INTRODUCTION] Tell me about yourself.");
    expect(system).toContain(
      "2. [TEAMWORK_CONFLICT] Describe a conflict you navigated on a team.",
    );
    expect(system).toContain(
      "3. [FAILURE_LEARNING] Tell me about a failure and what you learned.",
    );
    expect(system).toContain(
      "Ask natural follow-ups based on the learner's actual answer before moving on.",
    );
    expect(system).toContain("never ask every question mechanically");
    expect(system).toContain(
      "Never repeat an already-answered question except to clarify.",
    );
    expect(system).toContain(
      "Difficulty controls follow-up pressure and challenge",
    );
    expect(system).toContain("Difficulty: HARD");
    expect(system).toContain(
      behavioralInterviewV1.difficulties.HARD.behaviorGuidance,
    );
  });
});
