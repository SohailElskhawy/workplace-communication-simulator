// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { BrandLogo, BrandLogoMark } from "./brand-logo";

describe("BrandLogo", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders mark-only variant correctly", () => {
    const { container } = render(<BrandLogo variant="mark-only" size="sm" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
  });

  it("renders English lockup by default", () => {
    render(<BrandLogo />);
    expect(screen.getByText("Kalemny")).toBeDefined();
  });

  it("renders Arabic lockup when requested or RTL", () => {
    render(<BrandLogo variant="lockup-ar" />);
    expect(screen.getByText("كلمني")).toBeDefined();
  });

  it("renders bilingual lockup with both English and Arabic labels", () => {
    render(<BrandLogo variant="bilingual" />);
    expect(screen.getByText("Kalemny")).toBeDefined();
    expect(screen.getByText("كلمني")).toBeDefined();
  });

  it("renders BrandLogoMark standalone with custom size", () => {
    const { container } = render(<BrandLogoMark size={48} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("48");
    expect(svg?.getAttribute("height")).toBe("48");
  });
});
