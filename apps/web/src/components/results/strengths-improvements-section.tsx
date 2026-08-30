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
    <section className="grid gap-6 md:grid-cols-2">
      {/* Key Strengths */}
      <div className="glass-surface rounded-card border border-[#d4ff00]/40 bg-[#d4ff00]/5 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#d4ff00] text-[#171e00] border border-border flex items-center justify-center font-bold text-xs">
            ✓
          </span>
          <h3 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
            Key Strengths
          </h3>
        </div>

        <div className="space-y-3">
          {strengths.length === 0 ? (
            <p className="font-sans text-xs text-muted-foreground">
              No major strengths recorded.
            </p>
          ) : (
            strengths.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/80 rounded-control border border-border/30 p-4 shadow-2xs space-y-1.5"
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
      <div className="glass-surface rounded-card border border-[#ffb3b0]/40 bg-[#ffb3b0]/5 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ffb3b0] text-[#971e26] border border-border flex items-center justify-center font-bold text-xs">
            ↑
          </span>
          <h3 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
            Areas for Improvement
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
                className="bg-white/80 rounded-control border border-border/30 p-4 shadow-2xs space-y-1.5"
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
