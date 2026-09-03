import type { CoachingMoment, ConversationTurn } from "@kalemny/contracts";

import { LightbulbIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatCoachingMomentType } from "@/lib/score-utils";

export interface CoachingMomentsSectionProps {
  moments: CoachingMoment[];
  turnMap: Map<string, ConversationTurn>;
  onOpenTranscriptAtTurn?: (turnId: string) => void;
}

export function CoachingMomentsSection({
  moments,
  turnMap,
  onOpenTranscriptAtTurn,
}: CoachingMomentsSectionProps) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="border-b border-border/20 pb-2.5 sm:pb-3 flex items-center gap-2.5">
        <LightbulbIcon className="w-6 h-6 text-primary shrink-0" />
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground">
            Moments That Mattered
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
            Concrete coaching feedback linked directly to your stored messages,
            with actionable alternative phrasing.
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-5">
        {moments.length === 0 ? (
          <div className="glass-surface rounded-card border border-border p-8 text-center font-sans text-xs text-muted-foreground">
            No specific key moments flagged for this simulation attempt.
          </div>
        ) : (
          moments.map((moment: CoachingMoment, idx: number) => {
            const turn = turnMap.get(moment.turnId);
            const momentInfo = formatCoachingMomentType(moment.type);
            const isStrength = moment.type === "STRENGTH";
            const isMissed = moment.type === "MISSED_OPPORTUNITY";

            return (
              <div
                key={idx}
                className={cn(
                  "glass-surface rounded-card p-3.5 sm:p-6 shadow-[3px_3px_0px_0px_#1a1a1a] sm:shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col gap-3 sm:gap-4 border transition-all",
                  isStrength && "border-l-4 border-l-[#d4ff00]",
                  isMissed && "border-l-4 border-l-[#ffb3b0]",
                  !isStrength && !isMissed && "border-l-4 border-l-primary",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/15 pb-2.5 sm:pb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-meta text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-sm bg-surface-raised border border-border text-foreground">
                      Turn #{turn ? turn.sequence : "?"}
                    </span>
                    <span
                      className={cn(
                        "font-meta text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full border",
                        momentInfo.badgeClass,
                      )}
                    >
                      {momentInfo.label}
                    </span>
                  </div>
                </div>

                {/* 1. What the learner said */}
                <div className="space-y-1 sm:space-y-1.5">
                  <span className="font-meta text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    YOU SAID:
                  </span>
                  <div className="bg-surface-subtle border border-border/30 p-2.5 sm:p-3.5 rounded-control relative">
                    <p className="font-sans text-xs sm:text-sm text-foreground italic leading-relaxed whitespace-pre-wrap">
                      {turn
                        ? `"${turn.userText}"`
                        : "(Transcript excerpt preserved)"}
                    </p>
                  </div>
                </div>

                {/* 2. Stronger Response Suggestion */}
                {moment.betterResponse && (
                  <div className="space-y-1 sm:space-y-1.5">
                    <span className="font-meta text-[10px] sm:text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                      <span>TRY THIS INSTEAD (COACHING SUGGESTION):</span>
                    </span>
                    <div className="bg-primary/5 border border-primary/40 p-2.5 sm:p-3.5 rounded-control relative">
                      <p className="font-sans text-xs sm:text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                        &quot;{moment.betterResponse}&quot;
                      </p>
                      <p className="font-sans text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2 border-t border-primary/20 pt-1.5">
                        A coaching recommendation to communicate your intention
                        with greater structure and assertiveness.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Coach's Analysis Note */}
                <div className="pt-2 border-t border-border/15">
                  <p className="font-sans text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    <strong className="font-display uppercase tracking-wide text-foreground mr-1.5">
                      Coach Note:
                    </strong>
                    {moment.explanation}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
