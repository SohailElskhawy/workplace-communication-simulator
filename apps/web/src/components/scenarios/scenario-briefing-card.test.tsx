// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicScenarioDetail } from "@kalemny/contracts";

import { ScenarioBriefingCard } from "./scenario-briefing-card";

const mockScenario: PublicScenarioDetail = {
  key: "salary-negotiation",
  version: 2,
  title: "Salary Negotiation",
  titleAr: "التفاوض على الراتب",
  category: "NEGOTIATION",
  summary: "Practice negotiating compensation.",
  summaryAr: "تفاوض بثقة على راتب عادل.",
  availableDifficulties: ["EASY", "MEDIUM", "HARD"],
  context: {
    description: "You received an offer below expectations.",
    descriptionAr: "تلقيت عرض عمل أقل من توقعاتك.",
    userRole: "The job candidate",
    userRoleAr: "المرشح الذي تلقى العرض",
    aiRole: "The hiring manager",
    aiRoleAr: "مدير التوظيف",
    userObjective: "Make a professional case for higher base salary.",
    userObjectiveAr: "تقديم حجة مهنية واضحة لتحسين الراتب.",
    stakes: "You want to improve package without losing offer.",
    stakesAr: "تريد تحسين العرض المالي دون خسارة الفرصة.",
  },
};

describe("ScenarioBriefingCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders English context when language is English", () => {
    render(<ScenarioBriefingCard scenario={mockScenario} language="en" />);

    expect(screen.getByText("Rehearsal Briefing")).toBeDefined();
    expect(screen.getByText("Scenario Context & Objectives")).toBeDefined();
    expect(screen.getByText("You received an offer below expectations.")).toBeDefined();
    expect(screen.getByText("The job candidate")).toBeDefined();
    expect(screen.getByText("The hiring manager")).toBeDefined();
    expect(screen.getByText("Make a professional case for higher base salary.")).toBeDefined();
    expect(screen.getByText("You want to improve package without losing offer.")).toBeDefined();
  });

  it("renders Arabic context when language is Arabic", () => {
    render(<ScenarioBriefingCard scenario={mockScenario} language="ar" />);

    expect(screen.getByText("ملخص التمرين")).toBeDefined();
    expect(screen.getByText("سياق السيناريو والأهداف")).toBeDefined();
    expect(screen.getByText("تلقيت عرض عمل أقل من توقعاتك.")).toBeDefined();
    expect(screen.getByText("المرشح الذي تلقى العرض")).toBeDefined();
    expect(screen.getByText("مدير التوظيف")).toBeDefined();
    expect(screen.getByText("تقديم حجة مهنية واضحة لتحسين الراتب.")).toBeDefined();
    expect(screen.getByText("تريد تحسين العرض المالي دون خسارة الفرصة.")).toBeDefined();
  });
});
