import { describe, expect, it } from "vitest";

import {
  calculateEntitlementWindow,
  calculateRemainingSimulations,
  DEFAULT_FREE_WEEKLY_SIMULATION_LIMIT,
  DEFAULT_PLAN_LIMITS,
  ENTITLEMENT_WINDOW_MS,
  isQuotaExceeded,
  resolveEffectivePlan,
} from "./entitlement-rules.js";

describe("resolveEffectivePlan", () => {
  const now = new Date("2026-09-02T10:00:00.000Z");

  it("returns FREE for FREE plan regardless of expiry", () => {
    expect(resolveEffectivePlan("FREE", null, now)).toBe("FREE");
    expect(
      resolveEffectivePlan("FREE", new Date("2026-09-01T10:00:00.000Z"), now),
    ).toBe("FREE");
  });

  it("returns active PLUS or PRO plan when plan has no expiry", () => {
    expect(resolveEffectivePlan("PLUS", null, now)).toBe("PLUS");
    expect(resolveEffectivePlan("PRO", null, now)).toBe("PRO");
  });

  it("returns active PLUS or PRO plan when expiry is in the future", () => {
    const future = new Date("2026-09-10T10:00:00.000Z");
    expect(resolveEffectivePlan("PLUS", future, now)).toBe("PLUS");
    expect(resolveEffectivePlan("PRO", future, now)).toBe("PRO");
  });

  it("falls back to FREE when PLUS or PRO plan has expired", () => {
    const past = new Date("2026-09-01T10:00:00.000Z");
    expect(resolveEffectivePlan("PLUS", past, now)).toBe("FREE");
    expect(resolveEffectivePlan("PRO", past, now)).toBe("FREE");
  });

  it("falls back to FREE when expiry is exactly now", () => {
    expect(resolveEffectivePlan("PLUS", now, now)).toBe("FREE");
    expect(resolveEffectivePlan("PRO", now, now)).toBe("FREE");
  });
});

describe("calculateEntitlementWindow", () => {
  it("calculates 7-day rolling window from current time", () => {
    const now = new Date("2026-09-02T10:00:00.000Z");
    const { windowStartsAt, windowEndsAt } = calculateEntitlementWindow(now);

    expect(windowEndsAt).toEqual(now);
    expect(windowStartsAt.getTime()).toBe(
      now.getTime() - ENTITLEMENT_WINDOW_MS,
    );
    expect(windowStartsAt.toISOString()).toBe("2026-08-26T10:00:00.000Z");
  });
});

describe("calculateRemainingSimulations", () => {
  it("returns remaining simulations when limit is set", () => {
    expect(calculateRemainingSimulations(3, 0)).toBe(3);
    expect(calculateRemainingSimulations(3, 1)).toBe(2);
    expect(calculateRemainingSimulations(3, 3)).toBe(0);
    expect(calculateRemainingSimulations(3, 5)).toBe(0);
  });

  it("returns null when limit is unlimited (null)", () => {
    expect(calculateRemainingSimulations(null, 10)).toBeNull();
  });
});

describe("isQuotaExceeded", () => {
  it("returns false when under limit", () => {
    expect(isQuotaExceeded(0, 3)).toBe(false);
    expect(isQuotaExceeded(2, 3)).toBe(false);
  });

  it("returns true when at or over limit", () => {
    expect(isQuotaExceeded(3, 3)).toBe(true);
    expect(isQuotaExceeded(4, 3)).toBe(true);
  });

  it("returns false when limit is unlimited (null)", () => {
    expect(isQuotaExceeded(100, null)).toBe(false);
  });
});

describe("DEFAULT_PLAN_LIMITS", () => {
  it("has default free limit of 3 and unlimited plus/pro", () => {
    expect(DEFAULT_FREE_WEEKLY_SIMULATION_LIMIT).toBe(3);
    expect(DEFAULT_PLAN_LIMITS.FREE).toBe(3);
    expect(DEFAULT_PLAN_LIMITS.PLUS).toBeNull();
    expect(DEFAULT_PLAN_LIMITS.PRO).toBeNull();
  });
});
