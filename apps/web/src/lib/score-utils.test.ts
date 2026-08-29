import { describe, expect, it } from "vitest";

import {
  formatCoachingMomentType,
  formatObjectiveStatus,
  getScoreBand,
  getSkillMetadata,
} from "./score-utils.js";

describe("score-utils", () => {
  describe("getScoreBand", () => {
    it("returns exceptional for scores >= 90", () => {
      const band = getScoreBand(95);
      expect(band.label).toBe("Exceptional");
      expect(band.variant).toBe("exceptional");
    });

    it("returns strong for scores 75-89", () => {
      const band = getScoreBand(78);
      expect(band.label).toBe("Strong");
      expect(band.variant).toBe("strong");
    });

    it("returns competent for scores 60-74", () => {
      const band = getScoreBand(65);
      expect(band.label).toBe("Competent");
      expect(band.variant).toBe("competent");
    });

    it("returns developing for scores 40-59", () => {
      const band = getScoreBand(48);
      expect(band.label).toBe("Developing");
      expect(band.variant).toBe("developing");
    });

    it("returns weak/needs focus for scores < 40", () => {
      const band = getScoreBand(30);
      expect(band.label).toBe("Needs Focus");
      expect(band.variant).toBe("weak");
    });

    it("clamps scores to 0-100", () => {
      expect(getScoreBand(-10).variant).toBe("weak");
      expect(getScoreBand(150).variant).toBe("exceptional");
    });
  });

  describe("getSkillMetadata", () => {
    it("returns correct metadata for universal skills", () => {
      const clarity = getSkillMetadata("CLARITY");
      expect(clarity.name).toBe("Clarity");
      expect(clarity.description).toContain("Articulating");

      const assertiveness = getSkillMetadata("assertiveness");
      expect(assertiveness.name).toBe("Assertiveness");
    });

    it("handles fallback gracefully", () => {
      const custom = getSkillMetadata("unknown_skill");
      expect(custom.name).toBe("Unknown_skill");
    });
  });

  describe("formatObjectiveStatus", () => {
    it("formats achieved, partially achieved, and missed", () => {
      expect(formatObjectiveStatus("ACHIEVED").scoreEquivalent).toBe(100);
      expect(formatObjectiveStatus("PARTIALLY_ACHIEVED").scoreEquivalent).toBe(
        50,
      );
      expect(formatObjectiveStatus("MISSED").scoreEquivalent).toBe(0);
    });
  });

  describe("formatCoachingMomentType", () => {
    it("formats moment types correctly", () => {
      expect(formatCoachingMomentType("STRENGTH").label).toBe("Key Strength");
      expect(formatCoachingMomentType("IMPROVEMENT").label).toBe(
        "Growth Opportunity",
      );
      expect(formatCoachingMomentType("MISSED_OPPORTUNITY").label).toBe(
        "Missed Opportunity",
      );
    });
  });
});
