// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { LocaleProvider } from "@/lib/locale-context";
import { TestingEntitlementCard } from "./testing-entitlement-card";

describe("TestingEntitlementCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading skeleton when loading={true}", () => {
    render(<TestingEntitlementCard remaining={2} limit={3} loading={true} />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeDefined();
    expect(skeleton.className).toContain("animate-pulse");
    expect(screen.getByText("Loading practice balance...")).toBeDefined();
  });

  it("renders balance text correctly for normal state in English", () => {
    const { container } = render(
      <TestingEntitlementCard remaining={2} limit={3} />,
    );

    expect(screen.getByText("Free Testing Access")).toBeDefined();
    expect(screen.getByText("2 of 3 remaining")).toBeDefined();
    expect(
      screen.getByText(
        "You have 2 of 3 free simulation sessions available. Sessions reset automatically on a rolling 7-day window.",
      ),
    ).toBeDefined();

    const section = container.querySelector("section");
    expect(section?.className).toContain("border-border-subtle");
    expect(section?.className).toContain("bg-surface-solid");
    expect(section?.className).not.toContain("bg-alert-surface");
  });

  it("renders alert state and message when remaining={0}", () => {
    const { container } = render(
      <TestingEntitlementCard remaining={0} limit={3} resetWindowDays={7} />,
    );

    expect(screen.getByText("0 of 3 remaining")).toBeDefined();
    expect(
      screen.getByText(
        "You have used all 3 sessions for this period. Practice quota resets automatically every 7 days.",
      ),
    ).toBeDefined();

    const section = container.querySelector("section");
    expect(section?.className).toContain("border-alert/30");
    expect(section?.className).toContain("bg-alert-surface");
    expect(section?.className).toContain("text-alert-foreground");
  });

  it("renders Arabic localization when rendered within Arabic LocaleContext", () => {
    const { container } = render(
      <LocaleProvider defaultLocale="ar">
        <TestingEntitlementCard remaining={2} limit={3} resetWindowDays={7} />
      </LocaleProvider>,
    );

    expect(screen.getByText("وصول مجاني للتجربة")).toBeDefined();
    expect(screen.getByText("متبقي 2 من 3")).toBeDefined();
    expect(
      screen.getByText(
        "لديك 2 من أصل 3 جلسات محاكاة مجانية هذا الأسبوع. تتجدد الجلسات تلقائياً كل 7 أيام.",
      ),
    ).toBeDefined();

    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-label")).toBe("رصيد التجربة الأسبوعي");
  });

  it("renders Arabic alert state when remaining={0} in Arabic LocaleContext", () => {
    render(
      <LocaleProvider defaultLocale="ar">
        <TestingEntitlementCard remaining={0} limit={3} resetWindowDays={7} />
      </LocaleProvider>,
    );

    expect(screen.getByText("متبقي 0 من 3")).toBeDefined();
    expect(
      screen.getByText(
        "لقد استخدمت جميع الجلسات المتاحة لهذا الأسبوع. يتجدد الرصيد تلقائياً كل 7 أيام.",
      ),
    ).toBeDefined();
  });

  it("renders Arabic loading state when loading={true} in Arabic LocaleContext", () => {
    render(
      <LocaleProvider defaultLocale="ar">
        <TestingEntitlementCard remaining={2} limit={3} loading={true} />
      </LocaleProvider>,
    );

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeDefined();
    expect(screen.getByText("جارٍ تحميل الرصيد...")).toBeDefined();
  });

  it("respects custom resetWindowDays prop", () => {
    render(
      <TestingEntitlementCard remaining={1} limit={5} resetWindowDays={14} />,
    );

    expect(
      screen.getByText(
        "You have 1 of 5 free simulation sessions available. Sessions reset automatically on a rolling 14-day window.",
      ),
    ).toBeDefined();
  });
});
