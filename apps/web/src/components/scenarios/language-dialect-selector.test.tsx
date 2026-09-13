// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/locale-context";
import {
  LanguageDialectSelector,
  type LanguageDialectSelectorProps,
} from "./language-dialect-selector";

describe("LanguageDialectSelector", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps: LanguageDialectSelectorProps = {
    language: "en",
    dialect: "EGYPTIAN",
    onSelectLanguage: vi.fn(),
    onSelectDialect: vi.fn(),
  };

  it("renders English and Arabic language options with English selected by default", () => {
    render(<LanguageDialectSelector {...defaultProps} />);

    const englishBtn = screen.getByRole("button", { name: /english/i });
    const arabicBtn = screen.getByRole("button", { name: /العربية/i });

    expect(englishBtn).toBeDefined();
    expect(arabicBtn).toBeDefined();

    expect(englishBtn.getAttribute("aria-pressed")).toBe("true");
    expect(arabicBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("applies Warm Coral styling tokens and min-h-[44px] to language options", () => {
    render(<LanguageDialectSelector {...defaultProps} />);

    const englishBtn = screen.getByRole("button", { name: /english/i });
    const arabicBtn = screen.getByRole("button", { name: /العربية/i });

    expect(englishBtn.className).toContain("bg-selected-surface");
    expect(englishBtn.className).toContain("border-primary");
    expect(englishBtn.className).toContain("min-h-[44px]");

    expect(arabicBtn.className).toContain("bg-surface-solid");
    expect(arabicBtn.className).toContain("border-border-subtle");
    expect(arabicBtn.className).toContain("min-h-[44px]");
  });

  it("does not render dialect options when English is selected", () => {
    render(<LanguageDialectSelector {...defaultProps} language="en" />);

    expect(screen.queryByText(/اختر اللهجة/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /لهجة مصرية/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /لهجة خليجية/i })).toBeNull();
  });

  it("renders dialect options when Arabic is selected with Warm Coral tokens", () => {
    render(
      <LanguageDialectSelector
        {...defaultProps}
        language="ar"
        dialect="EGYPTIAN"
      />,
    );

    expect(screen.getByText(/اختر اللهجة/i)).toBeDefined();

    const egyptianBtn = screen.getByRole("button", { name: /لهجة مصرية/i });
    const gulfBtn = screen.getByRole("button", { name: /لهجة خليجية/i });

    expect(egyptianBtn).toBeDefined();
    expect(gulfBtn).toBeDefined();

    expect(egyptianBtn.getAttribute("aria-pressed")).toBe("true");
    expect(gulfBtn.getAttribute("aria-pressed")).toBe("false");

    expect(egyptianBtn.className).toContain("bg-selected-surface");
    expect(egyptianBtn.className).toContain("border-primary");
    expect(egyptianBtn.className).toContain("min-h-[44px]");

    expect(gulfBtn.className).toContain("bg-surface-solid");
    expect(gulfBtn.className).toContain("border-border-subtle");
    expect(gulfBtn.className).toContain("min-h-[44px]");
  });

  it("highlights Gulf dialect when selected", () => {
    render(
      <LanguageDialectSelector
        {...defaultProps}
        language="ar"
        dialect="GULF"
      />,
    );

    const egyptianBtn = screen.getByRole("button", { name: /لهجة مصرية/i });
    const gulfBtn = screen.getByRole("button", { name: /لهجة خليجية/i });

    expect(egyptianBtn.getAttribute("aria-pressed")).toBe("false");
    expect(gulfBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("fires onSelectLanguage when a language button is clicked", () => {
    const onSelectLanguage = vi.fn();
    render(
      <LanguageDialectSelector
        {...defaultProps}
        onSelectLanguage={onSelectLanguage}
      />,
    );

    const arabicBtn = screen.getByRole("button", { name: /العربية/i });
    fireEvent.click(arabicBtn);

    expect(onSelectLanguage).toHaveBeenCalledTimes(1);
    expect(onSelectLanguage).toHaveBeenCalledWith("ar");
  });

  it("fires onSelectDialect when a dialect button is clicked", () => {
    const onSelectDialect = vi.fn();
    render(
      <LanguageDialectSelector
        {...defaultProps}
        language="ar"
        dialect="EGYPTIAN"
        onSelectDialect={onSelectDialect}
      />,
    );

    const gulfBtn = screen.getByRole("button", { name: /لهجة خليجية/i });
    fireEvent.click(gulfBtn);

    expect(onSelectDialect).toHaveBeenCalledTimes(1);
    expect(onSelectDialect).toHaveBeenCalledWith("GULF");
  });

  it("renders Arabic headers when rendered within Arabic LocaleProvider", () => {
    render(
      <LocaleProvider defaultLocale="ar">
        <LanguageDialectSelector
          {...defaultProps}
          language="ar"
          dialect="EGYPTIAN"
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("اختر لغة المحادثة")).toBeDefined();
    expect(
      screen.getByText("تحدد لغة الحوار الأساسية ولغة المحاور"),
    ).toBeDefined();
    expect(screen.getByText("اختر اللهجة")).toBeDefined();
    expect(
      screen.getByText("اختر اللهجة العامية العربية للمحاور"),
    ).toBeDefined();
  });
});
