// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/locale-context";
import {
  DifficultySelector,
  type DifficultySelectorProps,
} from "./difficulty-selector";

describe("DifficultySelector", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps: DifficultySelectorProps = {
    availableDifficulties: ["EASY", "MEDIUM", "HARD"],
    selectedDifficulty: "MEDIUM",
    onSelectDifficulty: vi.fn(),
  };

  it("renders English copy and Warm Coral classes by default", () => {
    render(
      <LocaleProvider defaultLocale="en">
        <DifficultySelector {...defaultProps} />
      </LocaleProvider>,
    );

    expect(screen.getByText("Choose difficulty")).toBeDefined();
    expect(
      screen.getByText("Calibrates counterpart skepticism and objection thresholds"),
    ).toBeDefined();

    const easyBtn = screen.getByRole("button", { name: /easy/i });
    const mediumBtn = screen.getByRole("button", { name: /medium/i });
    const hardBtn = screen.getByRole("button", { name: /hard/i });

    expect(easyBtn).toBeDefined();
    expect(mediumBtn).toBeDefined();
    expect(hardBtn).toBeDefined();

    expect(screen.getByText("Supportive Counterpart")).toBeDefined();
    expect(screen.getByText("Realistic Pushback")).toBeDefined();
    expect(screen.getByText("Challenging Negotiation")).toBeDefined();

    expect(screen.getByText("Recommended")).toBeDefined();

    // Medium is selected
    expect(mediumBtn.getAttribute("aria-pressed")).toBe("true");
    expect(mediumBtn.className).toContain("bg-selected-surface");
    expect(mediumBtn.className).toContain("border-primary");
    expect(mediumBtn.className).toContain("min-h-[44px]");

    // Easy is unselected
    expect(easyBtn.getAttribute("aria-pressed")).toBe("false");
    expect(easyBtn.className).toContain("bg-surface-solid");
    expect(easyBtn.className).toContain("border-border-subtle");
    expect(easyBtn.className).toContain("min-h-[44px]");
  });

  it("renders Arabic copy when locale is ar", () => {
    render(
      <LocaleProvider defaultLocale="ar">
        <DifficultySelector {...defaultProps} />
      </LocaleProvider>,
    );

    expect(screen.getByText("اختر مستوى الصعوبة")).toBeDefined();
    expect(
      screen.getByText("يحدد مستوى تشكك المحاور وتعامله مع حججك المهنية"),
    ).toBeDefined();

    const easyBtn = screen.getByRole("button", { name: /أساسي/i });
    const mediumBtn = screen.getByRole("button", { name: /متوسط/i });
    const hardBtn = screen.getByRole("button", { name: /متقدم/i });

    expect(easyBtn).toBeDefined();
    expect(mediumBtn).toBeDefined();
    expect(hardBtn).toBeDefined();

    expect(screen.getByText("محاور داعم")).toBeDefined();
    expect(screen.getByText("اعتراضات واقعية")).toBeDefined();
    expect(screen.getByText("تفاوض صعب")).toBeDefined();

    expect(
      screen.getByText("يتقبل الأفكار المنطقية بسهولة مع أقل قدر من الاعتراضات."),
    ).toBeDefined();
    expect(
      screen.getByText(
        "اعتراضات مهنية واقعية وتحدي الطروحات غير المدعومة بأدلة.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "محاور حذر ومشكك يختبر قوة حجتك وحدودك المهنية بصرامة.",
      ),
    ).toBeDefined();

    expect(screen.getByText("موصى به")).toBeDefined();
  });

  it("fires onSelectDifficulty callback with selected difficulty", () => {
    const onSelectDifficulty = vi.fn();
    render(
      <LocaleProvider defaultLocale="en">
        <DifficultySelector
          {...defaultProps}
          onSelectDifficulty={onSelectDifficulty}
        />
      </LocaleProvider>,
    );

    const hardBtn = screen.getByRole("button", { name: /hard/i });
    fireEvent.click(hardBtn);

    expect(onSelectDifficulty).toHaveBeenCalledTimes(1);
    expect(onSelectDifficulty).toHaveBeenCalledWith("HARD");

    const easyBtn = screen.getByRole("button", { name: /easy/i });
    fireEvent.click(easyBtn);

    expect(onSelectDifficulty).toHaveBeenCalledTimes(2);
    expect(onSelectDifficulty).toHaveBeenCalledWith("EASY");
  });

  it("disables options that are not in availableDifficulties and prevents clicking", () => {
    const onSelectDifficulty = vi.fn();
    render(
      <LocaleProvider defaultLocale="en">
        <DifficultySelector
          {...defaultProps}
          availableDifficulties={["EASY", "MEDIUM"]}
          selectedDifficulty="EASY"
          onSelectDifficulty={onSelectDifficulty}
        />
      </LocaleProvider>,
    );

    const easyBtn = screen.getByRole("button", { name: /easy/i });
    const mediumBtn = screen.getByRole("button", { name: /medium/i });
    const hardBtn = screen.getByRole("button", { name: /hard/i });

    expect(easyBtn.hasAttribute("disabled")).toBe(false);
    expect(mediumBtn.hasAttribute("disabled")).toBe(false);
    expect(hardBtn.hasAttribute("disabled")).toBe(true);
    expect(hardBtn.getAttribute("aria-disabled")).toBe("true");
    expect(hardBtn.className).toContain("cursor-not-allowed");
    expect(hardBtn.className).toContain("opacity-50");

    // Clicking disabled button does not trigger callback
    fireEvent.click(hardBtn);
    expect(onSelectDifficulty).not.toHaveBeenCalled();

    // Clicking available button triggers callback
    fireEvent.click(mediumBtn);
    expect(onSelectDifficulty).toHaveBeenCalledTimes(1);
    expect(onSelectDifficulty).toHaveBeenCalledWith("MEDIUM");
  });
});
