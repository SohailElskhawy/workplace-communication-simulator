import { z } from "zod";

const DifficultyBehaviorSchema = z.object({
  cooperativeness: z.int().min(1).max(5),
  objectionIntensity: z.int().min(1).max(5),
  followUpPressure: z.int().min(1).max(5),
  weakReasoningTolerance: z.int().min(1).max(5),
  concessionThreshold: z.int().min(1).max(5),
  behaviorGuidance: z.string().min(1),
});

const ScenarioObjectiveSchema = z.object({
  id: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  description: z.string().min(1),
  successSignals: z.array(z.string().min(1)).min(1),
  failureSignals: z.array(z.string().min(1)).min(1),
});

const InterviewQuestionCategorySchema = z.enum([
  "INTRODUCTION",
  "EXPERIENCE",
  "TEAMWORK_CONFLICT",
  "OWNERSHIP",
  "PROBLEM_SOLVING",
  "FAILURE_LEARNING",
  "ADAPTABILITY",
  "REFLECTION",
]);

const InterviewTrackQuestionSchema = z.object({
  category: InterviewQuestionCategorySchema,
  question: z.string().min(1),
});

const InterviewTrackSchema = z
  .object({
    questions: z.array(InterviewTrackQuestionSchema).min(3).max(5),
  })
  .refine(
    (track) =>
      new Set(track.questions.map((question) => question.category)).size ===
      track.questions.length,
    { message: "Interview track question categories must be distinct." },
  );

export const ScenarioVariationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.string().min(1),
    openingMessage: z.string().min(1),
    situation: z.string().min(1).optional(),
    counterpartBrief: z.string().min(1).optional(),
    interviewTrack: InterviewTrackSchema.optional(),
  })
  .refine(
    (variation) =>
      !variation.interviewTrack ||
      variation.interviewTrack.questions[0]?.question ===
        variation.openingMessage,
    {
      message:
        "The first interview track question must match the variation opening message.",
    },
  );

export const ScenarioDefinitionSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: z.int().min(1),
    title: z.string().min(1),
    category: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    summary: z.string().min(1),
    publicContext: z.object({
      description: z.string().min(1),
      userRole: z.string().min(1),
      aiRole: z.string().min(1),
      userObjective: z.string().min(1),
      stakes: z.string().min(1),
    }),
    persona: z.object({
      role: z.string().min(1),
      traits: z.array(z.string().min(1)).min(1),
      communicationStyle: z.string().min(1),
    }),
    aiObjective: z.string().min(1),
    motivations: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)).min(1),
    openingMessage: z.string().min(1),
    difficulties: z.object({
      EASY: DifficultyBehaviorSchema,
      MEDIUM: DifficultyBehaviorSchema,
      HARD: DifficultyBehaviorSchema,
    }),
    objectives: z.array(ScenarioObjectiveSchema).min(1),
    skillEmphasis: z
      .array(
        z.enum([
          "CLARITY",
          "ASSERTIVENESS",
          "EMPATHY",
          "STRUCTURE",
          "CONCISENESS",
        ]),
      )
      .min(1),
    roleplayRules: z.array(z.string().min(1)).min(1),
    variations: z.array(ScenarioVariationSchema).min(1).optional(),
  })
  .refine(
    (definition) => {
      const ids = definition.variations?.map((variation) => variation.id) ?? [];
      return new Set(ids).size === ids.length;
    },
    { message: "Variation ids must be unique within a scenario." },
  );

export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
export type ScenarioVariation = z.infer<typeof ScenarioVariationSchema>;
export type InterviewTrack = z.infer<typeof InterviewTrackSchema>;
export type InterviewQuestionCategory = z.infer<
  typeof InterviewQuestionCategorySchema
>;
