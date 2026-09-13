// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicScenarioSummary } from "@kalemny/contracts";

import { LocaleProvider } from "@/lib/locale-context";
import { ScenarioCard } from "./scenario-card";
import { CuratedScenarioGrid } from "./curated-scenario-grid";

const mockScenario: PublicScenarioSummary = {
  key: "salary-negotiation",
  version: 2,
  title: "Salary Negotiation",
  titleAr: "التفاوض على الراتب",
  category: "NEGOTIATION",
  summary: "Practice negotiating compensation confidently.",
  summaryAr: "تدرّب على التفاوض بثقة لتحقيق شروط أفضل.",
};

const mockScenarios: PublicScenarioSummary[] = [
  mockScenario,
  {
    key: "behavioral-interview",
    version: 1,
    title: "Behavioral Interview",
    titleAr: "المقابلة السلوكية",
    category: "INTERVIEW",
    summary: "Answer behavioral questions using STAR method.",
    summaryAr: "أجب عن الأسئلة السلوكية باستخدام منهجية STAR.",
  },
];

describe("ScenarioCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders scenario title, summary, and category in English", () => {
    const onSelect = vi.fn();
    render(<ScenarioCard scenario={mockScenario} onSelect={onSelect} />);

    expect(screen.getByText("Salary Negotiation")).toBeDefined();
    expect(
      screen.getByText("Practice negotiating compensation confidently."),
    ).toBeDefined();
    expect(screen.getByText("NEGOTIATION")).toBeDefined();
    expect(screen.getByText("View practice setup")).toBeDefined();
  });

  it("renders Arabic content when wrapped in Arabic LocaleProvider", () => {
    const onSelect = vi.fn();
    render(
      <LocaleProvider defaultLocale="ar">
        <ScenarioCard scenario={mockScenario} onSelect={onSelect} />
      </LocaleProvider>,
    );

    expect(screen.getByText("التفاوض على الراتب")).toBeDefined();
    expect(
      screen.getByText("تدرّب على التفاوض بثقة لتحقيق شروط أفضل."),
    ).toBeDefined();
    expect(screen.getByText("تفاصيل التدرّب")).toBeDefined();
  });

  it("displays the Recommended badge when isRecommended is true and omits it when false", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ScenarioCard
        scenario={mockScenario}
        isRecommended={true}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Recommended")).toBeDefined();

    rerender(
      <ScenarioCard
        scenario={mockScenario}
        isRecommended={false}
        onSelect={onSelect}
      />,
    );
    expect(screen.queryByText("Recommended")).toBeNull();
  });

  it("displays Arabic Recommended badge when isRecommended is true in Arabic", () => {
    const onSelect = vi.fn();
    render(
      <LocaleProvider defaultLocale="ar">
        <ScenarioCard
          scenario={mockScenario}
          isRecommended={true}
          onSelect={onSelect}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("مقترح لك")).toBeDefined();
  });

  it("triggers onSelect with scenario key when clicking the action button", () => {
    const onSelect = vi.fn();
    render(<ScenarioCard scenario={mockScenario} onSelect={onSelect} />);

    const actionButton = screen.getByRole("button", {
      name: /view practice setup/i,
    });
    fireEvent.click(actionButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("salary-negotiation");
  });
});

describe("CuratedScenarioGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders section header, count badge, subtitle, and scenario cards", () => {
    const onSelectScenario = vi.fn();
    render(
      <CuratedScenarioGrid
        scenarios={mockScenarios}
        recommendedKey="salary-negotiation"
        onSelectScenario={onSelectScenario}
      />,
    );

    expect(screen.getByText("Practice Scenarios")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("Salary Negotiation")).toBeDefined();
    expect(screen.getByText("Behavioral Interview")).toBeDefined();
    expect(screen.getByText("Recommended")).toBeDefined();
  });

  it("renders section header and scenarios in Arabic with Arabic LocaleProvider", () => {
    const onSelectScenario = vi.fn();
    render(
      <LocaleProvider defaultLocale="ar">
        <CuratedScenarioGrid
          scenarios={mockScenarios}
          recommendedKey="salary-negotiation"
          onSelectScenario={onSelectScenario}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("سيناريوهات التدرّب")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("التفاوض على الراتب")).toBeDefined();
    expect(screen.getByText("المقابلة السلوكية")).toBeDefined();
    expect(screen.getByText("مقترح لك")).toBeDefined();
  });

  it("triggers onSelectScenario when a scenario card action button is clicked", () => {
    const onSelectScenario = vi.fn();
    render(
      <CuratedScenarioGrid
        scenarios={mockScenarios}
        onSelectScenario={onSelectScenario}
      />,
    );

    const buttons = screen.getAllByRole("button", {
      name: /view practice setup/i,
    });
    expect(buttons.length).toBe(2);

    const secondButton = buttons[1];
    expect(secondButton).toBeDefined();
    if (secondButton) {
      fireEvent.click(secondButton);
    }
    expect(onSelectScenario).toHaveBeenCalledTimes(1);
    expect(onSelectScenario).toHaveBeenCalledWith("behavioral-interview");
  });
});
