// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/locale-context";
import {
  CounterpartStage,
  type CounterpartStageProps,
  type SimulationUiState,
} from "./counterpart-stage";

function createProps(
  overrides: Partial<CounterpartStageProps> = {},
): CounterpartStageProps {
  return {
    scenarioKey: "salary-negotiation",
    scenarioTitle: "Salary Negotiation Briefing",
    counterpartName: "Sarah Chen",
    counterpartRole: "VP of People & Operations",
    userRole: "Senior Software Engineer",
    userObjective: "Negotiate a 15% increase in base compensation",
    stakes: "High stakes for annual compensation package",
    isCustom: false,
    uiState: "YOUR_TURN",
    counterpartSpeechStatus: "idle",
    onStopAudio: vi.fn(),
    isKeyboardOpen: false,
    ...overrides,
  };
}

describe("CounterpartStage", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Portrait & Identity Rendering", () => {
    it("renders portrait, counterpart name, role, and AI partner label in English", () => {
      const props = createProps();
      render(<CounterpartStage {...props} />);

      expect(screen.getByText("Sarah Chen")).toBeDefined();
      expect(screen.getByText("VP of People & Operations")).toBeDefined();
      expect(screen.getByText("AI Roleplay Partner")).toBeDefined();

      const image = screen.getByAltText("Sarah Chen");
      expect(image).toBeDefined();
    });

    it("falls back to behavioral-interview portrait for custom scenario or null image", () => {
      const props = createProps({
        isCustom: true,
        scenarioKey: "custom-interview-scenario",
      });
      render(<CounterpartStage {...props} />);

      const image = screen.getByAltText("Sarah Chen");
      expect(image).toBeDefined();
    });
  });

  describe("Conversational State Badges (English & Arabic)", () => {
    const englishStates: Array<{ state: SimulationUiState; expected: string }> = [
      { state: "YOUR_TURN", expected: "Your turn to speak" },
      { state: "LISTENING", expected: "Listening…" },
      { state: "TRANSCRIBING", expected: "Transcribing your voice…" },
      { state: "REVIEWING", expected: "Review your response" },
      { state: "AI_THINKING", expected: "Preparing response…" },
      { state: "AI_SPEAKING", expected: "Counterpart is speaking" },
      { state: "MIC_ERROR", expected: "Microphone unavailable" },
    ];

    englishStates.forEach(({ state, expected }) => {
      it(`renders English badge for ${state}: "${expected}"`, () => {
        const props = createProps({ uiState: state });
        render(<CounterpartStage {...props} />);

        expect(screen.getByText(expected)).toBeDefined();
      });
    });

    const arabicStates: Array<{ state: SimulationUiState; expected: string }> = [
      { state: "YOUR_TURN", expected: "دورك في الحديث" },
      { state: "LISTENING", expected: "نستمع إليك الآن…" },
      { state: "TRANSCRIBING", expected: "جارٍ تحويل الصوت إلى نص…" },
      { state: "REVIEWING", expected: "راجع ردك" },
      { state: "AI_THINKING", expected: "المحاور يجهز الرد الآن…" },
      { state: "AI_SPEAKING", expected: "المحاور يتحدث" },
      { state: "MIC_ERROR", expected: "الميكروفون غير متوفر" },
    ];

    arabicStates.forEach(({ state, expected }) => {
      it(`renders Arabic badge for ${state}: "${expected}"`, () => {
        const props = createProps({ uiState: state });
        render(
          <LocaleProvider defaultLocale="ar">
            <CounterpartStage {...props} />
          </LocaleProvider>,
        );

        expect(screen.getByText(expected)).toBeDefined();
      });
    });

    it("renders Arabic AI partner label", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="ar">
          <CounterpartStage {...props} />
        </LocaleProvider>,
      );

      expect(screen.getByText("شريك المحاكاة بالذكاء الاصطناعي")).toBeDefined();
    });
  });

  describe("Soundwave & Barge-in Stop Audio", () => {
    it("renders soundwave and stop audio button when playing, and clicking triggers onStopAudio", () => {
      const onStopAudio = vi.fn();
      const props = createProps({
        uiState: "AI_SPEAKING",
        counterpartSpeechStatus: "playing",
        onStopAudio,
      });

      render(<CounterpartStage {...props} />);

      const soundwave = screen.getByTestId("soundwave");
      expect(soundwave).toBeDefined();
      expect(soundwave.getAttribute("aria-hidden")).toBe("true");

      const stopButton = screen.getByRole("button", { name: /stop audio/i });
      expect(stopButton).toBeDefined();

      fireEvent.click(stopButton);
      expect(onStopAudio).toHaveBeenCalledTimes(1);
    });

    it("renders Arabic Stop Audio button when locale is Arabic", () => {
      const onStopAudio = vi.fn();
      const props = createProps({
        uiState: "AI_SPEAKING",
        counterpartSpeechStatus: "playing",
        onStopAudio,
      });

      render(
        <LocaleProvider defaultLocale="ar">
          <CounterpartStage {...props} />
        </LocaleProvider>,
      );

      const stopButton = screen.getByRole("button", { name: /إيقاف الصوت/i });
      expect(stopButton).toBeDefined();

      fireEvent.click(stopButton);
      expect(onStopAudio).toHaveBeenCalledTimes(1);
    });

    it("does not render soundwave or stop audio button when speech status is idle or loading", () => {
      const propsIdle = createProps({ counterpartSpeechStatus: "idle" });
      const { rerender } = render(<CounterpartStage {...propsIdle} />);

      expect(screen.queryByTestId("soundwave")).toBeNull();
      expect(screen.queryByRole("button", { name: /stop audio/i })).toBeNull();

      const propsLoading = createProps({ counterpartSpeechStatus: "loading" });
      rerender(<CounterpartStage {...propsLoading} />);

      expect(screen.queryByTestId("soundwave")).toBeNull();
      expect(screen.queryByRole("button", { name: /stop audio/i })).toBeNull();
    });
  });

  describe("Mobile Keyboard Collapse", () => {
    it("renders compact horizontal strip when isKeyboardOpen is true", () => {
      const props = createProps({ isKeyboardOpen: true });
      render(<CounterpartStage {...props} />);

      const collapsedStrip = screen.getByTestId("counterpart-stage-collapsed");
      expect(collapsedStrip).toBeDefined();
      expect(collapsedStrip.className).toContain("h-9");
      expect(collapsedStrip.className).toContain("border-b");

      // Name and state badge remain visible
      expect(screen.getByText("Sarah Chen")).toBeDefined();
      expect(screen.getByText("Your turn to speak")).toBeDefined();
    });

    it("renders soundwave and stop button in collapsed strip when playing", () => {
      const onStopAudio = vi.fn();
      const props = createProps({
        isKeyboardOpen: true,
        uiState: "AI_SPEAKING",
        counterpartSpeechStatus: "playing",
        onStopAudio,
      });

      render(<CounterpartStage {...props} />);

      expect(screen.getByTestId("soundwave")).toBeDefined();
      const stopButton = screen.getByRole("button", { name: /stop audio/i });
      expect(stopButton).toBeDefined();

      fireEvent.click(stopButton);
      expect(onStopAudio).toHaveBeenCalledTimes(1);
    });
  });

  describe("Desktop Briefing Accordion", () => {
    it("renders briefing details and toggles open/close", () => {
      const props = createProps();
      render(<CounterpartStage {...props} />);

      expect(screen.getByText("Scenario Briefing")).toBeDefined();
      expect(screen.getByText("Your Role")).toBeDefined();
      expect(screen.getByText("Senior Software Engineer")).toBeDefined();
      expect(screen.getByText("Primary Objective")).toBeDefined();
      expect(
        screen.getByText("Negotiate a 15% increase in base compensation"),
      ).toBeDefined();
      expect(screen.getByText("Stakes")).toBeDefined();
      expect(
        screen.getByText("High stakes for annual compensation package"),
      ).toBeDefined();

      // Toggle closed
      const toggleButton = screen.getByRole("button", {
        name: /scenario briefing/i,
      });
      fireEvent.click(toggleButton);

      expect(screen.queryByText("Senior Software Engineer")).toBeNull();

      // Toggle open
      fireEvent.click(toggleButton);
      expect(screen.getByText("Senior Software Engineer")).toBeDefined();
    });

    it("renders Arabic briefing labels in Arabic locale", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="ar">
          <CounterpartStage {...props} />
        </LocaleProvider>,
      );

      expect(screen.getByText("ملخص الموقف")).toBeDefined();
      expect(screen.getByText("دورك")).toBeDefined();
      expect(screen.getByText("الهدف الأساسي")).toBeDefined();
      expect(screen.getByText("الرهانات")).toBeDefined();
    });
  });
});
