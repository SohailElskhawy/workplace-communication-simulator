import type { PlanEntitlement, PlanTier } from "@kalemny/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";

import {
  calculateEntitlementWindow,
  calculateRemainingSimulations,
  DEFAULT_PLAN_LIMITS,
  type PlanLimits,
  resolveEffectivePlan,
} from "./entitlement-rules.js";

export interface UserPlanRecord {
  plan: PlanTier;
  planExpiresAt: Date | null;
}

export interface EntitlementRepository {
  getUserPlan(userId: string): Promise<UserPlanRecord | null>;
  getPracticeUsageCount(userId: string, since: Date): Promise<number>;
}

export interface EntitlementService {
  getUserEntitlement(
    userId: string,
    currentTime?: Date,
  ): Promise<PlanEntitlement>;
}

export function createPrismaEntitlementRepository(
  prisma: PrismaClient,
): EntitlementRepository {
  return {
    async getUserPlan(userId: string) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          planExpiresAt: true,
        },
      });
    },

    async getPracticeUsageCount(userId: string, since: Date) {
      return prisma.practiceUsageLedger.count({
        where: {
          userId,
          createdAt: { gte: since },
        },
      });
    },
  };
}

export function createEntitlementService(
  repository: EntitlementRepository,
  limits: PlanLimits = DEFAULT_PLAN_LIMITS,
  clock: () => Date = () => new Date(),
): EntitlementService {
  return {
    async getUserEntitlement(userId: string, customCurrentTime?: Date) {
      const now = customCurrentTime ?? clock();
      const user = await repository.getUserPlan(userId);

      const plan: PlanTier = user?.plan ?? "FREE";
      const planExpiresAt = user?.planExpiresAt ?? null;
      const effectivePlan = resolveEffectivePlan(plan, planExpiresAt, now);

      const { windowStartsAt, windowEndsAt } = calculateEntitlementWindow(now);
      const simulationsUsed = await repository.getPracticeUsageCount(
        userId,
        windowStartsAt,
      );

      const simulationsLimit = limits[effectivePlan] ?? null;
      const simulationsRemaining = calculateRemainingSimulations(
        simulationsLimit,
        simulationsUsed,
      );

      return {
        plan,
        effectivePlan,
        expiresAt: planExpiresAt?.toISOString() ?? null,
        simulationsLimit,
        simulationsUsed,
        simulationsRemaining,
        windowStartsAt: windowStartsAt.toISOString(),
        windowEndsAt: windowEndsAt.toISOString(),
      };
    },
  };
}
