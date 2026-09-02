import { describe, expect, it } from "vitest";

import {
  MeResponseSchema,
  PlanEntitlementSchema,
  PlanTierSchema,
} from "./me.js";

describe("PlanTierSchema", () => {
  it("accepts valid plan tiers", () => {
    expect(PlanTierSchema.parse("FREE")).toBe("FREE");
    expect(PlanTierSchema.parse("PLUS")).toBe("PLUS");
    expect(PlanTierSchema.parse("PRO")).toBe("PRO");
  });

  it("rejects unknown plan tiers", () => {
    expect(() => PlanTierSchema.parse("ENTERPRISE")).toThrow();
  });
});

describe("PlanEntitlementSchema", () => {
  it("accepts valid entitlement data with limits", () => {
    const entitlement = {
      plan: "FREE",
      effectivePlan: "FREE",
      expiresAt: null,
      simulationsLimit: 3,
      simulationsUsed: 1,
      simulationsRemaining: 2,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    };

    expect(PlanEntitlementSchema.parse(entitlement)).toEqual(entitlement);
  });

  it("accepts unlimited tier entitlement data", () => {
    const entitlement = {
      plan: "PRO",
      effectivePlan: "PRO",
      expiresAt: "2026-12-31T23:59:59.000Z",
      simulationsLimit: null,
      simulationsUsed: 15,
      simulationsRemaining: null,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    };

    expect(PlanEntitlementSchema.parse(entitlement)).toEqual(entitlement);
  });
});

describe("MeResponseSchema", () => {
  it("accepts the frontend-safe local user and entitlement response", () => {
    const valid = {
      data: {
        id: "ef4d8dd1-d525-45d7-91f6-3a180db74eac",
        entitlement: {
          plan: "FREE",
          effectivePlan: "FREE",
          expiresAt: null,
          simulationsLimit: 3,
          simulationsUsed: 0,
          simulationsRemaining: 3,
          windowStartsAt: "2026-08-26T10:00:00.000Z",
          windowEndsAt: "2026-09-02T10:00:00.000Z",
        },
      },
    };

    expect(MeResponseSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a provider identity in place of a local UUID", () => {
    expect(() =>
      MeResponseSchema.parse({
        data: {
          id: "user_clerk_123",
          entitlement: {
            plan: "FREE",
            effectivePlan: "FREE",
            expiresAt: null,
            simulationsLimit: 3,
            simulationsUsed: 0,
            simulationsRemaining: 3,
            windowStartsAt: "2026-08-26T10:00:00.000Z",
            windowEndsAt: "2026-09-02T10:00:00.000Z",
          },
        },
      }),
    ).toThrow();
  });
});
