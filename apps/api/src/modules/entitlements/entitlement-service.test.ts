import { describe, expect, it, vi } from "vitest";

import {
  createEntitlementService,
  type EntitlementRepository,
} from "./entitlement-service.js";

describe("createEntitlementService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const now = new Date("2026-09-02T10:00:00.000Z");

  it("returns FREE plan entitlement with default limit of 3 and usage count", async () => {
    const repository: EntitlementRepository = {
      getUserPlan: vi
        .fn()
        .mockResolvedValue({ plan: "FREE", planExpiresAt: null }),
      getPracticeUsageCount: vi.fn().mockResolvedValue(1),
    };

    const service = createEntitlementService(
      repository,
      { FREE: 3, PLUS: 10, PRO: null },
      () => now,
    );
    const entitlement = await service.getUserEntitlement(userId);

    expect(entitlement).toEqual({
      plan: "FREE",
      effectivePlan: "FREE",
      expiresAt: null,
      simulationsLimit: 3,
      simulationsUsed: 1,
      simulationsRemaining: 2,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    });
    expect(repository.getPracticeUsageCount).toHaveBeenCalledWith(
      userId,
      new Date("2026-08-26T10:00:00.000Z"),
    );
  });

  it("returns PLUS plan entitlement with configured limit", async () => {
    const expiry = new Date("2026-09-30T23:59:59.000Z");
    const repository: EntitlementRepository = {
      getUserPlan: vi
        .fn()
        .mockResolvedValue({ plan: "PLUS", planExpiresAt: expiry }),
      getPracticeUsageCount: vi.fn().mockResolvedValue(4),
    };

    const service = createEntitlementService(
      repository,
      { FREE: 3, PLUS: 10, PRO: null },
      () => now,
    );
    const entitlement = await service.getUserEntitlement(userId);

    expect(entitlement).toEqual({
      plan: "PLUS",
      effectivePlan: "PLUS",
      expiresAt: expiry.toISOString(),
      simulationsLimit: 10,
      simulationsUsed: 4,
      simulationsRemaining: 6,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    });
  });

  it("falls back to FREE entitlement when PLUS plan has expired", async () => {
    const expiredAt = new Date("2026-09-01T10:00:00.000Z");
    const repository: EntitlementRepository = {
      getUserPlan: vi
        .fn()
        .mockResolvedValue({ plan: "PLUS", planExpiresAt: expiredAt }),
      getPracticeUsageCount: vi.fn().mockResolvedValue(3),
    };

    const service = createEntitlementService(
      repository,
      { FREE: 3, PLUS: 10, PRO: null },
      () => now,
    );
    const entitlement = await service.getUserEntitlement(userId);

    expect(entitlement).toEqual({
      plan: "PLUS",
      effectivePlan: "FREE",
      expiresAt: expiredAt.toISOString(),
      simulationsLimit: 3,
      simulationsUsed: 3,
      simulationsRemaining: 0,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    });
  });

  it("returns PRO unlimited plan entitlement", async () => {
    const repository: EntitlementRepository = {
      getUserPlan: vi
        .fn()
        .mockResolvedValue({ plan: "PRO", planExpiresAt: null }),
      getPracticeUsageCount: vi.fn().mockResolvedValue(25),
    };

    const service = createEntitlementService(
      repository,
      { FREE: 3, PLUS: 10, PRO: null },
      () => now,
    );
    const entitlement = await service.getUserEntitlement(userId);

    expect(entitlement).toEqual({
      plan: "PRO",
      effectivePlan: "PRO",
      expiresAt: null,
      simulationsLimit: null,
      simulationsUsed: 25,
      simulationsRemaining: null,
      windowStartsAt: "2026-08-26T10:00:00.000Z",
      windowEndsAt: "2026-09-02T10:00:00.000Z",
    });
  });

  it("defaults user to FREE when user record is not found", async () => {
    const repository: EntitlementRepository = {
      getUserPlan: vi.fn().mockResolvedValue(null),
      getPracticeUsageCount: vi.fn().mockResolvedValue(0),
    };

    const service = createEntitlementService(
      repository,
      { FREE: 3, PLUS: null, PRO: null },
      () => now,
    );
    const entitlement = await service.getUserEntitlement(userId);

    expect(entitlement.plan).toBe("FREE");
    expect(entitlement.effectivePlan).toBe("FREE");
    expect(entitlement.simulationsRemaining).toBe(3);
  });
});
