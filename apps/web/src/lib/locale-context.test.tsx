// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { LocaleProvider, useLocale } from "./locale-context";

function TestConsumer() {
  const { locale, direction, isRtl, toggleLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="is-rtl">{isRtl ? "true" : "false"}</span>
      <span data-testid="translated-title">{t("app.title")}</span>
      <button type="button" onClick={toggleLocale} data-testid="toggle-btn">
        Toggle
      </button>
    </div>
  );
}

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("LocaleContext & Provider", () => {
  afterEach(() => {
    cleanup();
    storageMap.clear();
  });

  it("defaults to English (LTR)", () => {
    render(
      <LocaleProvider defaultLocale="en">
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("direction").textContent).toBe("ltr");
    expect(screen.getByTestId("is-rtl").textContent).toBe("false");
    expect(screen.getByTestId("translated-title").textContent).toBe("Kalemny");
  });

  it("toggles between English and Arabic with correct direction and translation", () => {
    render(
      <LocaleProvider defaultLocale="en">
        <TestConsumer />
      </LocaleProvider>,
    );

    const toggleBtn = screen.getByTestId("toggle-btn");
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("direction").textContent).toBe("rtl");
    expect(screen.getByTestId("is-rtl").textContent).toBe("true");
    expect(screen.getByTestId("translated-title").textContent).toBe("كلمني");

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("direction").textContent).toBe("ltr");
  });

  it("provides graceful fallback outside provider", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("translated-title").textContent).toBe("Kalemny");
  });
});
