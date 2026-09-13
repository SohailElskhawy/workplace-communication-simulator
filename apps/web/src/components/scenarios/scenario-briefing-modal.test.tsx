// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicScenarioDetail } from "@kalemny/contracts";

import { LocaleProvider } from "@/lib/locale-context";
import {
  ScenarioBriefingModal,
  type ScenarioBriefingModalProps,
} from "./scenario-briefing-modal";

const mockScenario: PublicScenarioDetail = {
  key: "salary-negotiation",
  version: 2,
  title: "Salary Negotiation",
  titleAr: "التفاوض على الراتب",
  category: "NEGOTIATION",
  summary: "Practice negotiating compensation confidently.",
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
    stakes: "Improve salary package without losing the offer.",
    stakesAr: "تحسين العرض المالي دون خسارة الفرصة.",
  },
};

describe("ScenarioBriefingModal", () => {
  afterEach(() => {
    cleanup();
  });

  const createProps = (
    overrides: Partial<ScenarioBriefingModalProps> = {},
  ): ScenarioBriefingModalProps => ({
    open: true,
    scenario: mockScenario,
    remainingQuota: 3,
    onClose: vi.fn(),
    onStartPractice: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it("renders situation, roles, and objective when open={true}", () => {
    const props = createProps();
    render(<ScenarioBriefingModal {...props} />);

    // Header & Counterpart Profile
    expect(screen.getByText("Salary Negotiation")).toBeDefined();
    expect(screen.getByText("Speaking with: The hiring manager")).toBeDefined();
    expect(screen.getByText("NEGOTIATION")).toBeDefined();

    // Context Cards
    expect(screen.getByText("Situation")).toBeDefined();
    expect(
      screen.getByText("You received an offer below expectations."),
    ).toBeDefined();

    expect(screen.getByText("Your Role")).toBeDefined();
    expect(screen.getByText("The job candidate")).toBeDefined();

    expect(screen.getByText("Counterpart Role")).toBeDefined();
    expect(screen.getByText("The hiring manager")).toBeDefined();

    expect(screen.getByText("Primary Objective")).toBeDefined();
    expect(
      screen.getByText("Make a professional case for higher base salary."),
    ).toBeDefined();

    // Footer notice & buttons
    expect(
      screen.getByText(
        "Starting this practice will consume 1 of your 3 weekly sessions.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Start Practice" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined();
  });

  it("renders Arabic situation, roles, and objective when wrapped in Arabic LocaleProvider", () => {
    const props = createProps();
    render(
      <LocaleProvider defaultLocale="ar">
        <ScenarioBriefingModal {...props} />
      </LocaleProvider>,
    );

    expect(screen.getByText("التفاوض على الراتب")).toBeDefined();
    expect(screen.getByText("تتحدث مع: مدير التوظيف")).toBeDefined();
    expect(screen.getByText("الموقف")).toBeDefined();
    expect(screen.getByText("تلقيت عرض عمل أقل من توقعاتك.")).toBeDefined();
    expect(screen.getByText("دورك")).toBeDefined();
    expect(screen.getByText("المرشح الذي تلقى العرض")).toBeDefined();
    expect(screen.getByText("دور المحاور")).toBeDefined();
    expect(screen.getByText("مدير التوظيف")).toBeDefined();
    expect(screen.getByText("هدفك الأساسي")).toBeDefined();
    expect(
      screen.getByText("تقديم حجة مهنية واضحة لتحسين الراتب."),
    ).toBeDefined();

    expect(
      screen.getByText(
        "بدء هذه الجلسة سيستهلك 1 من جلساتك الأسبوعية الـ 3 المتاحة.",
      ),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "ابدأ التدرّب" })).toBeDefined();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDefined();
  });

  it("updates state when changing difficulty, language, dialect, and practice mode", async () => {
    const onStartPractice = vi.fn().mockResolvedValue(undefined);
    const props = createProps({ onStartPractice });
    render(<ScenarioBriefingModal {...props} />);

    // 1. Change difficulty to HARD
    const hardBtn = screen.getByRole("button", { name: /hard/i });
    fireEvent.click(hardBtn);
    expect(hardBtn.getAttribute("aria-pressed")).toBe("true");

    // 2. Change language to Arabic
    const arabicBtn = screen.getByRole("button", { name: /العربية/i });
    fireEvent.click(arabicBtn);
    expect(arabicBtn.getAttribute("aria-pressed")).toBe("true");

    // 3. Dialect options should now be visible; select Gulf dialect
    const gulfBtn = screen.getByRole("button", { name: /لهجة خليجية/i });
    expect(gulfBtn).toBeDefined();
    fireEvent.click(gulfBtn);
    expect(gulfBtn.getAttribute("aria-pressed")).toBe("true");

    // 4. Change practice mode to REALTIME
    const realtimeBtn = screen.getByRole("button", {
      name: /live call|مكالمة صوتية مباشرة/i,
    });
    fireEvent.click(realtimeBtn);
    expect(realtimeBtn.getAttribute("aria-pressed")).toBe("true");

    // 5. Click Start Practice
    const startBtn = screen.getByRole("button", {
      name: /start practice|ابدأ التدرّب/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(onStartPractice).toHaveBeenCalledTimes(1);
      expect(onStartPractice).toHaveBeenCalledWith({
        difficulty: "HARD",
        language: "ar",
        dialect: "GULF",
        interactionMode: "REALTIME",
      });
    });
  });

  it("preserves user-selected configuration across parent re-renders with new scenario object reference while open", () => {
    const props = createProps();
    const { rerender } = render(<ScenarioBriefingModal {...props} />);

    // Change difficulty to HARD
    const hardBtn = screen.getByRole("button", { name: /hard/i });
    fireEvent.click(hardBtn);
    expect(hardBtn.getAttribute("aria-pressed")).toBe("true");

    // Parent re-renders with new object reference for the same scenario
    rerender(
      <ScenarioBriefingModal
        {...props}
        scenario={{ ...mockScenario }}
      />,
    );

    // Hard button should remain selected, NOT wiped back to MEDIUM
    const hardBtnAfter = screen.getByRole("button", { name: /hard/i });
    expect(hardBtnAfter.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onStartPractice with default configuration when clicking Start Practice without changes", async () => {
    const onStartPractice = vi.fn().mockResolvedValue(undefined);
    const props = createProps({ onStartPractice });
    render(<ScenarioBriefingModal {...props} />);

    const startBtn = screen.getByRole("button", { name: "Start Practice" });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(onStartPractice).toHaveBeenCalledTimes(1);
      expect(onStartPractice).toHaveBeenCalledWith({
        difficulty: "MEDIUM",
        language: "en",
        interactionMode: "PUSH_TO_TALK",
      });
    });
  });

  it("disables Start Practice and displays quota warning when remainingQuota is 0", () => {
    const onStartPractice = vi.fn().mockResolvedValue(undefined);
    const props = createProps({
      remainingQuota: 0,
      onStartPractice,
    });
    render(<ScenarioBriefingModal {...props} />);

    // Warning alert is displayed
    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toMatch(/weekly quota is exhausted/i);
    expect(alert.textContent).toMatch(/rolling 7-day/i);

    // Start Practice button is disabled
    const startBtn = screen.getByRole("button", { name: "Start Practice" });
    expect(startBtn.hasAttribute("disabled")).toBe(true);

    // Clicking does not call onStartPractice
    fireEvent.click(startBtn);
    expect(onStartPractice).not.toHaveBeenCalled();
  });

  it("invokes onClose when clicking Cancel", () => {
    const onClose = vi.fn();
    const props = createProps({ onClose });
    render(<ScenarioBriefingModal {...props} />);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays error alert when startError occurs during onStartPractice", async () => {
    const onStartPractice = vi
      .fn()
      .mockRejectedValue(new Error("Network connection lost"));
    const props = createProps({ onStartPractice });
    render(<ScenarioBriefingModal {...props} />);

    const startBtn = screen.getByRole("button", { name: "Start Practice" });
    fireEvent.click(startBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("Network connection lost");
    });
  });

  it("displays error alert when error prop is provided", () => {
    const props = createProps({
      error: "Unable to load scenario briefing",
    });
    render(<ScenarioBriefingModal {...props} />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain("Unable to load scenario briefing");
  });

  it("displays loading state when loading={true}", () => {
    const props = createProps({
      loading: true,
      scenario: null,
    });
    render(<ScenarioBriefingModal {...props} />);

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText("Loading scenario details...")).toBeDefined();
  });

  it("does not render dialog content when open={false}", () => {
    const props = createProps({ open: false });
    render(<ScenarioBriefingModal {...props} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
