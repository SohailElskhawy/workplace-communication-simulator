import type {
  ConversationTurn,
  ImprovementFeedback,
  StrengthFeedback,
} from "@kalemny/contracts";

export interface StrengthsImprovementsSectionProps {
  strengths: StrengthFeedback[];
  improvements: ImprovementFeedback[];
  turnMap: Map<string, ConversationTurn>;
}

export function StrengthsImprovementsSection({
  strengths,
  improvements,
  turnMap,
}: StrengthsImprovementsSectionProps) {
  return (
    <section className="grid gap-3.5 sm:gap-6 grid-cols-1 md:grid-cols-2">
      {/* Key Strengths */}
      <div className="space-y-4 rounded-card border border-success/20 bg-success/5 p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-xs font-bold text-success-foreground">
            ✓
          </span>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Strengths
          </h3>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {strengths.length === 0 ? (
            <p className="font-sans text-xs text-muted-foreground">
              No major strengths recorded.
            </p>
          ) : (
            strengths.map((item, idx) => (
              <div
                key={idx}
                className="space-y-1 rounded-control border border-border-subtle bg-surface-solid p-4"
              >
                <h4 className="font-display text-xs sm:text-sm font-bold text-foreground">
                  {item.title}
                </h4>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {item.explanation}
                </p>
                {item.turnIds.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {item.turnIds.map((turnId) => {
                      const turn = turnMap.get(turnId);
                      return (
                        <span
                          key={turnId}
                          className="inline-flex items-center rounded-sm bg-surface-subtle px-1.5 py-0.5 font-meta text-[10px] font-semibold text-foreground border border-border/20"
                        >
                          Turn #{turn ? turn.sequence : "?"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Areas for Improvement */}
      <div className="space-y-4 rounded-card border border-alert/20 bg-alert/5 p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-alert text-xs font-bold text-alert-foreground">
            ↑
          </span>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Improvements
          </h3>
        </div>

        <div className="space-y-3">
          {improvements.length === 0 ? (
            <p className="font-sans text-xs text-muted-foreground">
              No major improvement areas recorded.
            </p>
          ) : (
            improvements.map((item, idx) => (
              <div
                key={idx}
                className="space-y-1.5 rounded-control border border-border-subtle bg-surface-solid p-4"
              >
                <h4 className="font-display text-xs sm:text-sm font-bold text-foreground">
                  {item.title}
                </h4>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {item.explanation}
                </p>
                {item.turnIds.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {item.turnIds.map((turnId) => {
                      const turn = turnMap.get(turnId);
                      return (
                        <span
                          key={turnId}
                          className="inline-flex items-center rounded-sm bg-surface-subtle px-1.5 py-0.5 font-meta text-[10px] font-semibold text-foreground border border-border/20"
                        >
                          Turn #{turn ? turn.sequence : "?"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
