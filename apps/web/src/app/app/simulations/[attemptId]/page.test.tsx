// @vitest-environment happy-dom
import type { AttemptDetailResponse } from "@kalemny/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SimulationPage from "./page";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ attemptId: "attempt-123" }),
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
    isLoaded: true,
    isSignedIn: true,
  }),
}));

const mockFetchAttempt = vi.fn();
const mockFetchScenarioDetail = vi.fn();

vi.mock("@/lib/api-client", () => ({
  ApiClientError: class ApiClientError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  createApiClient: () => ({
    fetchAttempt: mockFetchAttempt,
    fetchScenarioDetail: mockFetchScenarioDetail,
    createTurn: vi.fn(),
    retryTurn: vi.fn(),
    finishAttempt: vi.fn(),
  }),
}));

function createAttemptData(
  overrides: Partial<AttemptDetailResponse["data"]> = {},
): AttemptDetailResponse["data"] {
  return {
    id: "attempt-123",
    status: "ACTIVE",
    difficulty: "MEDIUM",
    language: "ar",
    dialect: "EGYPTIAN",
    interactionMode: "PUSH_TO_TALK",
    scenario: {
      key: "salary-negotiation",
      title: "مفاوضة الراتب",
      version: 1,
      openingMessage: "شكراً لحضورك. نود مناقشة تفاصيل العرض.",
    },
    retryOfAttemptId: null,
    turns: [],
    evaluation: null,
    comparison: null,
    startedAt: "2026-09-05T12:00:00Z",
    endedAt: null,
    expiresAt: "2026-09-05T13:00:00Z",
    ...overrides,
  };
}

describe("SimulationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Arabic RTL layout when attempt has language='ar'", async () => {
    const arabicAttempt = createAttemptData({ language: "ar" });
    mockFetchAttempt.mockResolvedValue(arabicAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "مفاوضة الراتب",
      summary: "تفاوض على الراتب",
      difficulty: "MEDIUM",
      context: {
        aiRole: "مدير التوظيف",
        userObjective: "الحصول على زيادة في الراتب الأساسي.",
      },
    });

    render(<SimulationPage />);

    // Initially loading state
    expect(screen.getByText(/Preparing simulation workspace/i)).toBeTruthy();

    // After loading attempt data
    await waitFor(() => {
      expect(screen.getAllByText("مفاوضة الراتب").length).toBeGreaterThan(0);
    });

    // Verify Arabic RTL direction on root container
    const rootContainer = document.querySelector('[dir="rtl"]');
    expect(rootContainer).toBeTruthy();

    // Verify Arabic goal text and counterpart role
    expect(screen.getByText("الهدف:")).toBeTruthy();
    expect(
      screen.getAllByText("الحصول على زيادة في الراتب الأساسي.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("مدير التوظيف").length).toBeGreaterThan(0);
    expect(screen.getByText("دورك الآن")).toBeTruthy();

    // Verify no LiveConversation or realtime voice elements are present
    expect(document.querySelector('[data-testid="live-conversation"]')).toBeNull();
  });

  it("renders English LTR layout when attempt has language='en'", async () => {
    const englishAttempt = createAttemptData({
      language: "en",
      scenario: {
        key: "salary-negotiation",
        title: "Salary Negotiation",
        version: 1,
        openingMessage: "Thanks for making time to talk.",
      },
    });
    mockFetchAttempt.mockResolvedValue(englishAttempt);
    mockFetchScenarioDetail.mockResolvedValue({
      key: "salary-negotiation",
      title: "Salary Negotiation",
      summary: "Negotiate salary",
      difficulty: "MEDIUM",
      context: {
        aiRole: "Hiring Manager",
        userObjective: "Secure an increase in base compensation.",
      },
    });

    render(<SimulationPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Salary Negotiation").length).toBeGreaterThan(0);
    });

    // Verify LTR direction
    const rootContainer = document.querySelector('[dir="ltr"]');
    expect(rootContainer).toBeTruthy();

    expect(screen.getByText("Goal:")).toBeTruthy();
    expect(
      screen.getAllByText("Secure an increase in base compensation.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Your turn")).toBeTruthy();
  });
});
