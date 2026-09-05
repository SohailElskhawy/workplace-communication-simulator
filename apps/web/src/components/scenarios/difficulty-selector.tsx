import type { Difficulty } from "@kalemny/contracts";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface DifficultyOption {
  key: Difficulty;
  title: string;
  counterpart: string;
  description: string;
}

export const DIFFICULTY_OPTIONS: Record<Difficulty, DifficultyOption> = {
  EASY: {
    key: "EASY",
    title: "Easy",
    counterpart: "Supportive Counterpart",
    description: "Concedes easily to reasonable points with minimal pushback.",
  },
  MEDIUM: {
    key: "MEDIUM",
    title: "Medium",
    counterpart: "Realistic Pushback",
    description:
      "Standard workplace objections and challenges unsupported claims.",
  },
  HARD: {
    key: "HARD",
    title: "Hard",
    counterpart: "Challenging Negotiation",
    description: "Skeptical counterpart who challenges vague reasoning firmly.",
  },
};

export interface DifficultySelectorProps {
  availableDifficulties: Difficulty[];
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

export function DifficultySelector({
  availableDifficulties,
  selectedDifficulty,
  onSelectDifficulty,
}: DifficultySelectorProps) {
  return (
    <section
      aria-label="Select simulation difficulty"
      className="space-y-3 sm:space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Choose difficulty
        </h2>
        <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
          Calibrates counterpart skepticism and objection thresholds
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {availableDifficulties.map((diffKey) => {
          const opt = DIFFICULTY_OPTIONS[diffKey];
          const isSelected = selectedDifficulty === diffKey;

          return (
            <button
              key={diffKey}
              type="button"
              onClick={() => onSelectDifficulty(diffKey)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex min-h-44 flex-col justify-between rounded-card border bg-surface-solid p-4 text-start shadow-xs transition sm:p-5",
                isSelected
                  ? "border-primary bg-primary-muted"
                  : "border-border-subtle hover:border-border",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span
                    className={cn(
                      "font-display text-lg font-semibold",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {opt.title}
                  </span>
                  {isSelected ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border border-border bg-surface-solid" />
                  )}
                </div>

                <div className="font-meta text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground mb-1.5 sm:mb-2">
                  {opt.counterpart}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </div>

              {diffKey === "MEDIUM" && (
                <div className="mt-3 sm:mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[9px] sm:text-[10px] uppercase font-bold text-primary">
                    Recommended
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
