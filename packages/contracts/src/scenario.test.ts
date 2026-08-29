import { describe, expect, it } from "vitest";

import {
  ScenarioDetailResponseSchema,
  ScenarioListResponseSchema,
} from "./scenario.js";

const publicSummary = {
  key: "salary-negotiation",
  version: 1,
  title: "Salary Negotiation",
  category: "NEGOTIATION",
  summary: "Practice discussing compensation for a new role.",
};

describe("scenario public contracts", () => {
  it("accepts the public list and detail response shapes", () => {
    expect(ScenarioListResponseSchema.parse({ data: [publicSummary] })).toEqual(
      { data: [publicSummary] },
    );

    expect(
      ScenarioDetailResponseSchema.parse({
        data: {
          ...publicSummary,
          context: {
            description: "You have received a job offer.",
            userRole: "The candidate",
            aiRole: "The hiring manager",
            userObjective: "Negotiate a stronger compensation package.",
            stakes: "The offer is attractive, but below your target.",
          },
          availableDifficulties: ["EASY", "MEDIUM", "HARD"],
        },
      }),
    ).toBeTruthy();
  });

  it("strips backend-only scenario fields from parsed DTOs", () => {
    const parsed = ScenarioDetailResponseSchema.parse({
      data: {
        ...publicSummary,
        context: {
          description: "You have received a job offer.",
          userRole: "The candidate",
          aiRole: "The hiring manager",
          userObjective: "Negotiate a stronger compensation package.",
          stakes: "The offer is attractive, but below your target.",
        },
        availableDifficulties: ["MEDIUM"],
        persona: { traits: ["guarded"] },
        aiObjective: "Protect the compensation band.",
        motivations: ["Internal equity"],
        constraints: ["Budget"],
        objectives: [{ id: "CLEAR_REQUEST" }],
        openingMessage: "Hidden until an attempt starts.",
        roleplayRules: ["Stay in character"],
      },
    });

    expect(Object.keys(parsed.data)).toEqual([
      "key",
      "version",
      "title",
      "category",
      "summary",
      "context",
      "availableDifficulties",
    ]);
  });
});
