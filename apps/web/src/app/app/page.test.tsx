// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PublicScenarioDetail,
  PublicScenarioSummary,
} from "@kalemny/contracts";

import PracticeHubPage from "./page";
import { DEFAULT_MOCK_SCENARIOS } from "./scenario-library-view";

const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      firstName: "Sohail",
    },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

const mockFetchEntitlements = vi.fn();
const mockFetchEntitlement = vi.fn();
const mockFetchScenarios = vi.fn();
const mockFetchProgress = vi.fn();
const mockFetchScenarioDetail = vi.fn();
const mockCreateAttempt = vi.fn();
const mockDeleteCustomScenario = vi.fn();

vi.mock("@/lib/api-client", () => ({
  ApiClientError: class ApiClientError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
  createApiClient: () => ({
    fetchEntitlements: mockFetchEntitlements,
    fetchEntitlement: mockFetchEntitlement,
    fetchScenarios: mockFetchScenarios,
    fetchProgress: mockFetchProgress,
    fetchScenarioDetail: mockFetchScenarioDetail,
    createAttempt: mockCreateAttempt,
    deleteCustomScenario: mockDeleteCustomScenario,
  }),
}));

const mockDetail: PublicScenarioDetail = {
  key: "salary-negotiation",
  version: 1,
  title: "Salary Negotiation",
  titleAr: "التفاوض على الراتب",
  category: "NEGOTIATION",
  summary:
    "Advocate for your value while handling realistic compensation objections.",
  summaryAr: "تفاوض بثقة على راتب عادل عند تلقي عرض عمل أو أثناء التقييم السنوي.",
  availableDifficulties: ["EASY", "MEDIUM", "HARD"],
  context: {
    description: "You received an offer below expectations.",
    descriptionAr: "تلقيت عرض عمل أقل من توقعاتك.",
    userRole: "The job candidate",
    userRoleAr: "المرشح",
    aiRole: "The hiring manager",
    aiRoleAr: "مدير التوظيف",
    userObjective: "Negotiate higher compensation.",
    userObjectiveAr: "التفاوض على راتب أعلى.",
    stakes: "Improve salary without losing the offer.",
    stakesAr: "تحسين الراتب دون خسارة العرض.",
  },
};

describe("PracticeHubPage (/app)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    mockFetchEntitlements.mockResolvedValue({
      remaining: 3,
      limit: 3,
      resetWindowDays: 7,
    });
    mockFetchEntitlement.mockResolvedValue({
      simulationsRemaining: 3,
      simulationsLimit: 3,
      simulationsUsed: 0,
      windowStartsAt: "2026-09-01T00:00:00Z",
      windowEndsAt: "2026-09-08T00:00:00Z",
    });
    mockFetchScenarios.mockResolvedValue(DEFAULT_MOCK_SCENARIOS);
    mockFetchProgress.mockResolvedValue({
      recommendedScenario: { key: "salary-negotiation" },
    });
    mockFetchScenarioDetail.mockResolvedValue(mockDetail);
    mockCreateAttempt.mockResolvedValue({
      id: "attempt-xyz-123",
      scenarioKey: "salary-negotiation",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders TestingEntitlementCard, Custom Interview Banner, and CuratedScenarioGrid", async () => {
    render(<PracticeHubPage />);

    // Greeting with user first name
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Sohail/i)).toBeDefined();
    });

    // Main localized Heading
    expect(
      screen.getByText("What conversation would help you feel more prepared?"),
    ).toBeDefined();

    // Testing Entitlement Card
    expect(screen.getByText(/3 of 3 remaining/i)).toBeDefined();

    // Custom Interview Banner
    expect(
      screen.getByText("Prepare for your real job interview"),
    ).toBeDefined();
    expect(screen.getByText("Free scenario generation")).toBeDefined();
    const customLink = screen.getByRole("link", {
      name: "Create custom interview",
    });
    expect(customLink.getAttribute("href")).toBe("/app/scenarios/custom");

    // Curated Scenario Grid
    expect(screen.getByText("Practice Scenarios")).toBeDefined();
    expect(screen.getByText("Salary Negotiation")).toBeDefined();
    expect(screen.getByText("Behavioral Job Interview")).toBeDefined();
  });

  it("clicking a scenario card calls router.replace with ?scenario=[key]", async () => {
    render(<PracticeHubPage />);

    await waitFor(() => {
      expect(screen.getByText("Salary Negotiation")).toBeDefined();
    });

    // Find the practice setup button or the card for Salary Negotiation
    const buttons = screen.getAllByRole("button", {
      name: /View practice setup/i,
    });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);

    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/app?scenario=salary-negotiation",
      { scroll: false },
    );
  });

  it("opens ScenarioBriefingModal when ?scenario= is present in URL and starts practice", async () => {
    mockSearchParams = new URLSearchParams("scenario=salary-negotiation");
    render(<PracticeHubPage />);

    // Detail fetch should be triggered
    await waitFor(() => {
      expect(mockFetchScenarioDetail).toHaveBeenCalledWith(
        "test-token",
        "salary-negotiation",
      );
    });

    // Modal should be open and display briefing details
    await waitFor(() => {
      expect(screen.getByText("Scenario Briefing")).toBeDefined();
      expect(
        screen.getByText("Speaking with: The hiring manager"),
      ).toBeDefined();
      expect(screen.getByText("The job candidate")).toBeDefined();
      expect(
        screen.getByText("Negotiate higher compensation."),
      ).toBeDefined();
    });

    // Start Practice button
    const startBtn = screen.getByRole("button", { name: "Start Practice" });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockCreateAttempt).toHaveBeenCalledWith("test-token", {
        scenarioKey: "salary-negotiation",
        difficulty: "MEDIUM",
        language: "en",
        dialect: undefined,
        interactionMode: "PUSH_TO_TALK",
        retryOfAttemptId: null,
      });
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/app/simulations/attempt-xyz-123",
      );
    });
  });

  it("closing the briefing modal calls router.replace to clear scenario param", async () => {
    mockSearchParams = new URLSearchParams("scenario=salary-negotiation");
    render(<PracticeHubPage />);

    await waitFor(() => {
      expect(screen.getByText("Scenario Briefing")).toBeDefined();
    });

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    expect(mockRouterReplace).toHaveBeenCalledWith("/app", { scroll: false });
  });

  it("renders My Custom Interviews section and handles custom scenario deletion", async () => {
    const customScenario: PublicScenarioSummary = {
      key: "custom-job-interview-1",
      version: 1,
      title: "Senior Product Manager Interview",
      category: "CUSTOM",
      summary: "Personalized interview simulation generated from CV and job description.",
      isCustom: true,
    };

    mockFetchScenarios.mockResolvedValue([
      ...DEFAULT_MOCK_SCENARIOS,
      customScenario,
    ]);

    render(<PracticeHubPage />);

    await waitFor(() => {
      expect(screen.getByText("My Custom Interviews")).toBeDefined();
      expect(
        screen.getByText("Senior Product Manager Interview"),
      ).toBeDefined();
    });

    // Click trash button
    const trashBtn = screen.getByRole("button", {
      name: "Delete Senior Product Manager Interview",
    });
    fireEvent.click(trashBtn);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Delete custom interview?")).toBeDefined();
    });

    // Confirm delete
    mockDeleteCustomScenario.mockResolvedValue(undefined);
    const confirmDeleteBtn = screen.getByRole("button", {
      name: "Delete Scenario",
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteCustomScenario).toHaveBeenCalledWith(
        "test-token",
        "custom-job-interview-1",
      );
    });
  });

  it("closes modal and resets URL when currently active custom scenario is deleted", async () => {
    const customScenario: PublicScenarioSummary = {
      key: "custom-job-interview-active",
      version: 1,
      title: "Active Custom Interview",
      category: "CUSTOM",
      summary: "Interview scenario that is currently open.",
      isCustom: true,
    };

    mockFetchScenarios.mockResolvedValue([
      ...DEFAULT_MOCK_SCENARIOS,
      customScenario,
    ]);
    mockSearchParams = new URLSearchParams("scenario=custom-job-interview-active");

    render(<PracticeHubPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Custom Interview")).toBeDefined();
    });

    const trashBtn = screen.getByRole("button", {
      name: "Delete Active Custom Interview",
    });
    fireEvent.click(trashBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete custom interview?")).toBeDefined();
    });

    mockDeleteCustomScenario.mockResolvedValue(undefined);
    const confirmDeleteBtn = screen.getByRole("button", {
      name: "Delete Scenario",
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/app", { scroll: false });
    });
  });

  it("falls back to DEFAULT_MOCK_SCENARIOS and shows message when scenarios fetch fails", async () => {
    mockFetchScenarios.mockRejectedValue(new Error("Network failure"));

    render(<PracticeHubPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/We could not refresh the scenario list/i),
      ).toBeDefined();
      // Should still render fallback default scenarios
      expect(screen.getByText("Salary Negotiation")).toBeDefined();
    });
  });
});
