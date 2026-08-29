import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { ScenarioDefinitionSchema } from "./scenario-definition.js";

describe("ScenarioDefinitionSchema", () => {
  it("validates Salary Negotiation v1 and all three difficulty profiles", () => {
    const definition = ScenarioDefinitionSchema.parse(salaryNegotiationV1);

    expect(Object.keys(definition.difficulties)).toEqual([
      "EASY",
      "MEDIUM",
      "HARD",
    ]);
    expect(definition.objectives.map(({ id }) => id)).toEqual([
      "CLEAR_REQUEST",
      "EVIDENCE_BASED_CASE",
      "COLLABORATIVE_RESPONSE",
      "CONCRETE_NEXT_STEP",
    ]);
  });

  it("rejects an out-of-range difficulty axis", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        difficulties: {
          ...salaryNegotiationV1.difficulties,
          HARD: {
            ...salaryNegotiationV1.difficulties.HARD,
            objectionIntensity: 6,
          },
        },
      }),
    ).toThrow();
  });

  it("rejects invalid scenario versions and objective IDs", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        version: 0,
        objectives: [
          { ...salaryNegotiationV1.objectives[0], id: "not-public-safe" },
        ],
      }),
    ).toThrow();
  });
});
