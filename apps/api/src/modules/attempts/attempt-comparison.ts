import type {
  AttemptComparison,
  Difficulty,
  EvaluationData,
  ObjectiveDelta,
  ObjectiveDeltaStatus,
  ObjectiveStatus,
  SkillScores,
  UniversalSkill,
  WeakAreaComparison,
} from "@kalemny/contracts";

export interface ComparisonAttemptInput {
  id: string;
  difficulty: Difficulty;
  evaluation: EvaluationData | null;
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

export function calculateAttemptComparison(
  current: ComparisonAttemptInput,
  previous: ComparisonAttemptInput | null,
): AttemptComparison | null {
  if (!previous || !previous.evaluation || !current.evaluation) {
    return null;
  }

  const currentEval = current.evaluation;
  const prevEval = previous.evaluation;

  const comparable = current.difficulty === previous.difficulty;
  const nonEquivalentReason = comparable
    ? null
    : `Difficulty changed from ${previous.difficulty} to ${current.difficulty}. Cross-difficulty comparisons are not directly equivalent because difficulty levels alter counterpart resistance and conversational expectations.`;

  const previousOverallScore = prevEval.overallScore;
  const currentOverallScore = currentEval.overallScore;
  const overallDelta = currentOverallScore - previousOverallScore;

  const previousSkills: SkillScores = {
    clarity: prevEval.skills.clarity,
    assertiveness: prevEval.skills.assertiveness,
    empathy: prevEval.skills.empathy,
    structure: prevEval.skills.structure,
    conciseness: prevEval.skills.conciseness,
  };

  const currentSkills: SkillScores = {
    clarity: currentEval.skills.clarity,
    assertiveness: currentEval.skills.assertiveness,
    empathy: currentEval.skills.empathy,
    structure: currentEval.skills.structure,
    conciseness: currentEval.skills.conciseness,
  };

  const skillDeltas = {
    clarity: currentSkills.clarity - previousSkills.clarity,
    assertiveness: currentSkills.assertiveness - previousSkills.assertiveness,
    empathy: currentSkills.empathy - previousSkills.empathy,
    structure: currentSkills.structure - previousSkills.structure,
    conciseness: currentSkills.conciseness - previousSkills.conciseness,
  };

  const prevObjMap = new Map<string, ObjectiveStatus>(
    prevEval.objectives.map((obj) => [obj.objectiveId, obj.status]),
  );

  const objectives: ObjectiveDelta[] = currentEval.objectives.map((currObj) => {
    const prevStatus = prevObjMap.get(currObj.objectiveId) ?? "MISSED";
    const prevNum = objectiveStatusToNumeric(prevStatus);
    const currNum = objectiveStatusToNumeric(currObj.status);

    let statusChanged: ObjectiveDeltaStatus = "UNCHANGED";
    if (currNum > prevNum) {
      statusChanged = "IMPROVED";
    } else if (currNum < prevNum) {
      statusChanged = "REGRESSED";
    }

    return {
      objectiveId: currObj.objectiveId,
      previousStatus: prevStatus,
      currentStatus: currObj.status,
      statusChanged,
    };
  });

  let weakArea: WeakAreaComparison | null = null;
  const targetSkill: UniversalSkill | undefined = prevEval.nextFocus?.skill;

  if (targetSkill) {
    const skillKey = targetSkill.toLowerCase() as keyof SkillScores;
    const prevScore = previousSkills[skillKey] ?? 0;
    const currScore = currentSkills[skillKey] ?? 0;
    const delta = currScore - prevScore;

    weakArea = {
      skill: targetSkill,
      previousScore: prevScore,
      currentScore: currScore,
      delta,
      improved: delta > 0,
    };
  }

  return {
    previousAttemptId: previous.id,
    previousDifficulty: previous.difficulty,
    currentDifficulty: current.difficulty,
    comparable,
    nonEquivalentReason,
    previousOverallScore,
    currentOverallScore,
    overallDelta,
    previousSkills,
    currentSkills,
    skillDeltas,
    objectives,
    weakArea,
  };
}
