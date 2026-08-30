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
  const achievedCount = objectives.filter((o) => o.status === "ACHIEVED").length;

  return (
    <section className="space-y-4">
      <div className="border-b border-border/20 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
            Scenario Objectives
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
            Assessment of specific scenario requirements and negotiation
            milestones.
          </p>
        </div>
        <span className="font-meta text-xs font-semibold text-muted-foreground">
          {achievedCount} / {objectives.length} Achieved
        </span>
      </div>

      <div className="space-y-3">
        {objectives.map((obj: ObjectiveResult) => {
          const statusInfo = formatObjectiveStatus(obj.status);
          const isAchieved = obj.status === "ACHIEVED";
          const isPartial = obj.status === "PARTIALLY_ACHIEVED";

          return (
            <div
              key={obj.objectiveId}
              className={cn(
                "glass-surface rounded-card p-4 sm:p-5 shadow-xs border transition-all",
                isAchieved && "border-l-4 border-l-[#d4ff00]",
                isPartial && "border-l-4 border-l-amber-400",
                !isAchieved && !isPartial && "border-l-4 border-l-[#ffb3b0]",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  {obj.objectiveId.replace(/_/g, " ")}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border",
                      statusInfo.badgeClass,
                    )}
                  >
                    {isAchieved && <CheckIcon className="w-3 h-3 stroke-3" />}
                    {isPartial && <span className="text-xs">−</span>}
                    {!isAchieved && !isPartial && (
                      <CloseIcon className="w-3 h-3" />
                    )}
                    <span>{statusInfo.label}</span>
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
