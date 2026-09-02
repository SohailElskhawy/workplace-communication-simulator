import {
  ScenarioDefinitionSchema,
  type ScenarioDefinition,
} from "../scenarios/scenario-definition.js";

export const CUSTOM_SCENARIO_PROMPT_VERSION = "custom-scenario-v1" as const;

export interface CustomScenarioPromptInput {
  scenarioKey: string;
  cvText: string;
  jobDescription: string;
}

export interface CustomScenarioMessage {
  role: "system" | "user";
  content: string;
}

export function buildCustomScenarioSystemPrompt(): string {
  return `You are an expert interview simulation designer for an AI Workplace Communication Simulator.
Your objective is to generate a realistic, high-fidelity interview scenario configuration based STRICTLY and ONLY on the provided Candidate CV and Job Description.

CRITICAL GROUNDING AND FIDELITY RULES:
1. STRICT FACTUAL GROUNDING: Rely exclusively on experiences, skills, tools, roles, and achievements explicitly mentioned in the Candidate CV. Do NOT fabricate, extrapolate, or hallucinate candidate projects, metrics, past companies, or credentials.
2. JOB DESCRIPTION ALIGNMENT: Derive the interviewer role, company situation, and questions directly from the responsibilities, qualifications, and domain specified in the Job Description.
3. SCENARIO OBJECTIVES: Define exactly 3 or 4 clear evaluation objectives with uppercase snake_case IDs (e.g. RELEVANT_EXPERIENCE, STRUCTURED_COMMUNICATION, TECHNICAL_DEPTH, ROLE_MOTIVATION). Each objective must specify concrete success and failure signals.
4. ROLEPLAY INTEGRITY: The interviewer persona must remain professional, curious, and focused on verifying how the candidate's actual background meets the role's requirements.
5. OPENING MESSAGE: Provide a natural, professional opening greeting and initial interview question tailored to the candidate and role.
6. DIFFICULTY CALIBRATION:
   - EASY: cooperativeness=5, objectionIntensity=1, followUpPressure=2, weakReasoningTolerance=4, concessionThreshold=2
   - MEDIUM: cooperativeness=3, objectionIntensity=3, followUpPressure=3, weakReasoningTolerance=3, concessionThreshold=3
   - HARD: cooperativeness=2, objectionIntensity=4, followUpPressure=5, weakReasoningTolerance=1, concessionThreshold=5
7. OUTPUT FORMAT: Respond ONLY with a valid JSON object matching the ScenarioDefinition schema.`;
}

export function buildCustomScenarioUserPrompt(
  input: CustomScenarioPromptInput,
): string {
  return `Generate an interview scenario definition for key "${input.scenarioKey}".

[CANDIDATE CV]
${input.cvText}

[JOB DESCRIPTION]
${input.jobDescription}

Required JSON Schema structure:
{
  "key": "${input.scenarioKey}",
  "version": 1,
  "title": "<Concise Job Title / Company Interview, e.g. 'Software Engineer Interview - Acme'>",
  "category": "CUSTOM",
  "summary": "<2-3 sentence overview of this customized interview rehearsal>",
  "publicContext": {
    "description": "<Context description explaining the role and interview setting>",
    "userRole": "<e.g. 'Job Candidate applying for [Role]'>",
    "aiRole": "<e.g. 'Hiring Manager / Interviewer at [Company/Org]'>",
    "userObjective": "<Clear communication and interview objective for the learner>",
    "stakes": "<Professional stakes of the interview>"
  },
  "persona": {
    "role": "<Interviewer title>",
    "traits": ["professional", "evidence-focused", "curious"],
    "communicationStyle": "<Concise, professional interview dialogue style>"
  },
  "aiObjective": "<What the interviewer is evaluating based on the JD and CV>",
  "motivations": ["<Assess specific skills from JD>", "<Evaluate fit with actual CV experience>"],
  "constraints": ["Do not invent candidate facts", "Stay in interviewer character", "Keep responses conversational"],
  "openingMessage": "<Opening interviewer greeting and initial interview question>",
  "difficulties": {
    "EASY": {
      "cooperativeness": 5,
      "objectionIntensity": 1,
      "followUpPressure": 2,
      "weakReasoningTolerance": 4,
      "concessionThreshold": 2,
      "behaviorGuidance": "Give candidate room to answer, offer gentle follow-ups."
    },
    "MEDIUM": {
      "cooperativeness": 3,
      "objectionIntensity": 3,
      "followUpPressure": 3,
      "weakReasoningTolerance": 3,
      "concessionThreshold": 3,
      "behaviorGuidance": "Probe vague answers, ask for concrete examples from CV."
    },
    "HARD": {
      "cooperativeness": 2,
      "objectionIntensity": 4,
      "followUpPressure": 5,
      "weakReasoningTolerance": 1,
      "concessionThreshold": 5,
      "behaviorGuidance": "Challenge unsupported claims, test depth on core requirements."
    }
  },
  "objectives": [
    {
      "id": "RELEVANT_EXPERIENCE",
      "description": "Articulate relevant past experience that aligns with job requirements.",
      "successSignals": ["References concrete past projects from CV", "Directly connects experience to role"],
      "failureSignals": ["Gives generic answers unrelated to CV/JD", "Cannot explain past contributions"]
    },
    {
      "id": "STRUCTURED_RESPONSE",
      "description": "Structure answers clearly using Situation, Task, Action, and Result.",
      "successSignals": ["Clear progression of events", "Highlights personal contribution and outcome"],
      "failureSignals": ["Rambles without clear structure", "Omits key actions or outcomes"]
    },
    {
      "id": "TECHNICAL_ALIGNMENT",
      "description": "Demonstrate understanding of required technical skills and domain context.",
      "successSignals": ["Accurate use of domain terminology", "Explains problem-solving rationale"],
      "failureSignals": ["Avoids technical details", "Misstates core domain concepts"]
    }
  ],
  "skillEmphasis": ["CLARITY", "STRUCTURE", "ASSERTIVENESS"],
  "roleplayRules": [
    "Stay in character as the interviewer throughout the simulation.",
    "Do not coach the candidate or reveal hidden evaluation criteria.",
    "Probe for concrete evidence from the candidate's actual stated background.",
    "Never become hostile, abusive, or impossible, even on Hard difficulty."
  ]
}`;
}

export function buildCustomScenarioMessages(
  input: CustomScenarioPromptInput,
): CustomScenarioMessage[] {
  return [
    { role: "system", content: buildCustomScenarioSystemPrompt() },
    { role: "user", content: buildCustomScenarioUserPrompt(input) },
  ];
}

/**
 * Validates and normalizes raw AI output into a valid ScenarioDefinition.
 */
export function validateCustomScenarioOutput(
  rawJson: unknown,
  expectedKey: string,
): ScenarioDefinition {
  if (typeof rawJson !== "object" || rawJson === null) {
    throw new Error("AI output is not a valid JSON object.");
  }

  const obj = { ...(rawJson as Record<string, unknown>) };
  obj.key = expectedKey;
  obj.version = 1;
  obj.category = "CUSTOM";

  // Ensure difficulties have all required fields if missing
  if (typeof obj.difficulties === "object" && obj.difficulties !== null) {
    const diffs = obj.difficulties as Record<string, Record<string, unknown>>;
    if (diffs.EASY) {
      diffs.EASY.cooperativeness ??= 5;
      diffs.EASY.objectionIntensity ??= 1;
      diffs.EASY.followUpPressure ??= 2;
      diffs.EASY.weakReasoningTolerance ??= 4;
      diffs.EASY.concessionThreshold ??= 2;
    }
    if (diffs.MEDIUM) {
      diffs.MEDIUM.cooperativeness ??= 3;
      diffs.MEDIUM.objectionIntensity ??= 3;
      diffs.MEDIUM.followUpPressure ??= 3;
      diffs.MEDIUM.weakReasoningTolerance ??= 3;
      diffs.MEDIUM.concessionThreshold ??= 3;
    }
    if (diffs.HARD) {
      diffs.HARD.cooperativeness ??= 2;
      diffs.HARD.objectionIntensity ??= 4;
      diffs.HARD.followUpPressure ??= 5;
      diffs.HARD.weakReasoningTolerance ??= 1;
      diffs.HARD.concessionThreshold ??= 5;
    }
  }

  return ScenarioDefinitionSchema.parse(obj);
}
