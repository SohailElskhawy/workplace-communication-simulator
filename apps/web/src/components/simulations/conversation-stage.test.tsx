// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConversationStage,
  type ConversationStageProps,
} from "./conversation-stage";

vi.mock("@/components/speech-button", () => ({
  SpeechButton: ({ turnId }: { turnId: string }) => (
    <button data-testid={`speech-button-${turnId}`}>Listen</button>
  ),
}));

vi.mock("@/components/simulations/conversation-orb", () => ({
  ConversationOrb: () => <div data-testid="conversation-orb">Orb</div>,
}));

function createProps(
  overrides: Partial<ConversationStageProps> = {},
): ConversationStageProps {
  return {
    attemptId: "attempt-test-1",
    counterpartRole: "Hiring Manager",
    openingMessage: "Thanks for meeting today. What would you like to discuss?",
    latestAssistantMessage: null,
    turnCount: 2,
    uiState: "YOUR_TURN",
    autoPlaySpeech: false,
    cancelSpeechPlayback: false,
    onSpeechStatusChange: vi.fn(),
    microphoneLevel: 0,
    onOpenTranscript: vi.fn(),
    ...overrides,
  };
}

describe("ConversationStage", () => {
  afterEach(() => {
    cleanup();
  });

  describe("English / LTR default rendering", () => {
    it("renders with LTR direction and English copy", () => {
      const props = createProps({ language: "en" });
      render(<ConversationStage {...props} />);

      expect(screen.getByText("In conversation with")).toBeTruthy();
      expect(screen.getByText("Transcript")).toBeTruthy();
      expect(screen.getByText("(2)")).toBeTruthy();
      expect(screen.getByText("Hiring Manager")).toBeTruthy();
      expect(screen.getByText("AI counterpart")).toBeTruthy();
      expect(screen.getByText("Your turn")).toBeTruthy();
      expect(screen.getByText("Respond when you are ready.")).toBeTruthy();
      expect(
        screen.getByText(
          "Thanks for meeting today. What would you like to discuss?",
        ),
      ).toBeTruthy();
    });
  });

  describe("Arabic / RTL rendering", () => {
    it("renders with RTL direction and localized Arabic copy", () => {
      const props = createProps({
        language: "ar",
        counterpartRole: "مدير التوظيف",
        openingMessage: "شكراً لوقتك اليوم. ما الذي ترغب بمناقشته بخصوص العرض؟",
      });

      render(<ConversationStage {...props} />);

      expect(screen.getByText("في محادثة مع")).toBeTruthy();
      expect(screen.getByText("النص الكامل")).toBeTruthy();
      expect(screen.getByText("مدير التوظيف")).toBeTruthy();
      expect(screen.getByText("المحاور الآلي")).toBeTruthy();
      expect(screen.getByText("دورك الآن")).toBeTruthy();
      expect(
        screen.getByText("تحدث أو اكتب ردك عندما تكون مستعداً."),
      ).toBeTruthy();

      const messageText = screen.getByText(
        "شكراً لوقتك اليوم. ما الذي ترغب بمناقشته بخصوص العرض؟",
      );
      expect(messageText).toBeTruthy();
      expect(messageText.className).toContain("text-right");

      const messageContainer = messageText.closest("div");
      expect(messageContainer?.getAttribute("dir")).toBe("rtl");
      expect(messageContainer?.className).toContain("text-right");
    });

    it("renders preparing message in Arabic when message is null", () => {
      const props = createProps({
        language: "ar",
        openingMessage: null,
        latestAssistantMessage: null,
      });

      render(<ConversationStage {...props} />);

      expect(screen.getByText("جارٍ تجهيز المحادثة...")).toBeTruthy();
    });
  });
});
