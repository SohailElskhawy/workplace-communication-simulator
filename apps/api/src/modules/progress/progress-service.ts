import type { ProgressData } from "@kalemny/contracts";

import {
  calculateProgressProfile,
  getRecommendedScenario,
  type EvaluationSkillRecord,
} from "./progress-rules.js";

export interface ProgressRepository {
  findLatestEligibleEvaluations(
    userId: string,
    limit: number,
  ): Promise<EvaluationSkillRecord[]>;
}

export interface ProgressService {
  getProgress(userId: string): Promise<ProgressData>;
}

export function createProgressService(
  repository: ProgressRepository,
): ProgressService {
  return {
    async getProgress(userId) {
      const records = await repository.findLatestEligibleEvaluations(userId, 5);
      const profile = calculateProgressProfile(records);
      const recommendedScenario = getRecommendedScenario(profile.weakestSkill);

      return {
        skills: profile.skills,
        weakestSkill: profile.weakestSkill,
        recommendedScenario,
        eligibleSessionCount: records.length,
      };
    },
  };
}
