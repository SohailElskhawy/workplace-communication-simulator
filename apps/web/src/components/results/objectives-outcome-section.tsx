import type { ConversationTurn, ObjectiveResult } from "@kalemny/contracts";

import { CheckIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatObjectiveStatus } from "@/lib/score-utils";

export interface ObjectivesOutcomeSectionProps {
  objectives: ObjectiveResult[];
  turnMap: Map<string, ConversationTurn>;
}

export function ObjectivesOutcomeSection({
  objectives,
  turnMap,
}: ObjectivesOutcomeSectionProps) {
  const achievedCount = objectives.filter(
    (o) => o.status === "ACHIEVED",
  ).length;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="border-b border-border/20 pb-2.5 sm:pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground">
            Scenario Objectives
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
            Scenario-specific milestones and goal evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-meta text-[11px] sm:text-xs font-semibold text-muted-foreground">
            {achievedCount} / {objectives.length} Achieved
          </span>
        </div>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {objectives.map((obj, idx) => {
          const status = formatObjectiveStatus(obj.status);

          return (
            <div
              key={idx}
              className="glass-surface rounded-card p-3.5 sm:p-4 border border-border shadow-xs space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                  {obj.objectiveId.replace(/_/g, " ")}
                </h3>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span
                    className={cn(
                      "font-meta text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border",
                      status.badgeClass,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {obj.explanation}
              </p>

              {/* Evidence Turn References */}
              {obj.evidenceTurnIds.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/10 flex flex-wrap items-center gap-1.5">
                  <span className="font-meta text-[11px] font-semibold text-muted-foreground">
                    Evidence:
                  </span>
                  {obj.evidenceTurnIds.map((turnId) => {
                    const turn = turnMap.get(turnId);
                    return (
                      <span
                        key={turnId}
                        className="inline-flex items-center rounded-sm bg-surface-subtle px-2 py-0.5 font-meta text-[11px] font-medium text-foreground border border-border/30"
                        title={
                          turn
                            ? `You: "${turn.userText.slice(0, 70)}..."`
                            : undefined
                        }
                      >
                        Turn #{turn ? turn.sequence : "?"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
