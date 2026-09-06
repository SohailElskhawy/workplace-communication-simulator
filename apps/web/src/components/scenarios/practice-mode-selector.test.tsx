// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PracticeModeSelector,
  type PracticeModeSelectorProps,
} from "./practice-mode-selector";

describe("PracticeModeSelector", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps: PracticeModeSelectorProps = {
    mode: "PUSH_TO_TALK",
    onSelectMode: vi.fn(),
    language: "en",
  };

  it("renders both Push-to-Talk and Live Call options in English", () => {
    render(<PracticeModeSelector {...defaultProps} />);

    const pttBtn = screen.getByRole("button", { name: /push-to-talk/i });
    const realtimeBtn = screen.getByRole("button", {
      name: /live call \(hands-free\)/i,
    });

    expect(pttBtn).toBeDefined();
    expect(realtimeBtn).toBeDefined();

    expect(pttBtn.getAttribute("aria-pressed")).toBe("true");
    expect(realtimeBtn.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Recommended")).toBeDefined();
    expect(screen.getByText("Fast & Natural")).toBeDefined();
  });

  it("renders Arabic labels and RTL layout when language is ar", () => {
    render(
      <PracticeModeSelector
        {...defaultProps}
        language="ar"
        mode="REALTIME"
      />,
    );

    const pttBtn = screen.getByRole("button", { name: /اضغط للتحدث/i });
    const realtimeBtn = screen.getByRole("button", {
      name: /مكالمة صوتية مباشرة/i,
    });

    expect(pttBtn).toBeDefined();
    expect(realtimeBtn).toBeDefined();

    expect(pttBtn.getAttribute("aria-pressed")).toBe("false");
    expect(realtimeBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("طبيعي وسريع")).toBeDefined();
  });

  it("calls onSelectMode when clicking an option", () => {
    const onSelectMode = vi.fn();
    render(
      <PracticeModeSelector
        {...defaultProps}
        mode="PUSH_TO_TALK"
        onSelectMode={onSelectMode}
      />,
    );

    const realtimeBtn = screen.getByRole("button", {
      name: /live call \(hands-free\)/i,
    });
    fireEvent.click(realtimeBtn);

    expect(onSelectMode).toHaveBeenCalledTimes(1);
    expect(onSelectMode).toHaveBeenCalledWith("REALTIME");
  });
});
