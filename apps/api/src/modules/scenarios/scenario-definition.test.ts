import { describe, expect, it } from "vitest";

import { scenarioDefinitions } from "./definitions/index.js";
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

  it("validates all six unique Release 1 scenario definitions", () => {
    const definitions = scenarioDefinitions.map((definition) =>
      ScenarioDefinitionSchema.parse(definition),
    );

    expect(definitions).toHaveLength(6);
    expect(new Set(definitions.map(({ key }) => key)).size).toBe(6);
    expect(definitions.map(({ key }) => key)).toEqual([
      "salary-negotiation",
      "behavioral-interview",
      "promotion-request",
      "manager-pushback",
      "difficult-feedback",
      "scope-creep",
    ]);

    for (const definition of definitions) {
      expect(definition.version).toBe(1);
      expect(Object.keys(definition.difficulties)).toEqual([
        "EASY",
        "MEDIUM",
        "HARD",
      ]);
      expect(definition.objectives).toHaveLength(4);
      expect(new Set(definition.objectives.map(({ id }) => id)).size).toBe(
        definition.objectives.length,
      );
      expect(definition.difficulties.EASY.cooperativeness).toBeGreaterThan(
        definition.difficulties.HARD.cooperativeness,
      );
      expect(definition.difficulties.EASY.objectionIntensity).toBeLessThan(
        definition.difficulties.HARD.objectionIntensity,
      );
      expect(definition.difficulties.EASY.followUpPressure).toBeLessThan(
        definition.difficulties.HARD.followUpPressure,
      );
      expect(
        definition.difficulties.EASY.weakReasoningTolerance,
      ).toBeGreaterThan(definition.difficulties.HARD.weakReasoningTolerance);
      expect(definition.difficulties.EASY.concessionThreshold).toBeLessThan(
        definition.difficulties.HARD.concessionThreshold,
      );
    }
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
