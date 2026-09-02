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
    <section aria-label="Select simulation difficulty" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
          Select Difficulty
        </h2>
        <span className="font-meta text-xs text-muted-foreground">
          Calibrates counterpart skepticism and objection thresholds
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableDifficulties.map((diffKey) => {
          const opt = DIFFICULTY_OPTIONS[diffKey];
          const isSelected = selectedDifficulty === diffKey;

          return (
            <button
              key={diffKey}
              type="button"
              onClick={() => onSelectDifficulty(diffKey)}
              className={cn(
                "glass-surface rounded-card p-5 text-left border transition-all duration-200 ease-out relative flex flex-col justify-between cursor-pointer select-none",
                isSelected
                  ? "border-2 border-primary bg-primary/5 shadow-[4px_4px_0px_0px_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                  : "border-border shadow-xs hover:border-border/80 hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "font-display text-lg font-bold uppercase tracking-tight",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {opt.title}
                  </span>
                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border border-primary">
                      <CheckIcon className="w-3 h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-border/30 bg-surface-subtle" />
                  )}
                </div>

                <div className="font-meta text-[11px] uppercase font-bold text-muted-foreground mb-2">
                  {opt.counterpart}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </div>

              {diffKey === "MEDIUM" && (
                <div className="mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[10px] uppercase font-bold text-primary">
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
