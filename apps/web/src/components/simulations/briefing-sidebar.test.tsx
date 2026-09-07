// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicScenarioDetail } from "@kalemny/contracts";

import { BriefingSidebar } from "./briefing-sidebar";

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

describe("BriefingSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders English sidebar briefing by default", () => {
    render(
      <BriefingSidebar
        scenarioDetail={mockScenario}
        scenarioTitle={mockScenario.title}
        counterpartRole={mockScenario.context.aiRole}
        userObjective={mockScenario.context.userObjective}
        isOpenMobile={false}
        onToggleMobile={vi.fn()}
        language="en"
      />,
    );

    expect(screen.getAllByText("Rehearsal Briefing").length).toBeGreaterThan(0);
    expect(screen.getByText("The hiring manager")).toBeDefined();
    expect(screen.getByText("Make a professional case for higher base salary.")).toBeDefined();
    expect(screen.getByText("You received an offer below expectations.")).toBeDefined();
    expect(screen.getByText("You want to improve package without losing offer.")).toBeDefined();
  });

  it("renders Arabic sidebar briefing when language is Arabic", () => {
    render(
      <BriefingSidebar
        scenarioDetail={mockScenario}
        scenarioTitle={mockScenario.titleAr!}
        counterpartRole={mockScenario.context.aiRoleAr!}
        userObjective={mockScenario.context.userObjectiveAr!}
        isOpenMobile={false}
        onToggleMobile={vi.fn()}
        language="ar"
      />,
    );

    expect(screen.getAllByText("ملخص التمرين").length).toBeGreaterThan(0);
    expect(screen.getByText("مدير التوظيف")).toBeDefined();
    expect(screen.getByText("تقديم حجة مهنية واضحة لتحسين الراتب.")).toBeDefined();
    expect(screen.getByText("تلقيت عرض عمل أقل من توقعاتك.")).toBeDefined();
    expect(screen.getByText("تريد تحسين العرض المالي دون خسارة الفرصة.")).toBeDefined();
  });
});
