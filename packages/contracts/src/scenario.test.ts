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

  it("accepts localized Arabic scenario metadata in summary and context", () => {
    const localized = {
      key: "salary-negotiation",
      version: 2,
      title: "Salary Negotiation",
      titleAr: "التفاوض على الراتب",
      category: "NEGOTIATION",
      summary: "Practice discussing compensation for a new role.",
      summaryAr: "تفاوض بثقة على راتب عادل عند تلقي عرض عمل.",
      context: {
        description: "You have received a job offer.",
        descriptionAr: "تلقيت عرض عمل لوظيفة ترغب بها.",
        userRole: "The candidate",
        userRoleAr: "المرشح",
        aiRole: "The hiring manager",
        aiRoleAr: "مدير التوظيف",
        userObjective: "Negotiate a stronger compensation package.",
        userObjectiveAr: "تقديم حجة مهنية واضحة لتحسين الراتب.",
        stakes: "The offer is attractive, but below your target.",
        stakesAr: "العرض جذاب لكنه أقل من طموحك.",
      },
      availableDifficulties: ["EASY", "MEDIUM", "HARD"] as const,
    };

    const parsed = ScenarioDetailResponseSchema.parse({ data: localized });
    expect(parsed.data.titleAr).toBe("التفاوض على الراتب");
    expect(parsed.data.summaryAr).toBe("تفاوض بثقة على راتب عادل عند تلقي عرض عمل.");
    expect(parsed.data.context.descriptionAr).toBe("تلقيت عرض عمل لوظيفة ترغب بها.");
  });
});
