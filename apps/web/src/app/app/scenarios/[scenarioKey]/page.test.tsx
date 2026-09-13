// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ScenarioRedirectPage from "./page";

const mockRouterReplace = vi.fn();
let mockParams: { scenarioKey?: string | string[] } = {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useParams: () => mockParams,
}));

describe("ScenarioRedirectPage (/app/scenarios/[scenarioKey])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects to /app?scenario=[scenarioKey] when scenarioKey is provided", () => {
    mockParams = { scenarioKey: "salary-negotiation" };
    render(<ScenarioRedirectPage />);

    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/app?scenario=salary-negotiation",
    );
  });

  it("handles URL encoded scenario keys properly", () => {
    mockParams = { scenarioKey: "custom interview key" };
    render(<ScenarioRedirectPage />);

    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/app?scenario=custom%20interview%20key",
    );
  });

  it("redirects to /app if scenarioKey is missing", () => {
    mockParams = {};
    render(<ScenarioRedirectPage />);

    expect(mockRouterReplace).toHaveBeenCalledWith("/app");
  });

  it("handles array scenarioKey param", () => {
    mockParams = { scenarioKey: ["behavioral-interview"] };
    render(<ScenarioRedirectPage />);

    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/app?scenario=behavioral-interview",
    );
  });
});
