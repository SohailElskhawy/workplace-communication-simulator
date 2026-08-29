import { describe, expect, it } from "vitest";

import {
  createProgressService,
  type ProgressRepository,
} from "./progress-service.js";

const userId = "11111111-1111-4111-8111-111111111111";

describe("ProgressService", () => {
  it("returns progress data calculated over latest eligible evaluations", async () => {
    const mockRepo: ProgressRepository = {
      async findLatestEligibleEvaluations() {
        return [
          {
            clarity: 80,
            assertiveness: 60,
            empathy: 90,
            structure: 75,
            conciseness: 85,
          },
          {
            clarity: 85,
            assertiveness: 65,
            empathy: 80,
            structure: 80,
            conciseness: 75,
          },
        ];
      },
    };

    const service = createProgressService(mockRepo);
    const progress = await service.getProgress(userId);

    expect(progress.eligibleSessionCount).toBe(2);
    expect(progress.skills).toEqual({
      clarity: 83,
      assertiveness: 63,
      empathy: 85,
      structure: 78,
      conciseness: 80,
    });
    expect(progress.weakestSkill).toBe("ASSERTIVENESS");
    expect(progress.recommendedScenario).toEqual({
      key: "salary-negotiation",
      title: "Salary Negotiation",
    });
  });

  it("returns empty progress profile when no eligible sessions exist", async () => {
    const mockRepo: ProgressRepository = {
      async findLatestEligibleEvaluations() {
        return [];
      },
    };

    const service = createProgressService(mockRepo);
    const progress = await service.getProgress(userId);

    expect(progress.eligibleSessionCount).toBe(0);
    expect(progress.skills).toBeNull();
    expect(progress.weakestSkill).toBeNull();
    expect(progress.recommendedScenario).toBeNull();
  });
});
