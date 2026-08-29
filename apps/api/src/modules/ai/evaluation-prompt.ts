import { z } from "zod";

import type { Difficulty } from "@kalemny/contracts";

import type { ScenarioDefinition } from "../scenarios/scenario-definition.js";

export const EVALUATION_PROMPT_VERSION = "evaluation-v1" as const;

export interface EvaluationTranscriptTurn {
  id: string;
  sequence: number;
  userText: string;
  assistantText: string | null;
}

export interface EvaluationPromptInput {
  scenario: ScenarioDefinition;
  difficulty: Difficulty;
  turns: EvaluationTranscriptTurn[];
}

export interface EvaluationMessage {
  role: "system" | "user";
  content: string;
}

export const RawAiEvaluationSchema = z.strictObject({
  skills: z.strictObject({
    clarity: z.strictObject({
      score: z.int().min(0).max(100),
      explanation: z.string().min(1),
    }),
    assertiveness: z.strictObject({
      score: z.int().min(0).max(100),
      explanation: z.string().min(1),
    }),
    empathy: z.strictObject({
      score: z.int().min(0).max(100),
      explanation: z.string().min(1),
    }),
    structure: z.strictObject({
      score: z.int().min(0).max(100),
      explanation: z.string().min(1),
    }),
    conciseness: z.strictObject({
      score: z.int().min(0).max(100),
      explanation: z.string().min(1),
    }),
  }),
  objectives: z.array(
    z.strictObject({
      objectiveId: z.string().min(1),
      status: z.enum(["ACHIEVED", "PARTIALLY_ACHIEVED", "MISSED"]),
      explanation: z.string().min(1),
      evidenceTurnIds: z.array(z.string().min(1)),
    }),
  ),
  strengths: z.array(
    z.strictObject({
      title: z.string().min(1),
      explanation: z.string().min(1),
      turnIds: z.array(z.string().min(1)),
    }),
  ),
  improvements: z.array(
    z.strictObject({
      title: z.string().min(1),
      explanation: z.string().min(1),
      turnIds: z.array(z.string().min(1)),
    }),
  ),
  moments: z.array(
    z.strictObject({
      turnId: z.string().min(1),
      type: z.enum(["STRENGTH", "IMPROVEMENT", "MISSED_OPPORTUNITY"]),
      explanation: z.string().min(1),
      betterResponse: z.string().nullable().optional().default(null),
    }),
  ),
  summary: z.string().min(1),
  nextFocus: z.strictObject({
    skill: z.enum([
      "CLARITY",
      "ASSERTIVENESS",
      "EMPATHY",
      "STRUCTURE",
      "CONCISENESS",
    ]),
    reason: z.string().min(1),
  }),
});

export type RawAiEvaluation = z.infer<typeof RawAiEvaluationSchema>;

function bullets(values: string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

export function buildEvaluationMessages(
  input: EvaluationPromptInput,
): EvaluationMessage[] {
  const { scenario, difficulty, turns } = input;

  const systemMessage = [
    `Workplace simulation evaluation prompt version: ${EVALUATION_PROMPT_VERSION}`,
    "",
    "ROLE AND RESPONSIBILITY",
    "You are an expert workplace communication coach. Your role is to provide an objective, evidence-based, structured evaluation of the learner's communication performance during a workplace simulation.",
    "Do NOT judge whether the roleplay counterpart agreed; evaluate the learner's communication effectiveness, skills, and objective attainment.",
    "",
    "UNIVERSAL COMMUNICATION RUBRIC (Each scored 0-100 integer)",
    "Guidance bands: 0-39: weak, 40-59: developing, 60-74: competent, 75-89: strong, 90-100: exceptional.",
    "- Clarity: Expressing ideas clearly, specific and unambiguous requests, clear reasoning, logical sentence structure.",
    "- Assertiveness: Advocating for needs and positions confidently, setting professional boundaries, holding ground with composure, avoiding passivity or hostility.",
    "- Empathy: Acknowledging the counterpart's perspective and constraints, active listening, validating concerns, preserving the working relationship.",
    "- Structure: Organized conversation progression, framing topics systematically, leading toward a concrete resolution or next step.",
    "- Conciseness: Economy of words, high signal-to-noise ratio, avoiding rambling, tangents, or over-explaining.",
    "",
    "SCENARIO INFORMATION",
    `Title: ${scenario.title}`,
    `Learner Role: ${scenario.publicContext.userRole}`,
    `Counterpart Role: ${scenario.persona.role}`,
    `Situation: ${scenario.publicContext.description}`,
    `Learner Objective: ${scenario.publicContext.userObjective}`,
    `Difficulty: ${difficulty}`,
    "",
    "SCENARIO OBJECTIVES TO EVALUATE",
    ...scenario.objectives.map((obj) =>
      [
        `Objective ID: ${obj.id}`,
        `Description: ${obj.description}`,
        `Success signals:\n${bullets(obj.successSignals)}`,
        `Failure signals:\n${bullets(obj.failureSignals)}`,
      ].join("\n"),
    ),
    "",
    "COACHING AND EVIDENCE INSTRUCTIONS",
    "1. You MUST evaluate every scenario objective listed above using its exact Objective ID.",
    "2. For each objective, assign status: ACHIEVED, PARTIALLY_ACHIEVED, or MISSED.",
    "3. Evidence citations (evidenceTurnIds, turnIds in strengths/improvements, turnId in moments) MUST ONLY contain valid Turn IDs provided in the transcript below. Never invent or hallucinate turn IDs.",
    "4. For moments with type IMPROVEMENT or MISSED_OPPORTUNITY, provide a practical betterResponse that demonstrates how the learner could have phrased their message more effectively.",
    "5. betterResponse MUST preserve the learner's intent, stay realistic, and NEVER fabricate achievements, credentials, numbers, or personal facts not established in the conversation.",
    "6. Identify the primary nextFocus skill from the 5 universal skills (CLARITY, ASSERTIVENESS, EMPATHY, STRUCTURE, CONCISENESS) with a clear actionable reason.",
    "7. Do NOT include an overall score; overall score is deterministically calculated by the backend.",
    "8. Return ONLY valid JSON adhering strictly to the required schema.",
  ].join("\n");

  const transcriptLines = turns.map((turn) => {
    const assistantContent =
      turn.assistantText !== null
        ? `\nAssistant: ${turn.assistantText}`
        : "\nAssistant: [No response / Failed]";
    return `[Turn ID: ${turn.id}] (Sequence ${turn.sequence})\nLearner: ${turn.userText}${assistantContent}`;
  });

  const userMessage = [
    "FROZEN SIMULATION TRANSCRIPT TO EVALUATE:",
    "",
    ...transcriptLines,
    "",
    "Provide your complete structured evaluation in JSON format.",
  ].join("\n");

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];
}
