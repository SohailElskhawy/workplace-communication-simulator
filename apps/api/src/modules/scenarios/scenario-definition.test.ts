import { describe, expect, it } from "vitest";

import { scenarioDefinitions } from "./definitions/index.js";
import { behavioralInterviewV1 } from "./definitions/behavioral-interview.js";
import { difficultFeedbackV1 } from "./definitions/difficult-feedback.js";
import { managerPushbackV1 } from "./definitions/manager-pushback.js";
import { promotionRequestV1 } from "./definitions/promotion-request.js";
import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { scopeCreepV1 } from "./definitions/scope-creep.js";
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

  it("validates all six unique active Release 1 scenario definitions", () => {
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
      expect(definition.version).toBe(2);
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

describe("ScenarioDefinitionSchema variations", () => {
  const standardVariation = {
    id: "standard-offer",
    category: "STANDARD_OFFER",
    openingMessage: "Standard opening.",
  };
  const tightBudgetVariation = {
    id: "tight-budget",
    category: "TIGHT_BUDGET",
    openingMessage: "Tight budget opening.",
  };
  const competingOfferVariation = {
    id: "competing-offer",
    category: "COMPETING_OFFER",
    openingMessage: "Competing offer opening.",
  };

  const interviewVariation = {
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

  it("accepts definitions with a variation pool", () => {
    const definition = ScenarioDefinitionSchema.parse({
      ...salaryNegotiationV1,
      variations: [
        standardVariation,
        tightBudgetVariation,
        competingOfferVariation,
      ],
    });

    expect(definition.variations?.map(({ id }) => id)).toEqual([
      "standard-offer",
      "tight-budget",
      "competing-offer",
    ]);
  });

  it("accepts an interview track whose first question matches the opening", () => {
    const definition = ScenarioDefinitionSchema.parse({
      ...salaryNegotiationV1,
      variations: [interviewVariation],
    });

    expect(definition.variations?.[0]?.interviewTrack?.questions).toHaveLength(
      3,
    );
  });

  it("rejects duplicate variation ids", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [standardVariation, { ...standardVariation }],
      }),
    ).toThrow();
  });

  it("rejects invalid variation ids", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [{ ...standardVariation, id: "Standard Offer" }],
      }),
    ).toThrow();
  });

  it("rejects interview tracks with fewer than three questions", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [
          {
            ...interviewVariation,
            interviewTrack: {
              questions: interviewVariation.interviewTrack.questions.slice(0, 2),
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects interview tracks with more than five questions", () => {
    const questions = [
      { category: "INTRODUCTION", question: "Q1" },
      { category: "EXPERIENCE", question: "Q2" },
      { category: "TEAMWORK_CONFLICT", question: "Q3" },
      { category: "OWNERSHIP", question: "Q4" },
      { category: "PROBLEM_SOLVING", question: "Q5" },
      { category: "REFLECTION", question: "Q6" },
    ];
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [
          {
            ...interviewVariation,
            openingMessage: "Q1",
            interviewTrack: { questions },
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects duplicate categories within an interview track", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [
          {
            ...interviewVariation,
            interviewTrack: {
              questions: [
                { category: "INTRODUCTION", question: "Tell me about yourself." },
                { category: "INTRODUCTION", question: "Walk me through your background." },
                {
                  category: "FAILURE_LEARNING",
                  question: "Tell me about a failure and what you learned.",
                },
              ],
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects an interview track whose first question differs from the opening", () => {
    expect(() =>
      ScenarioDefinitionSchema.parse({
        ...salaryNegotiationV1,
        variations: [
          {
            ...interviewVariation,
            openingMessage: "A different opening question.",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("v1 preservation and v2 variation pools", () => {
  it("preserves all six v1 definitions for historical attempts", () => {
    const v1Definitions = [
      salaryNegotiationV1,
      behavioralInterviewV1,
      promotionRequestV1,
      managerPushbackV1,
      difficultFeedbackV1,
      scopeCreepV1,
    ];

    expect(v1Definitions).toHaveLength(6);
    for (const definition of v1Definitions) {
      const parsed = ScenarioDefinitionSchema.parse(definition);
      expect(parsed.version).toBe(1);
      expect(parsed.variations).toBeUndefined();
    }
  });

  it("gives every active scenario a curated variation pool", () => {
    for (const definition of scenarioDefinitions) {
      const variations = definition.variations ?? [];
      const minimum = definition.key === "behavioral-interview" ? 4 : 3;

      expect(variations.length).toBeGreaterThanOrEqual(minimum);
      expect(new Set(variations.map(({ id }) => id)).size).toBe(
        variations.length,
      );
      expect(
        new Set(variations.map(({ openingMessage }) => openingMessage)).size,
      ).toBe(variations.length);
      for (const variation of variations) {
        expect(variation.counterpartBrief).toBeTruthy();
      }
    }
  });

  it("covers every interview category across the behavioral interview tracks", () => {
    const interview = scenarioDefinitions.find(
      ({ key }) => key === "behavioral-interview",
    );
    if (!interview?.variations) {
      throw new Error("Expected behavioral interview variations");
    }

    const categories = new Set(
      interview.variations.flatMap(
        ({ interviewTrack }) =>
          interviewTrack?.questions.map(({ category }) => category) ?? [],
      ),
    );
    expect([...categories].sort()).toEqual([
      "ADAPTABILITY",
      "EXPERIENCE",
      "FAILURE_LEARNING",
      "INTRODUCTION",
      "OWNERSHIP",
      "PROBLEM_SOLVING",
      "REFLECTION",
      "TEAMWORK_CONFLICT",
    ]);

    for (const { interviewTrack } of interview.variations) {
      expect(interviewTrack?.questions.length).toBeGreaterThanOrEqual(3);
      expect(interviewTrack?.questions.length).toBeLessThanOrEqual(5);
    }
  });
});
