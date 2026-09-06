// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardDescription, CardHeader, CardTitle } from "./card";

describe("Warm Coral Primitives", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Button", () => {
    it("renders primary action button with min-h-11 touch target", () => {
      render(<Button>Start Practice</Button>);
      const btn = screen.getByRole("button", { name: /start practice/i });
      expect(btn).toBeDefined();
      expect(btn.className).toContain("bg-primary");
      expect(btn.className).toContain("min-h-11");
    });

    it("renders secondary and coral variants", () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      let btn = screen.getByRole("button", { name: /secondary/i });
      expect(btn.className).toContain("bg-surface-solid");

      rerender(<Button variant="coral">Coral Accent</Button>);
      btn = screen.getByRole("button", { name: /coral accent/i });
      expect(btn.className).toContain("bg-brand-coral");
    });
  });

  describe("Badge", () => {
    it("renders default, coral, and success tones", () => {
      const { rerender } = render(<Badge tone="coral">Recommended</Badge>);
      let badge = screen.getByText("Recommended");
      expect(badge.className).toContain("bg-selected-surface");

      rerender(<Badge tone="success">Achieved</Badge>);
      badge = screen.getByText("Achieved");
      expect(badge.className).toContain("bg-success-surface");
    });
  });

  describe("Card", () => {
    it("renders card with header, title, and description", () => {
      render(
        <Card selected={true}>
          <CardHeader>
            <CardTitle>Salary Negotiation</CardTitle>
            <CardDescription>Advocate for fair compensation.</CardDescription>
          </CardHeader>
        </Card>,
      );

      expect(screen.getByText("Salary Negotiation")).toBeDefined();
      expect(screen.getByText("Advocate for fair compensation.")).toBeDefined();
    });
  });
});
