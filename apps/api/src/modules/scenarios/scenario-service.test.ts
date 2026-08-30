import { describe, expect, it } from "vitest";

import { salaryNegotiationV1 } from "./definitions/salary-negotiation.js";
import { createScenarioService } from "./scenario-service.js";

const summary = {
  key: salaryNegotiationV1.key,
  version: salaryNegotiationV1.version,
  title: salaryNegotiationV1.title,
  category: salaryNegotiationV1.category,
  summary: salaryNegotiationV1.summary,
};

describe("ScenarioService caching", () => {
  it("caches listActive results within TTL", async () => {
    let callCount = 0;
    const service = createScenarioService({
      async listActive() {
        callCount++;
        return [summary];
      },
      async findActiveByKey() {
        return null;
      },
    });

    const first = await service.listActive();
    const second = await service.listActive();

    expect(first).toEqual([summary]);
    expect(second).toEqual(first);
    expect(callCount).toBe(1);
  });

  it("caches getActiveByKey results within TTL and expires after TTL", async () => {
    let currentTime = 1000;
    let callCount = 0;
    const service = createScenarioService(
      {
        async listActive() {
          return [];
        },
        async findActiveByKey(key) {
          callCount++;
          return key === salaryNegotiationV1.key
            ? { ...summary, definition: salaryNegotiationV1 }
            : null;
        },
      },
      {
        ttlMs: 5000,
        clock: () => currentTime,
      },
    );

    const first = await service.getActiveByKey("salary-negotiation");
    expect(first?.key).toBe("salary-negotiation");
    expect(callCount).toBe(1);

    currentTime += 2000;
    const second = await service.getActiveByKey("salary-negotiation");
    expect(second?.key).toBe("salary-negotiation");
    expect(callCount).toBe(1);

    currentTime += 4000; // total 6000ms > 5000ms
    const third = await service.getActiveByKey("salary-negotiation");
    expect(third?.key).toBe("salary-negotiation");
    expect(callCount).toBe(2);
  });
});
