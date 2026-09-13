// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/locale-context";
import { LiveCallBar, type LiveCallBarProps } from "./live-call-bar";

function createProps(overrides: Partial<LiveCallBarProps> = {}): LiveCallBarProps {
  return {
    connected: true,
    microphoneLevel: 0.5,
    isMuted: false,
    onToggleMute: vi.fn(),
    isCounterpartSpeaking: false,
    onInterruptAudio: vi.fn(),
    onToggleTyping: vi.fn(),
    isTypingOpen: false,
    language: "en",
    ...overrides,
  };
}

describe("LiveCallBar", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Connected Status Badge & Label (English & Arabic)", () => {
    it("renders connected status badge and 'Live Call' label in English", () => {
      const props = createProps({ connected: true, language: "en" });
      render(<LiveCallBar {...props} />);

      const dot = screen.getByTestId("connection-status-dot");
      expect(dot.className).toContain("bg-emerald-500");
      expect(dot.className).toContain("animate-pulse");

      const label = screen.getByTestId("connection-status-label");
      expect(label.textContent).toBe("Connected • Live Call");
    });

    it("renders connected status badge and label in Arabic", () => {
      const props = createProps({ connected: true, language: "ar" });
      render(<LiveCallBar {...props} />);

      const dot = screen.getByTestId("connection-status-dot");
      expect(dot.className).toContain("bg-emerald-500");

      const label = screen.getByTestId("connection-status-label");
      expect(label.textContent).toBe("متصل • مكالمة صوتية مباشرة");
    });

    it("derives Arabic from LocaleProvider when language prop is omitted", () => {
      const props = createProps({ connected: true, language: undefined });
      render(
        <LocaleProvider defaultLocale="ar">
          <LiveCallBar {...props} />
        </LocaleProvider>,
      );

      const label = screen.getByTestId("connection-status-label");
      expect(label.textContent).toBe("متصل • مكالمة صوتية مباشرة");
    });
  });

  describe("2. Connecting State when connected={false}", () => {
    it("renders connecting state and subtle dot in English", () => {
      const props = createProps({ connected: false, language: "en" });
      render(<LiveCallBar {...props} />);

      const dot = screen.getByTestId("connection-status-dot");
      expect(dot.className).toContain("bg-muted-foreground/40");
      expect(dot.className).not.toContain("animate-pulse");

      const label = screen.getByTestId("connection-status-label");
      expect(label.textContent).toBe("Connecting…");

      // Mute button should NOT be rendered when disconnected
      expect(screen.queryByRole("button", { name: /mute/i })).toBeNull();

      // Waveform bars should NOT be rendered when disconnected
      expect(screen.queryByTestId("live-call-waveform")).toBeNull();
    });

    it("renders connecting label in Arabic when connected={false}", () => {
      const props = createProps({ connected: false, language: "ar" });
      render(<LiveCallBar {...props} />);

      const label = screen.getByTestId("connection-status-label");
      expect(label.textContent).toBe("جارٍ الاتصال…");
    });
  });

  describe("3. Toggle Mute Action (onToggleMute)", () => {
    it("calls onToggleMute when mute button is clicked while unmuted", () => {
      const onToggleMute = vi.fn();
      const props = createProps({ connected: true, isMuted: false, onToggleMute });
      render(<LiveCallBar {...props} />);

      const muteButton = screen.getByRole("button", { name: "Mute microphone" });
      fireEvent.click(muteButton);

      expect(onToggleMute).toHaveBeenCalledTimes(1);
    });

    it("calls onToggleMute when unmute button is clicked while muted", () => {
      const onToggleMute = vi.fn();
      const props = createProps({ connected: true, isMuted: true, onToggleMute });
      render(<LiveCallBar {...props} />);

      const unmuteButton = screen.getByRole("button", { name: "Unmute microphone" });
      fireEvent.click(unmuteButton);

      expect(onToggleMute).toHaveBeenCalledTimes(1);
    });

    it("renders Arabic aria-label for mute and unmute buttons", () => {
      const { rerender } = render(
        <LiveCallBar {...createProps({ connected: true, isMuted: false, language: "ar" })} />,
      );
      expect(screen.getByRole("button", { name: "كتم الميكروفون" })).toBeDefined();

      rerender(
        <LiveCallBar {...createProps({ connected: true, isMuted: true, language: "ar" })} />,
      );
      expect(screen.getByRole("button", { name: "إلغاء كتم الميكروفون" })).toBeDefined();
    });
  });

  describe("4. Muted Visual State (isMuted={true})", () => {
    it("renders alert surface styling on mute button when isMuted={true}", () => {
      const props = createProps({ connected: true, isMuted: true });
      render(<LiveCallBar {...props} />);

      const button = screen.getByRole("button", { name: "Unmute microphone" });
      expect(button.className).toContain("bg-alert-surface");
      expect(button.className).toContain("border-alert/30");
      expect(button.className).toContain("text-alert-foreground");

      // Displays Muted status indicator text in status section
      const mutedBadge = screen.getByTestId("live-call-muted-badge");
      expect(mutedBadge.textContent).toContain("Muted");

      // Audio waveform bars should be hidden while muted
      expect(screen.queryByTestId("live-call-waveform")).toBeNull();
    });

    it("renders Arabic muted status indicator text", () => {
      const props = createProps({ connected: true, isMuted: true, language: "ar" });
      render(<LiveCallBar {...props} />);

      const mutedBadge = screen.getByTestId("live-call-muted-badge");
      expect(mutedBadge.textContent).toContain("مكتوم");
    });

    it("renders waveform bars when connected and unmuted, scaling with microphoneLevel", () => {
      const props = createProps({ connected: true, isMuted: false, microphoneLevel: 0.8 });
      render(<LiveCallBar {...props} />);

      const waveform = screen.getByTestId("live-call-waveform");
      expect(waveform).toBeDefined();

      const bars = screen.getAllByTestId("waveform-bar");
      expect(bars).toHaveLength(5);

      // Heights should reflect clampedLevel * multiplier
      // Max multiplier is 1.0 (middle bar) -> Math.round(0.8 * 1.0 * 100) = 80%
      expect(bars[2]?.style.height).toBe("80%");
      expect(screen.queryByTestId("live-call-muted-badge")).toBeNull();
    });

    it("clamps negative and overflowing microphoneLevel safely", () => {
      const { rerender } = render(
        <LiveCallBar {...createProps({ connected: true, isMuted: false, microphoneLevel: -0.5 })} />,
      );
      let bars = screen.getAllByTestId("waveform-bar");
      // Clamped to 0 -> min height 20%
      expect(bars[2]?.style.height).toBe("20%");

      rerender(
        <LiveCallBar {...createProps({ connected: true, isMuted: false, microphoneLevel: 2.5 })} />,
      );
      bars = screen.getAllByTestId("waveform-bar");
      // Clamped to 1 -> 100%
      expect(bars[2]?.style.height).toBe("100%");
    });
  });

  describe("5. Barge-in Interrupt Button", () => {
    it("renders interrupt button when isCounterpartSpeaking={true} and invokes onInterruptAudio", () => {
      const onInterruptAudio = vi.fn();
      const props = createProps({
        isCounterpartSpeaking: true,
        onInterruptAudio,
        language: "en",
      });
      render(<LiveCallBar {...props} />);

      const interruptBtn = screen.getByRole("button", { name: "Tap to interrupt" });
      expect(interruptBtn).toBeDefined();
      expect(interruptBtn.className).toContain("bg-primary");
      expect(interruptBtn.className).toContain("text-primary-foreground");
      expect(interruptBtn.className).toContain("rounded-full");

      fireEvent.click(interruptBtn);
      expect(onInterruptAudio).toHaveBeenCalledTimes(1);
    });

    it("renders Arabic label for interrupt button", () => {
      const props = createProps({
        isCounterpartSpeaking: true,
        language: "ar",
      });
      render(<LiveCallBar {...props} />);

      expect(screen.getByRole("button", { name: "اضغط للمقاطعة" })).toBeDefined();
    });

    it("does NOT render interrupt button when isCounterpartSpeaking={false}", () => {
      const props = createProps({ isCounterpartSpeaking: false });
      render(<LiveCallBar {...props} />);

      expect(screen.queryByRole("button", { name: /interrupt/i })).toBeNull();
    });
  });

  describe("6. Hybrid Typing Toggle (onToggleTyping & isTypingOpen)", () => {
    it("renders 'Type response' with standard styling when isTypingOpen={false}", () => {
      const onToggleTyping = vi.fn();
      const props = createProps({ isTypingOpen: false, onToggleTyping, language: "en" });
      render(<LiveCallBar {...props} />);

      const toggleBtn = screen.getByRole("button", { name: "Type response" });
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
      expect(toggleBtn.className).toContain("bg-surface-subtle");
      expect(toggleBtn.className).not.toContain("bg-primary-muted");

      fireEvent.click(toggleBtn);
      expect(onToggleTyping).toHaveBeenCalledTimes(1);
    });

    it("renders 'Hide text' with active styling when isTypingOpen={true}", () => {
      const props = createProps({ isTypingOpen: true, language: "en" });
      render(<LiveCallBar {...props} />);

      const toggleBtn = screen.getByRole("button", { name: "Hide text" });
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");
      expect(toggleBtn.className).toContain("bg-primary-muted");
      expect(toggleBtn.className).toContain("border-primary/30");
      expect(toggleBtn.className).toContain("text-primary");
    });

    it("renders Arabic labels for typing toggle", () => {
      const { rerender } = render(
        <LiveCallBar {...createProps({ isTypingOpen: false, language: "ar" })} />,
      );
      expect(screen.getByRole("button", { name: "اكتب رداً" })).toBeDefined();

      rerender(<LiveCallBar {...createProps({ isTypingOpen: true, language: "ar" })} />);
      expect(screen.getByRole("button", { name: "إخفاء النص" })).toBeDefined();
    });
  });

  describe("7. Accessibility & Touch Target Constraints", () => {
    it("enforces minimum 44px touch targets on all interactive buttons", () => {
      const props = createProps({
        connected: true,
        isCounterpartSpeaking: true,
        isTypingOpen: false,
      });
      render(<LiveCallBar {...props} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(3);

      buttons.forEach((button) => {
        expect(button.className).toContain("min-h-[44px]");
        expect(button.className).toContain("min-w-[44px]");
      });
    });

    it("provides accessible attributes on regions and visualizers", () => {
      const props = createProps({
        connected: true,
        isMuted: false,
        isCounterpartSpeaking: true,
        isTypingOpen: true,
      });
      render(<LiveCallBar {...props} />);

      const region = screen.getByRole("region");
      expect(region.getAttribute("aria-label")).toBe("Live call bar");

      const waveform = screen.getByTestId("live-call-waveform");
      expect(waveform.getAttribute("aria-hidden")).toBe("true");

      const dot = screen.getByTestId("connection-status-dot");
      expect(dot.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
