import type { ObjectiveStatus, SkillScores } from "@kalemny/contracts";

import type { RawAiEvaluation } from "../ai/evaluation-prompt.js";

export const MINIMUM_TURNS_FOR_PROGRESS = 3;

export function calculateUniversalScore(skills: SkillScores): number {
  const sum =
    skills.clarity +
    skills.assertiveness +
    skills.empathy +
    skills.structure +
    skills.conciseness;
  return Math.round(sum / 5);
}

export function objectiveStatusToNumeric(status: ObjectiveStatus): number {
  switch (status) {
    case "ACHIEVED":
      return 100;
    case "PARTIALLY_ACHIEVED":
      return 50;
    case "MISSED":
      return 0;
  }
}

export function calculateScenarioScore(
  objectives: Array<{ status: ObjectiveStatus }>,
): number {
  if (objectives.length === 0) return 0;
  const sum = objectives.reduce(
    (acc, obj) => acc + objectiveStatusToNumeric(obj.status),
    0,
  );
  return Math.round(sum / objectives.length);
}

export function calculateOverallScore(
  universalScore: number,
  scenarioScore: number,
): number {
  return Math.round(universalScore * 0.7 + scenarioScore * 0.3);
}

export function isProgressEligible(completedTurnsCount: number): boolean {
  return completedTurnsCount >= MINIMUM_TURNS_FOR_PROGRESS;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEvaluationReferences(
  raw: RawAiEvaluation,
  validTurnIds: Set<string>,
  scenarioObjectiveIds: Set<string>,
): ValidationResult {
  const evaluatedObjectiveIds = new Set<string>();

  for (const obj of raw.objectives) {
    if (!scenarioObjectiveIds.has(obj.objectiveId)) {
      return {
        valid: false,
        reason: `Evaluated objective ID '${obj.objectiveId}' is not defined in the scenario.`,
      };
    }
    if (evaluatedObjectiveIds.has(obj.objectiveId)) {
      return {
        valid: false,
        reason: `Scenario objective '${obj.objectiveId}' was evaluated more than once.`,
      };
    }
    evaluatedObjectiveIds.add(obj.objectiveId);

    for (const turnId of obj.evidenceTurnIds) {
      if (!validTurnIds.has(turnId)) {
        return {
          valid: false,
          reason: `Objective evidence references invalid turn ID '${turnId}'.`,
        };
      }
    }
  }

  for (const requiredId of scenarioObjectiveIds) {
    if (!evaluatedObjectiveIds.has(requiredId)) {
      return {
        valid: false,
        reason: `Required scenario objective '${requiredId}' was not evaluated.`,
      };
    }
  }

  for (const strength of raw.strengths) {
    for (const turnId of strength.turnIds) {
      if (!validTurnIds.has(turnId)) {
        return {
          valid: false,
          reason: `Strength references invalid turn ID '${turnId}'.`,
        };
      }
    }
  }

  for (const improvement of raw.improvements) {
    for (const turnId of improvement.turnIds) {
      if (!validTurnIds.has(turnId)) {
        return {
          valid: false,
          reason: `Improvement references invalid turn ID '${turnId}'.`,
        };
      }
    }
  }

  for (const moment of raw.moments) {
    if (!validTurnIds.has(moment.turnId)) {
      return {
        valid: false,
        reason: `Coaching moment references invalid turn ID '${moment.turnId}'.`,
      };
    }
  }

  return { valid: true };
}
