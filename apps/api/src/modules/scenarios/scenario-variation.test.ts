import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { ScenarioDefinitionSchema } from "./scenario-definition.js";
import {
  resolveScenarioVariation,
  selectScenarioVariation,
} from "./scenario-variation.js";

function createDefinitionWithVariations() {
  return ScenarioDefinitionSchema.parse({
    ...salaryNegotiationV1,
    variations: [
      {
        id: "standard-offer",
        category: "STANDARD_OFFER",
        openingMessage: "Standard opening.",
      },
      {
        id: "tight-budget",
        category: "TIGHT_BUDGET",
        openingMessage: "Tight budget opening.",
      },
      {
        id: "competing-offer",
        category: "COMPETING_OFFER",
        openingMessage: "Competing offer opening.",
      },
    ],
  });
}

describe("selectScenarioVariation", () => {
  it("returns null when the definition has no variations", () => {
    expect(selectScenarioVariation(salaryNegotiationV1)).toBeNull();
    expect(
      selectScenarioVariation(salaryNegotiationV1, {
        excludeVariationId: "standard-offer",
      }),
    ).toBeNull();
  });

  it("returns the only variation even when it matches the excluded id", () => {
    const definition = createDefinitionWithVariations();
    const single = ScenarioDefinitionSchema.parse({
      ...salaryNegotiationV1,
      variations: [
        {
          id: "standard-offer",
          category: "STANDARD_OFFER",
          openingMessage: "Standard opening.",
        },
      ],
    });

    expect(selectScenarioVariation(single)).toEqual(
      single.variations?.[0] ?? null,
    );
    expect(
      selectScenarioVariation(single, { excludeVariationId: "standard-offer" }),
    ).toEqual(single.variations?.[0] ?? null);
    expect(definition.variations).toHaveLength(3);
  });

  it("excludes the retry source's variation when the pool has more than one", () => {
    const definition = createDefinitionWithVariations();

    expect(
      selectScenarioVariation(definition, {
        excludeVariationId: "standard-offer",
        random: () => 0,
      })?.id,
    ).toBe("tight-budget");
    expect(
      selectScenarioVariation(definition, {
        excludeVariationId: "competing-offer",
        random: () => 0,
      })?.id,
    ).toBe("standard-offer");
  });

  it("ignores exclusion ids that are not in the pool", () => {
    const definition = createDefinitionWithVariations();

    expect(
      selectScenarioVariation(definition, {
        excludeVariationId: "not-in-pool",
        random: () => 0.999,
      })?.id,
    ).toBe("competing-offer");
  });

  it("selects deterministically across the pool with an injected random", () => {
    const definition = createDefinitionWithVariations();

    expect(selectScenarioVariation(definition, { random: () => 0 })?.id).toBe(
      "standard-offer",
    );
    expect(
      selectScenarioVariation(definition, { random: () => 0.4 })?.id,
    ).toBe("tight-budget");
    expect(
      selectScenarioVariation(definition, { random: () => 0.999 })?.id,
    ).toBe("competing-offer");
  });
});

describe("resolveScenarioVariation", () => {
  it("returns the matching variation for a stored id", () => {
    const definition = createDefinitionWithVariations();

    expect(resolveScenarioVariation(definition, "tight-budget")?.id).toBe(
      "tight-budget",
    );
  });

  it("returns null for missing or unknown ids", () => {
    const definition = createDefinitionWithVariations();

    expect(resolveScenarioVariation(definition, "missing")).toBeNull();
    expect(resolveScenarioVariation(definition, null)).toBeNull();
    expect(resolveScenarioVariation(definition, undefined)).toBeNull();
    expect(resolveScenarioVariation(salaryNegotiationV1, "standard-offer")).toBeNull();
  });
});
