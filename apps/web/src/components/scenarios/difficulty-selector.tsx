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
    <section aria-label="Select simulation difficulty" className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
          Select Difficulty
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
              className={cn(
                "glass-surface rounded-card p-3.5 sm:p-5 text-left border transition-all duration-200 ease-out relative flex flex-col justify-between cursor-pointer select-none",
                isSelected
                  ? "border-2 border-primary bg-primary/5 shadow-[3px_3px_0px_0px_#1a1a1a] sm:shadow-[4px_4px_0px_0px_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                  : "border-border shadow-xs hover:border-border/80 hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span
                    className={cn(
                      "font-display text-base sm:text-lg font-bold uppercase tracking-tight",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {opt.title}
                  </span>
                  {isSelected ? (
                    <span className="flex h-4.5 w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border border-primary shrink-0">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full border border-border/30 bg-surface-subtle shrink-0" />
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
                    Recommended Default
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
