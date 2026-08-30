import type {
  AttemptStatus,
  CoachingMoment,
  Difficulty,
  EvaluationData,
  ImprovementFeedback,
  ObjectiveResult,
  SkillScores,
  StrengthFeedback,
  UniversalSkill,
} from "@kalemny/contracts";

export interface AttemptForEvaluationTurn {
  id: string;
  sequence: number;
  userText: string;
  assistantText: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface AttemptForEvaluationRecord {
  id: string;
  userId: string;
  status: AttemptStatus;
  difficulty: Difficulty;
  variationId: string | null;
  endedAt: Date | null;
  scenario: {
    id: string;
    key: string;
    version: number;
    title: string;
    definition: unknown;
  };
  turns: AttemptForEvaluationTurn[];
  evaluation: EvaluationData | null;
}

export interface EvaluationRecord {
  id: string;
  attemptId: string;
  clarity: number;
  assertiveness: number;
  empathy: number;
  structure: number;
  conciseness: number;
  universalScore: number;
  scenarioScore: number;
  overallScore: number;
  objectiveResults: ObjectiveResult[];
  strengths: StrengthFeedback[];
  improvements: ImprovementFeedback[];
  moments: CoachingMoment[];
  nextFocusSkill: UniversalSkill;
  nextFocusReason: string;
  summary: string;
  model: string;
  promptVersion: string;
  createdAt: Date;
}

export interface SaveEvaluationInput {
  attemptId: string;
  userId: string;
  skills: SkillScores;
  universalScore: number;
  scenarioScore: number;
  overallScore: number;
  objectiveResults: ObjectiveResult[];
  strengths: StrengthFeedback[];
  improvements: ImprovementFeedback[];
  moments: CoachingMoment[];
  nextFocusSkill: UniversalSkill;
  nextFocusReason: string;
  summary: string;
  model: string;
  promptVersion: string;
  progressEligible: boolean;
  endedAt: Date;
  usage: {
    provider: "openrouter";
    model: string;
    status: "SUCCESS";
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCost: number | null;
    errorCode: null;
  };
}

export interface MarkEvaluationFailedInput {
  attemptId: string;
  userId: string;
  usage: {
    provider: "openrouter";
    model: string;
    status: "FAILED";
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCost: number | null;
    errorCode: "AI_TIMEOUT" | "AI_PROVIDER_ERROR" | "EVALUATION_FAILED";
  };
}

export interface EvaluationRepository {
  claimEvaluation(
    attemptId: string,
    userId: string,
    claimedAt: Date,
  ): Promise<
    | { kind: "claimed"; attempt: AttemptForEvaluationRecord }
    | { kind: "existing"; evaluation: EvaluationRecord }
    | { kind: "in_progress" }
    | { kind: "not_found" }
    | { kind: "rejected" }
  >;
  findAttemptForEvaluation(
    attemptId: string,
    userId: string,
  ): Promise<AttemptForEvaluationRecord | null>;
  findExistingEvaluation(attemptId: string): Promise<EvaluationRecord | null>;
  saveEvaluation(input: SaveEvaluationInput): Promise<EvaluationRecord>;
  markEvaluationFailed(input: MarkEvaluationFailedInput): Promise<void>;
}

export interface PrismaEvaluationLike {
  attemptId: string;
  clarity: number;
  assertiveness: number;
  empathy: number;
  structure: number;
  conciseness: number;
  universalScore: number;
  scenarioScore: number;
  overallScore: number;
  objectiveResults: unknown;
  strengths: unknown;
  improvements: unknown;
  moments: unknown;
  nextFocusSkill: UniversalSkill;
  nextFocusReason: string;
  summary: string;
  createdAt: Date;
}

export function mapPrismaEvaluationToData(
  evaluation: PrismaEvaluationLike | null,
): EvaluationData | null {
  if (!evaluation) return null;
  return {
    attemptId: evaluation.attemptId,
    skills: {
      clarity: evaluation.clarity,
      assertiveness: evaluation.assertiveness,
      empathy: evaluation.empathy,
      structure: evaluation.structure,
      conciseness: evaluation.conciseness,
    },
    universalScore: evaluation.universalScore,
    scenarioScore: evaluation.scenarioScore,
    overallScore: evaluation.overallScore,
    objectives: evaluation.objectiveResults as unknown as ObjectiveResult[],
    strengths: evaluation.strengths as unknown as StrengthFeedback[],
    improvements: evaluation.improvements as unknown as ImprovementFeedback[],
    moments: evaluation.moments as unknown as CoachingMoment[],
    summary: evaluation.summary,
    nextFocus: {
      skill: evaluation.nextFocusSkill,
      reason: evaluation.nextFocusReason,
    },
    createdAt: evaluation.createdAt.toISOString(),
  };
}
