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

  // 1. Strings normalization
  obj.title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Custom Interview Simulation";
  obj.summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : "Personalized interview simulation tailored to your candidate background and target job description.";

  // 2. PublicContext normalization
  const rawContext =
    typeof obj.publicContext === "object" && obj.publicContext !== null
      ? (obj.publicContext as Record<string, unknown>)
      : {};
  obj.publicContext = {
    description:
      typeof rawContext.description === "string" &&
      rawContext.description.trim()
        ? rawContext.description.trim()
        : String(obj.summary),
    userRole:
      typeof rawContext.userRole === "string" && rawContext.userRole.trim()
        ? rawContext.userRole.trim()
        : "Job Candidate",
    aiRole:
      typeof rawContext.aiRole === "string" && rawContext.aiRole.trim()
        ? rawContext.aiRole.trim()
        : "Hiring Manager / Interviewer",
    userObjective:
      typeof rawContext.userObjective === "string" &&
      rawContext.userObjective.trim()
        ? rawContext.userObjective.trim()
        : "Demonstrate relevant skills and structured communication.",
    stakes:
      typeof rawContext.stakes === "string" && rawContext.stakes.trim()
        ? rawContext.stakes.trim()
        : "Advancing in the hiring process for this role.",
  };

  // 3. Persona normalization
  const rawPersona =
    typeof obj.persona === "object" && obj.persona !== null
      ? (obj.persona as Record<string, unknown>)
      : {};
  const rawTraits = Array.isArray(rawPersona.traits)
    ? rawPersona.traits.map(String).filter((t) => t.trim())
    : typeof rawPersona.traits === "string"
      ? rawPersona.traits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : ["professional", "evidence-focused"];
  obj.persona = {
    role:
      typeof rawPersona.role === "string" && rawPersona.role.trim()
        ? rawPersona.role.trim()
        : (obj.publicContext as { aiRole: string }).aiRole,
    traits:
      rawTraits.length > 0 ? rawTraits : ["professional", "evidence-focused"],
    communicationStyle:
      typeof rawPersona.communicationStyle === "string" &&
      rawPersona.communicationStyle.trim()
        ? rawPersona.communicationStyle.trim()
        : "Professional, direct, and conversational dialogue.",
  };

  obj.aiObjective =
    typeof obj.aiObjective === "string" && obj.aiObjective.trim()
      ? obj.aiObjective.trim()
      : "Evaluate candidate readiness against role requirements.";

  const toStringArray = (val: unknown, fallback: string[]): string[] => {
    if (Array.isArray(val)) {
      const filtered = val
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean);
      return filtered.length > 0 ? filtered : fallback;
    }
    if (typeof val === "string" && val.trim()) {
      const split = val
        .split("\n")
        .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(Boolean);
      return split.length > 0 ? split : fallback;
    }
    return fallback;
  };

  obj.motivations = toStringArray(obj.motivations, [
    "Assess candidate background against role requirements.",
    "Evaluate structured problem-solving and communication.",
  ]);
  obj.constraints = toStringArray(obj.constraints, [
    "Do not invent candidate facts.",
    "Stay in interviewer character throughout the simulation.",
    "Keep responses conversational and focused.",
  ]);
  obj.roleplayRules = toStringArray(obj.roleplayRules, [
    "Stay in character as the interviewer.",
    "Probe for concrete evidence from candidate's actual background.",
    "Do not coach the candidate or reveal hidden evaluation rubrics.",
  ]);

  obj.openingMessage =
    typeof obj.openingMessage === "string" && obj.openingMessage.trim()
      ? obj.openingMessage.trim()
      : "Hello, thank you for taking the time to speak with me today. To begin, could you briefly introduce yourself and walk me through your background as it relates to this role?";

  // 4. Difficulties normalization
  const rawDiffs =
    typeof obj.difficulties === "object" && obj.difficulties !== null
      ? (obj.difficulties as Record<string, Record<string, unknown>>)
      : {};

  const clampDifficulty = (
    raw: Record<string, unknown> | undefined,
    defaults: {
      cooperativeness: number;
      objectionIntensity: number;
      followUpPressure: number;
      weakReasoningTolerance: number;
      concessionThreshold: number;
      behaviorGuidance: string;
    },
  ) => {
    const d = raw ?? {};
    const toInt = (val: unknown, fallback: number) => {
      const num = Math.round(Number(val));
      return Number.isFinite(num) ? Math.min(5, Math.max(1, num)) : fallback;
    };
    return {
      cooperativeness: toInt(d.cooperativeness, defaults.cooperativeness),
      objectionIntensity: toInt(
        d.objectionIntensity,
        defaults.objectionIntensity,
      ),
      followUpPressure: toInt(d.followUpPressure, defaults.followUpPressure),
      weakReasoningTolerance: toInt(
        d.weakReasoningTolerance,
        defaults.weakReasoningTolerance,
      ),
      concessionThreshold: toInt(
        d.concessionThreshold,
        defaults.concessionThreshold,
      ),
      behaviorGuidance:
        typeof d.behaviorGuidance === "string" && d.behaviorGuidance.trim()
          ? d.behaviorGuidance.trim()
          : defaults.behaviorGuidance,
    };
  };

  obj.difficulties = {
    EASY: clampDifficulty(rawDiffs.EASY, {
      cooperativeness: 5,
      objectionIntensity: 1,
      followUpPressure: 2,
      weakReasoningTolerance: 4,
      concessionThreshold: 2,
      behaviorGuidance:
        "Supportive interviewer; gives candidate room to articulate experience.",
    }),
    MEDIUM: clampDifficulty(rawDiffs.MEDIUM, {
      cooperativeness: 3,
      objectionIntensity: 3,
      followUpPressure: 3,
      weakReasoningTolerance: 3,
      concessionThreshold: 3,
      behaviorGuidance:
        "Realistic professional interviewer; probes vague claims and asks for details.",
    }),
    HARD: clampDifficulty(rawDiffs.HARD, {
      cooperativeness: 2,
      objectionIntensity: 4,
      followUpPressure: 5,
      weakReasoningTolerance: 1,
      concessionThreshold: 5,
      behaviorGuidance:
        "Demanding, skeptical interviewer; rigorously challenges depth and trade-offs.",
    }),
  };

  // 5. Objectives normalization
  const rawObjectives = Array.isArray(obj.objectives) ? obj.objectives : [];
  if (rawObjectives.length === 0) {
    obj.objectives = [
      {
        id: "RELEVANT_EXPERIENCE",
        description:
          "Articulate relevant past experience that directly addresses role requirements.",
        successSignals: [
          "Connects concrete past projects to role requirements.",
          "Demonstrates technical depth and impact.",
        ],
        failureSignals: [
          "Gives generic responses unrelated to background.",
          "Fails to explain past contributions clearly.",
        ],
      },
      {
        id: "STRUCTURED_COMMUNICATION",
        description:
          "Communicate complex ideas clearly using structured problem-solving.",
        successSignals: [
          "Organizes response with clear context, action, and results.",
          "Maintains focus without rambling.",
        ],
        failureSignals: [
          "Disorganized, hard-to-follow explanations.",
          "Omits key steps or outcomes.",
        ],
      },
    ];
  } else {
    obj.objectives = rawObjectives.map((rawObj, idx) => {
      const o =
        typeof rawObj === "object" && rawObj !== null
          ? (rawObj as Record<string, unknown>)
          : {};
      const rawId = typeof o.id === "string" ? o.id : `OBJECTIVE_${idx + 1}`;
      let id = rawId
        .toUpperCase()
        .replace(/^[0-9_.\-\s]+/, "")
        .replace(/[^A-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (!/^[A-Z]/.test(id)) {
        id = `OBJ_${id || idx + 1}`;
      }

      return {
        id,
        description:
          typeof o.description === "string" && o.description.trim()
            ? o.description.trim()
            : "Demonstrate relevant role competencies.",
        successSignals: toStringArray(o.successSignals, [
          "Provides clear, grounded examples from candidate experience.",
        ]),
        failureSignals: toStringArray(o.failureSignals, [
          "Vague or unstructured response lacking concrete details.",
        ]),
      };
    });
  }

  // 6. SkillEmphasis normalization
  const validSkills = new Set([
    "CLARITY",
    "ASSERTIVENESS",
    "EMPATHY",
    "STRUCTURE",
    "CONCISENESS",
  ]);
  const rawSkills = Array.isArray(obj.skillEmphasis) ? obj.skillEmphasis : [];
  const normalizedSkills = rawSkills
    .map((s) => String(s).toUpperCase().trim())
    .filter((s) => validSkills.has(s));
  obj.skillEmphasis =
    normalizedSkills.length > 0
      ? normalizedSkills
      : ["CLARITY", "STRUCTURE", "ASSERTIVENESS"];

  return ScenarioDefinitionSchema.parse(obj);
}
