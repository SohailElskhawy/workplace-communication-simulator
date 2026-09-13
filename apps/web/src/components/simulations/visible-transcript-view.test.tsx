// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConversationTurn } from "@kalemny/contracts";
import { LocaleProvider } from "@/lib/locale-context";
import {
  VisibleTranscriptView,
  type PendingTurnState,
  type VisibleTranscriptViewProps,
} from "./visible-transcript-view";

const mockTurns: ConversationTurn[] = [
  {
    id: "turn-1",
    sequence: 1,
    inputMethod: "VOICE",
    userText: "Hello, I would like to discuss my compensation.",
    assistantText: "Welcome! Let's talk through your proposal.",
    status: "COMPLETED",
    createdAt: "2026-09-13T12:00:00.000Z",
    completedAt: "2026-09-13T12:00:05.000Z",
  },
  {
    id: "turn-2",
    sequence: 2,
    inputMethod: "TEXT",
    userText: "Based on my contributions, I am proposing a 15% increase.",
    assistantText: "That is higher than typical, but walk me through your key achievements.",
    status: "COMPLETED",
    createdAt: "2026-09-13T12:01:00.000Z",
    completedAt: "2026-09-13T12:01:05.000Z",
  },
];

function createProps(
  overrides: Partial<VisibleTranscriptViewProps> = {},
): VisibleTranscriptViewProps {
  return {
    turns: mockTurns,
    counterpartName: "Sarah Chen",
    counterpartRole: "VP of People",
    onReplaySpeech: vi.fn(),
    onRetryTurn: vi.fn(),
    ...overrides,
  };
}

describe("VisibleTranscriptView", () => {
  beforeEach(() => {
    // Mock scrollIntoView on HTMLElement
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Empty State", () => {
    it("renders empty cue in English when no turns exist and no pending turn", () => {
      const props = createProps({ turns: [] });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(
        screen.getByText(
          "The conversation has started. Listen to your counterpart or take the floor when ready.",
        ),
      ).toBeDefined();
    });

    it("renders empty cue in Arabic when no turns exist and no pending turn", () => {
      const props = createProps({ turns: [] });
      render(
        <LocaleProvider defaultLocale="ar">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(
        screen.getByText(
          "بدأت المحادثة الآن. استمع لمحاورك أو خذ زمام المبادرة عندما تكون جاهزاً.",
        ),
      ).toBeDefined();
    });
  });

  describe("Bubble Alignment & Styling", () => {
    it("renders learner bubbles with end-alignment and counterpart bubbles with start-alignment", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const learnerBubbles = screen.getAllByTestId("learner-turn-bubble");
      expect(learnerBubbles).toHaveLength(2);
      learnerBubbles.forEach((bubble) => {
        expect(bubble.className).toContain("ms-auto");
        expect(bubble.className).toContain("me-0");
        expect(bubble.className).toContain("bg-primary-muted");
      });

      const counterpartBubbles = screen.getAllByTestId("counterpart-turn-bubble");
      expect(counterpartBubbles).toHaveLength(2);
      counterpartBubbles.forEach((bubble) => {
        expect(bubble.className).toContain("ms-0");
        expect(bubble.className).toContain("me-auto");
        expect(bubble.className).toContain("bg-surface-solid");
      });
    });

    it("displays counterpart name and role in counterpart bubble headers", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const names = screen.getAllByText("Sarah Chen");
      expect(names.length).toBeGreaterThan(0);
      const roles = screen.getAllByText(/VP of People/);
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  describe("Bilingual Badges & Indicators", () => {
    it("renders turn numbers and input badges (Voice / Typed) in English", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(screen.getByText("Turn 1")).toBeDefined();
      expect(screen.getByText("Turn 2")).toBeDefined();
      expect(screen.getByText("Voice")).toBeDefined();
      expect(screen.getByText("Typed")).toBeDefined();
    });

    it("renders turn numbers and input badges (صوت / كتابة) in Arabic", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="ar">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(screen.getByText("الجولة 1")).toBeDefined();
      expect(screen.getByText("الجولة 2")).toBeDefined();
      expect(screen.getByText("صوت")).toBeDefined();
      expect(screen.getByText("كتابة")).toBeDefined();
    });
  });

  describe("Actions: onReplaySpeech & onRetryTurn", () => {
    it("calls onReplaySpeech with turnId and text when replay button is clicked", () => {
      const onReplaySpeech = vi.fn();
      const props = createProps({ onReplaySpeech });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const replayButtons = screen.getAllByRole("button", {
        name: /replay/i,
      });
      expect(replayButtons.length).toBeGreaterThan(0);
      const replayButton = replayButtons[0];
      expect(replayButton).toBeDefined();
      fireEvent.click(replayButton!);

      expect(onReplaySpeech).toHaveBeenCalledWith(
        "turn-1",
        "Welcome! Let's talk through your proposal.",
      );
    });

    it("calls onRetryTurn with turnId when retry button is clicked", () => {
      const onRetryTurn = vi.fn();
      const props = createProps({ onRetryTurn });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const retryButtons = screen.getAllByRole("button", {
        name: /retry this turn/i,
      });
      expect(retryButtons.length).toBeGreaterThan(0);
      const retryButton = retryButtons[0];
      expect(retryButton).toBeDefined();
      fireEvent.click(retryButton!);

      expect(onRetryTurn).toHaveBeenCalledWith("turn-1");
    });

    it("disables retry button and shows retrying indicator when retryingTurnId matches", () => {
      const onRetryTurn = vi.fn();
      const props = createProps({
        onRetryTurn,
        retryingTurnId: "turn-1",
      });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const retryingBtn = screen.getByRole("button", { name: /retrying/i });
      expect((retryingBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it("displays playing state on replay speech button when playingTurnId matches", () => {
      const props = createProps({
        playingTurnId: "turn-1",
      });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const playingBtn = screen.getByRole("button", { name: /playing/i });
      expect(playingBtn).toBeDefined();
    });
  });

  describe("Pending Turn Bubble", () => {
    it("renders pending turn even when turns array is empty, without showing empty cue", () => {
      const pendingTurn: PendingTurnState = {
        text: "Just typed something",
        inputMethod: "TEXT",
        status: "sending",
      };
      const props = createProps({ turns: [], pendingTurn });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(screen.queryByTestId("transcript-empty-state")).toBeNull();
      expect(screen.getByTestId("pending-turn-bubble")).toBeDefined();
      expect(screen.getByText("Just typed something")).toBeDefined();
      expect(screen.getByText("Turn 1")).toBeDefined();
      expect(screen.getByText("Typed")).toBeDefined();
    });

    it("renders optimistic pending turn with voice input method and sending status", () => {
      const pendingTurn: PendingTurnState = {
        text: "I am actively speaking right now...",
        inputMethod: "VOICE",
        status: "sending",
      };
      const props = createProps({ pendingTurn });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const pendingBubble = screen.getByTestId("pending-turn-bubble");
      expect(pendingBubble).toBeDefined();
      expect(screen.getByText("I am actively speaking right now...")).toBeDefined();
      expect(screen.getByText("Turn 3")).toBeDefined();
      expect(screen.getByText("Sending…")).toBeDefined();
    });

    it("renders optimistic pending turn in Arabic with transcribing status", () => {
      const pendingTurn: PendingTurnState = {
        text: "أنا أتحدث الآن باللغة العربية...",
        inputMethod: "VOICE",
        status: "transcribing",
      };
      const props = createProps({ pendingTurn });
      render(
        <LocaleProvider defaultLocale="ar">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const pendingBubble = screen.getByTestId("pending-turn-bubble");
      expect(pendingBubble).toBeDefined();
      expect(screen.getByText("أنا أتحدث الآن باللغة العربية...")).toBeDefined();
      expect(screen.getByText("الجولة 3")).toBeDefined();
      expect(screen.getByText("جارٍ تحويل الصوت إلى نص…")).toBeDefined();
    });

    it("renders pending turn with error status", () => {
      const pendingTurn: PendingTurnState = {
        text: "Something went wrong sending this turn",
        inputMethod: "TEXT",
        status: "error",
      };
      const props = createProps({ pendingTurn });
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      expect(screen.getByText("Error")).toBeDefined();
    });
  });

  describe("Scroll Management & Jump to Latest", () => {
    it("shows floating 'Jump to latest' button when scrolled up > 120px from bottom", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="en">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const scrollContainer = screen.getByRole("log");

      // Not scrolled up enough (distance <= 120)
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "scrollTop", { value: 500, configurable: true }); // distance = 1000 - 500 - 400 = 100 <= 120
      fireEvent.scroll(scrollContainer);

      expect(screen.queryByRole("button", { name: /jump to latest/i })).toBeNull();

      // Scrolled up > 120px (distance = 1000 - 300 - 400 = 300 > 120)
      Object.defineProperty(scrollContainer, "scrollTop", { value: 300, configurable: true });
      fireEvent.scroll(scrollContainer);

      const jumpButton = screen.getByRole("button", { name: /jump to latest/i });
      expect(jumpButton).toBeDefined();

      // Clicking jump button triggers smooth scroll to bottom and hides button
      fireEvent.click(jumpButton);
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "end",
      });
      expect(screen.queryByRole("button", { name: /jump to latest/i })).toBeNull();
    });

    it("renders floating jump button with Arabic text in Arabic locale", () => {
      const props = createProps();
      render(
        <LocaleProvider defaultLocale="ar">
          <VisibleTranscriptView {...props} />
        </LocaleProvider>,
      );

      const scrollContainer = screen.getByRole("log");
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "scrollTop", { value: 200, configurable: true }); // distance = 400 > 120
      fireEvent.scroll(scrollContainer);

      const jumpButton = screen.getByRole("button", { name: "الانتقال إلى الأحدث" });
      expect(jumpButton).toBeDefined();
    });
  });
});
