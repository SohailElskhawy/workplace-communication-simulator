import { z } from "zod";

const ResourceIdSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });

export const PlanTierSchema = z.enum(["FREE", "PLUS", "PRO"]);

export const PlanEntitlementSchema = z.strictObject({
  plan: PlanTierSchema,
  effectivePlan: PlanTierSchema,
  expiresAt: TimestampSchema.nullable(),
  simulationsLimit: z.number().int().positive().nullable(),
  simulationsUsed: z.number().int().min(0),
  simulationsRemaining: z.number().int().min(0).nullable(),
  windowStartsAt: TimestampSchema,
  windowEndsAt: TimestampSchema,
});

export const MeResponseSchema = z.strictObject({
  data: z.strictObject({
    id: ResourceIdSchema,
    entitlement: PlanEntitlementSchema,
  }),
});

export type PlanTier = z.infer<typeof PlanTierSchema>;
export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
