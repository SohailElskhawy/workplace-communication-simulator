import type { EvaluationData } from "@kalemny/contracts";

import { EVALUATION_PROMPT_VERSION } from "../ai/evaluation-prompt.js";
import type { AiService } from "../ai/ai-service.js";
import { AiProviderError } from "../ai/openrouter-provider.js";
import { AttemptError } from "../attempts/attempt-errors.js";
import { ScenarioDefinitionSchema } from "../scenarios/scenario-definition.js";
import type {
  EvaluationRecord,
  EvaluationRepository,
} from "./evaluation-repository.js";
import {
  calculateOverallScore,
  calculateScenarioScore,
  calculateUniversalScore,
  isProgressEligible,
  validateEvaluationReferences,
} from "./evaluation-rules.js";

export interface EvaluationService {
  evaluate(userId: string, attemptId: string): Promise<EvaluationData>;
}

function mapEvaluationRecordToData(record: EvaluationRecord): EvaluationData {
  return {
    attemptId: record.attemptId,
    skills: {
      clarity: record.clarity,
      assertiveness: record.assertiveness,
      empathy: record.empathy,
      structure: record.structure,
      conciseness: record.conciseness,
    },
    universalScore: record.universalScore,
    scenarioScore: record.scenarioScore,
    overallScore: record.overallScore,
    objectives: record.objectiveResults,
    strengths: record.strengths,
    improvements: record.improvements,
    moments: record.moments,
    summary: record.summary,
    nextFocus: {
      skill: record.nextFocusSkill,
      reason: record.nextFocusReason,
    },
    createdAt: record.createdAt.toISOString(),
  };
}

export function createEvaluationService(
  repository: EvaluationRepository,
  aiService: AiService,
  clock: () => Date = () => new Date(),
): EvaluationService {
  return {
    async evaluate(userId: string, attemptId: string): Promise<EvaluationData> {
      const claimed = await repository.claimEvaluation(
        attemptId,
        userId,
        clock(),
      );
      if (claimed.kind === "not_found") {
        throw new AttemptError("NOT_FOUND");
      }
      if (claimed.kind === "existing") {
        return mapEvaluationRecordToData(claimed.evaluation);
      }
      if (claimed.kind === "in_progress") {
        throw new AttemptError("EVALUATION_IN_PROGRESS");
      }
      if (claimed.kind === "rejected") {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }
      const attempt = claimed.attempt;

      const scenario = ScenarioDefinitionSchema.parse(
        attempt.scenario.definition,
      );
      const completedTurns = attempt.turns
        .filter((turn) => turn.status === "COMPLETED")
        .sort((a, b) => a.sequence - b.sequence);

      if (completedTurns.length === 0) {
        throw new AttemptError("INVALID_ATTEMPT_STATE");
      }

      const validTurnIds = new Set(completedTurns.map((t) => t.id));
      const scenarioObjectiveIds = new Set(
        scenario.objectives.map((o) => o.id),
      );

      const evaluationInput = {
        scenario,
        difficulty: attempt.difficulty,
        turns: completedTurns,
      };

      let aiResult;
      let lastError: unknown;

      for (let attemptCount = 0; attemptCount < 2; attemptCount++) {
        try {
          const result = await aiService.evaluateSimulation(evaluationInput);
          const refValidation = validateEvaluationReferences(
            result.evaluation,
            validTurnIds,
            scenarioObjectiveIds,
          );
          if (refValidation.valid) {
            aiResult = result;
            break;
          }
          lastError = new Error(refValidation.reason);
        } catch (err) {
          lastError = err;
        }
      }

      if (!aiResult) {
        const errorCode =
          lastError instanceof AiProviderError
            ? lastError.code
            : "EVALUATION_FAILED";
        const latencyMs =
          lastError instanceof AiProviderError ? lastError.latencyMs : 0;

        await repository.markEvaluationFailed({
          attemptId,
          userId,
          usage: {
            provider: "openrouter",
            model: aiService.evaluationModel,
            status: "FAILED",
            latencyMs,
            inputTokens: null,
            outputTokens: null,
            estimatedCost: null,
            errorCode,
          },
        });

        if (lastError instanceof AiProviderError) {
          throw new AttemptError(lastError.code);
        }
        throw new AttemptError("EVALUATION_FAILED");
      }

      const rawEval = aiResult.evaluation;
      const skills = {
        clarity: rawEval.skills.clarity.score,
        assertiveness: rawEval.skills.assertiveness.score,
        empathy: rawEval.skills.empathy.score,
        structure: rawEval.skills.structure.score,
        conciseness: rawEval.skills.conciseness.score,
      };
      const universalScore = calculateUniversalScore(skills);
      const scenarioScore = calculateScenarioScore(rawEval.objectives);
      const overallScore = calculateOverallScore(universalScore, scenarioScore);
      const progressEligible = isProgressEligible(completedTurns.length);

      const saved = await repository.saveEvaluation({
        attemptId,
        userId,
        skills,
        universalScore,
        scenarioScore,
        overallScore,
        objectiveResults: rawEval.objectives.map((obj) => ({
          objectiveId: obj.objectiveId,
          status: obj.status,
          explanation: obj.explanation,
          evidenceTurnIds: obj.evidenceTurnIds,
        })),
        strengths: rawEval.strengths,
        improvements: rawEval.improvements,
        moments: rawEval.moments.map((m) => ({
          turnId: m.turnId,
          type: m.type,
          explanation: m.explanation,
          betterResponse: m.betterResponse ?? null,
        })),
        nextFocusSkill: rawEval.nextFocus.skill,
        nextFocusReason: rawEval.nextFocus.reason,
        summary: rawEval.summary,
        model: aiService.evaluationModel,
        promptVersion: EVALUATION_PROMPT_VERSION,
        progressEligible,
        endedAt: attempt.endedAt ?? clock(),
        usage: {
          provider: "openrouter",
          model: aiService.evaluationModel,
          status: "SUCCESS",
          latencyMs: aiResult.latencyMs,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          estimatedCost: aiResult.estimatedCost,
          errorCode: null,
        },
      });

      return mapEvaluationRecordToData(saved);
    },
  };
}
