import type {
  CoachingMomentType,
  ObjectiveStatus,
  UniversalSkill,
} from "@kalemny/contracts";

export interface ScoreBand {
  label: string;
  variant: "exceptional" | "strong" | "competent" | "developing" | "weak";
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  progressClass: string;
}

export function getScoreBand(score: number): ScoreBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  if (clamped >= 90) {
    return {
      label: "Exceptional",
      variant: "exceptional",
      textClass: "text-emerald-700",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      progressClass: "bg-emerald-600",
    };
  }

  if (clamped >= 75) {
    return {
      label: "Strong",
      variant: "strong",
      textClass: "text-indigo-700",
      bgClass: "bg-indigo-50",
      borderClass: "border-indigo-200",
      badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
      progressClass: "bg-indigo-600",
    };
  }

  if (clamped >= 60) {
    return {
      label: "Competent",
      variant: "competent",
      textClass: "text-teal-700",
      bgClass: "bg-teal-50",
      borderClass: "border-teal-200",
      badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
      progressClass: "bg-teal-600",
    };
  }

  if (clamped >= 40) {
    return {
      label: "Developing",
      variant: "developing",
      textClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      progressClass: "bg-amber-500",
    };
  }

  return {
    label: "Needs Focus",
    variant: "weak",
    textClass: "text-rose-700",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    progressClass: "bg-rose-500",
  };
}

export interface SkillMetadata {
  key: string;
  name: string;
  description: string;
}

export const UNIVERSAL_SKILLS_META: Record<string, SkillMetadata> = {
  clarity: {
    key: "clarity",
    name: "Clarity",
    description:
      "Articulating points clearly, directly, and without ambiguity.",
  },
  assertiveness: {
    key: "assertiveness",
    name: "Assertiveness",
    description:
      "Advocating firmly for your interests while maintaining professionalism.",
  },
  empathy: {
    key: "empathy",
    name: "Empathy",
    description:
      "Acknowledging counterpart constraints, perspectives, and tone.",
  },
  structure: {
    key: "structure",
    name: "Structure",
    description:
      "Organizing arguments logically with clear rationale and sequencing.",
  },
  conciseness: {
    key: "conciseness",
    name: "Conciseness",
    description: "Communicating ideas efficiently without unnecessary filler.",
  },
};

export function getSkillMetadata(
  skill: UniversalSkill | string,
): SkillMetadata {
  const normalized = skill.toLowerCase();
  return (
    UNIVERSAL_SKILLS_META[normalized] ?? {
      key: normalized,
      name: skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase(),
      description: "Core workplace communication competency.",
    }
  );
}

export function formatObjectiveStatus(status: ObjectiveStatus): {
  label: string;
  scoreEquivalent: number;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case "ACHIEVED":
      return {
        label: "Achieved",
        scoreEquivalent: 100,
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "PARTIALLY_ACHIEVED":
      return {
        label: "Partially Achieved",
        scoreEquivalent: 50,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "MISSED":
      return {
        label: "Missed",
        scoreEquivalent: 0,
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
      };
  }
}

export function formatCoachingMomentType(type: CoachingMomentType): {
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  bgClass: string;
} {
  switch (type) {
    case "STRENGTH":
      return {
        label: "Key Strength",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        cardBorderClass: "border-emerald-200",
        bgClass: "bg-emerald-50/50",
      };
    case "IMPROVEMENT":
      return {
        label: "Growth Opportunity",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        cardBorderClass: "border-amber-200",
        bgClass: "bg-amber-50/50",
      };
    case "MISSED_OPPORTUNITY":
      return {
        label: "Missed Opportunity",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        cardBorderClass: "border-rose-200",
        bgClass: "bg-rose-50/50",
      };
  }
}
