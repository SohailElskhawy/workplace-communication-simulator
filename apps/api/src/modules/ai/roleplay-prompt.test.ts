import { describe, expect, it } from "vitest";

import { scenarioDefinitions } from "../scenarios/definitions/index.js";
import { salaryNegotiationV1 } from "../scenarios/definitions/salary-negotiation.js";
import { buildRoleplayMessages } from "./roleplay-prompt.js";

describe("roleplay-v1 prompt", () => {
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
          "Workplace roleplay prompt version: roleplay-v1",
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
});
