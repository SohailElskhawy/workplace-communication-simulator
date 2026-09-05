// @vitest-environment happy-dom
import type { ConversationTurn } from "@kalemny/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TranscriptDrawer,
  type TranscriptDrawerProps,
} from "./transcript-drawer";

vi.mock("@/components/speech-button", () => ({
  SpeechButton: ({ turnId }: { turnId: string }) => (
    <button data-testid={`speech-btn-${turnId}`}>Listen</button>
  ),
}));

const mockTurns: ConversationTurn[] = [
  {
    id: "turn-1",
    sequence: 1,
    inputMethod: "TEXT",
    userText: "أود مناقشة الراتب الأساسي.",
    assistantText: "نحن منفتحون على مناقشة ذلك بناءً على خبرتك.",
    status: "COMPLETED",
    createdAt: "2026-09-05T12:00:00Z",
    completedAt: "2026-09-05T12:00:05Z",
  },
];

function createProps(
  overrides: Partial<TranscriptDrawerProps> = {},
): TranscriptDrawerProps {
  return {
    open: true,
    attemptId: "attempt-test-1",
    turns: mockTurns,
    counterpartRole: "مدير التوظيف",
    openingMessage: "مرحباً بك، تفضل بالحديث.",
    pendingTurn: null,
    sendingTurn: false,
    pendingError: null,
    retryingTurnId: null,
    onClose: vi.fn(),
    onRetryTurn: vi.fn(),
    onRetryPending: vi.fn(),
    ...overrides,
  };
}

describe("TranscriptDrawer", () => {
  afterEach(() => {
    cleanup();
  });

  describe("English / LTR default rendering", () => {
    it("renders drawer with LTR direction and English labels", () => {
      const englishTurns: ConversationTurn[] = [
        {
          id: "turn-en-1",
          sequence: 1,
          inputMethod: "TEXT",
          userText: "I would like to discuss the base salary.",
          assistantText: "We are open to discussing that based on your experience.",
          status: "COMPLETED",
          createdAt: "2026-09-05T12:00:00Z",
          completedAt: "2026-09-05T12:00:05Z",
        },
      ];

      const props = createProps({
        language: "en",
        counterpartRole: "Hiring Manager",
        openingMessage: "Welcome, let's talk.",
        turns: englishTurns,
      });

      render(<TranscriptDrawer {...props} />);

      expect(screen.getByText("Conversation transcript")).toBeTruthy();
      expect(screen.getByText("1 saved learner turn")).toBeTruthy();
      expect(screen.getByText("You")).toBeTruthy();
      expect(screen.getAllByText("Hiring Manager").length).toBeGreaterThan(0);
      expect(screen.getByText("I would like to discuss the base salary.")).toBeTruthy();
    });
  });

  describe("Arabic / RTL rendering", () => {
    it("renders drawer with RTL direction and Arabic labels", () => {
      const props = createProps({
        language: "ar",
      });

      render(<TranscriptDrawer {...props} />);

      const aside = screen.getByRole("complementary", {
        name: /نص المحادثة/i,
      });
      expect(aside).toBeTruthy();
      expect(aside.getAttribute("dir")).toBe("rtl");
      expect(aside.className).toContain("me-auto");

      expect(screen.getByText("نص المحادثة")).toBeTruthy();
      expect(screen.getByText("1 جولة مسجلة للمتعلم")).toBeTruthy();
      expect(screen.getByText("أنت")).toBeTruthy();
      expect(screen.getAllByText("مدير التوظيف").length).toBeGreaterThan(0);

      const learnerText = screen.getByText("أود مناقشة الراتب الأساسي.");
      expect(learnerText).toBeTruthy();
      expect(learnerText.className).toContain("text-right");

      const assistantText = screen.getByText(
        "نحن منفتحون على مناقشة ذلك بناءً على خبرتك.",
      );
      expect(assistantText).toBeTruthy();
      expect(assistantText.className).toContain("text-right");
    });
  });
});
