import { describe, expect, it } from "vitest";

import {
  formatWhatsAppUrl,
  PRICING_PLANS,
  WHATSAPP_PHONE_NUMBER,
} from "./pricing-config.js";

describe("pricing configuration", () => {
  it("formats WhatsApp URL with cleaned digits and URI-encoded message", () => {
    const url = formatWhatsAppUrl(
      "+90 552 850 99 69",
      "Hi! I want to upgrade.",
    );

    expect(url).toBe(
      "https://wa.me/905528509969?text=Hi!%20I%20want%20to%20upgrade.",
    );
  });

  it("contains Free, Plus, and Pro tiers with expected attributes", () => {
    expect(PRICING_PLANS).toHaveLength(3);

    const [freePlan, plusPlan, proPlan] = PRICING_PLANS;

    expect(freePlan?.id).toBe("free");
    expect(freePlan?.name).toBe("Free");
    expect(freePlan?.price).toBe("$0");
    expect(freePlan?.simulationsText).toContain("3 simulations");
    expect(freePlan?.features.length).toBeGreaterThanOrEqual(4);

    expect(plusPlan?.id).toBe("plus");
    expect(plusPlan?.name).toBe("Plus");
    expect(plusPlan?.popular).toBe(true);
    expect(plusPlan?.whatsappMessage).toBeDefined();

    expect(proPlan?.id).toBe("pro");
    expect(proPlan?.name).toBe("Pro");
    expect(proPlan?.whatsappMessage).toBeDefined();
  });

  it("generates valid WhatsApp URLs for paid tiers with the configured phone number", () => {
    expect(WHATSAPP_PHONE_NUMBER).toBe("+905528509969");

    const paidPlans = PRICING_PLANS.filter((p) => p.whatsappMessage);
    expect(paidPlans).toHaveLength(2);

    for (const plan of paidPlans) {
      const url = formatWhatsAppUrl(
        WHATSAPP_PHONE_NUMBER,
        plan.whatsappMessage!,
      );
      expect(url).toMatch(/^https:\/\/wa\.me\/905528509969\?text=/);
      expect(url).toContain(encodeURIComponent(plan.name));
    }
  });
});
