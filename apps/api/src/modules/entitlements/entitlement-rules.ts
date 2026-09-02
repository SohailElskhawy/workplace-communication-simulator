import type { PlanTier } from "@kalemny/contracts";

export const DEFAULT_FREE_WEEKLY_SIMULATION_LIMIT = 3;
export const ENTITLEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PlanLimits {
  FREE: number;
  PLUS: number | null;
  PRO: number | null;
}

export const DEFAULT_PLAN_LIMITS: PlanLimits = {
  FREE: DEFAULT_FREE_WEEKLY_SIMULATION_LIMIT,
  PLUS: null,
  PRO: null,
};

/**
 * Resolves the effective plan tier for a user.
 * If a PLUS or PRO plan has expired relative to currentTime, the effective tier falls back to FREE.
 */
export function resolveEffectivePlan(
  plan: PlanTier,
  planExpiresAt: Date | null,
  currentTime: Date,
): PlanTier {
  if (
    planExpiresAt !== null &&
    planExpiresAt.getTime() <= currentTime.getTime()
  ) {
    return "FREE";
  }
  return plan;
}

/**
 * Calculates the rolling 7-day window boundary for practice usage tracking.
 */
export function calculateEntitlementWindow(currentTime: Date): {
  windowStartsAt: Date;
  windowEndsAt: Date;
} {
  const windowStartsAt = new Date(
    currentTime.getTime() - ENTITLEMENT_WINDOW_MS,
  );
  return {
    windowStartsAt,
    windowEndsAt: currentTime,
  };
}

/**
 * Calculates the remaining simulations based on limit and usage.
 * Returns null if the limit is unlimited (null).
 */
export function calculateRemainingSimulations(
  limit: number | null,
  usedCount: number,
): number | null {
  if (limit === null) {
    return null;
  }
  return Math.max(0, limit - usedCount);
}

/**
 * Determines whether the user has reached or exceeded their simulation quota.
 */
export function isQuotaExceeded(
  usedCount: number,
  limit: number | null,
): boolean {
  if (limit === null) {
    return false;
  }
  return usedCount >= limit;
}
