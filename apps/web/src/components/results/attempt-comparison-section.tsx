import type { AttemptComparison, ObjectiveDelta } from "@kalemny/contracts";

import { cn } from "@/lib/cn";
import {
  formatDelta,
  formatObjectiveDeltaStatus,
  formatObjectiveStatus,
  getSkillMetadata,
  UNIVERSAL_SKILLS_META,
} from "@/lib/score-utils";
import { SKILL_SCORE_KEYS } from "@/lib/constants";

export interface AttemptComparisonSectionProps {
  comparison: AttemptComparison;
}

export function AttemptComparisonSection({
  comparison,
}: AttemptComparisonSectionProps) {
  return (
    <section className="glass-surface rounded-card border border-border p-4 sm:p-8 shadow-[4px_4px_0px_0px_#1a1a1a] sm:shadow-[6px_6px_0px_0px_#1a1a1a] space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-border/15 pb-3 sm:pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground">
              Attempt Comparison
            </h2>
            {comparison.comparable ? (
              <span className="inline-flex items-center rounded-full bg-[#d4ff00]/20 border border-border px-2.5 sm:px-3 py-0.5 font-meta text-[10px] sm:text-xs font-bold text-[#171e00] uppercase tracking-wider">
                Same Difficulty ({comparison.currentDifficulty})
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2.5 sm:px-3 py-0.5 font-meta text-[10px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
                Cross-Difficulty ({comparison.previousDifficulty} →{" "}
                {comparison.currentDifficulty})
              </span>
            )}
          </div>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-1">
            {comparison.comparable
              ? "Direct like-for-like comparison against your previous attempt at this difficulty level."
              : "Exploratory comparison across different difficulty settings."}
          </p>
        </div>
      </div>

      {/* Non-Equivalent Alert when difficulties differ */}
      {!comparison.comparable && (
        <div className="rounded-control border-2 border-amber-300 bg-amber-50 p-3.5 sm:p-5 text-amber-950 space-y-1.5 shadow-2xs">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="text-lg sm:text-xl">⚠️</span>
            <div className="space-y-1">
              <h3 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-950">
                Non-Equivalent Difficulty Comparison
              </h3>
              <p className="font-sans text-xs sm:text-sm leading-relaxed">
                {comparison.nonEquivalentReason ??
                  "Previous attempt and current attempt were completed at different difficulty levels."}
              </p>
              <p className="font-sans text-[11px] sm:text-xs text-amber-900/80 leading-relaxed pt-1">
                Score changes across different difficulty settings do not
                represent strict like-for-like improvement because counterpart
                objections, resistance, and concession thresholds change.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Cards Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Overall Score Delta Card */}
        <div className="rounded-card border border-border bg-surface-subtle p-3.5 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
              Overall Score Change
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2 font-display">
                <span className="text-2xl font-bold text-muted-foreground">
                  {comparison.previousOverallScore}
                </span>
                <span className="text-base font-semibold text-muted-foreground">
                  →
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {comparison.currentOverallScore}
                </span>
              </div>

              {comparison.comparable &&
                (() => {
                  const deltaInfo = formatDelta(comparison.overallDelta);
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border shadow-2xs",
                        deltaInfo.badgeClass,
                      )}
                    >
                      <span>{deltaInfo.arrow}</span>
                      <span>{deltaInfo.text} pts</span>
                    </span>
                  );
                })()}
            </div>
          </div>

          <p className="mt-3 font-sans text-xs text-muted-foreground border-t border-border/10 pt-2.5">
            {comparison.comparable
              ? comparison.overallDelta > 0
                ? "Your overall performance improved in this attempt."
                : comparison.overallDelta < 0
                  ? "Overall score declined compared to previous attempt."
                  : "Overall score remained unchanged."
              : "Exploratory comparison across different difficulty settings."}
          </p>
        </div>

        {/* Targeted Weak Area Progress Card (if present) */}
        {comparison.weakArea && (
          <div className="rounded-card border border-border bg-surface-subtle p-5 shadow-xs flex flex-col justify-between sm:col-span-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  Previous Coaching Target Progress
                </span>
                {comparison.comparable && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 font-meta text-xs font-bold border",
                      comparison.weakArea.improved
                        ? "bg-[#d4ff00]/20 text-[#171e00] border-border"
                        : "bg-[#ffb3b0]/30 text-[#971e26] border-border",
                    )}
                  >
                    {comparison.weakArea.improved
                      ? "✓ Goal Improved"
                      : "Needs Continued Focus"}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h4 className="font-display text-sm font-bold text-foreground">
                    {getSkillMetadata(comparison.weakArea.skill).name}
                  </h4>
                  <p className="font-sans text-xs text-muted-foreground">
                    Identified as primary growth area in previous attempt.
                  </p>
                </div>

                <div className="flex items-baseline gap-2 font-display">
                  <span className="text-lg font-bold text-muted-foreground">
                    {comparison.weakArea.previousScore}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xl font-bold text-foreground">
                    {comparison.weakArea.currentScore}
                  </span>
                  {comparison.comparable &&
                    (() => {
                      const deltaInfo = formatDelta(comparison.weakArea.delta);
                      return (
                        <span
                          className={cn(
                            "ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-meta text-xs font-bold border",
                            deltaInfo.badgeClass,
                          )}
                        >
                          {deltaInfo.text}
                        </span>
                      );
                    })()}
                </div>
              </div>
            </div>

            <p className="mt-3 font-sans text-xs text-muted-foreground border-t border-border/10 pt-2.5">
              {comparison.comparable
                ? comparison.weakArea.improved
                  ? `Successfully raised ${getSkillMetadata(comparison.weakArea.skill).name.toLowerCase()} score by ${comparison.weakArea.delta} points.`
                  : `${getSkillMetadata(comparison.weakArea.skill).name} remains a priority focus area.`
                : `Previous attempt score was ${comparison.weakArea.previousScore} at ${comparison.previousDifficulty} difficulty.`}
            </p>
          </div>
        )}
      </div>

      {/* 5 Universal Skills Delta Breakdown */}
      <div className="overflow-hidden rounded-control border border-border bg-white shadow-xs">
        <div className="border-b border-border/20 bg-surface-subtle px-5 py-3 font-meta text-xs font-bold text-foreground uppercase tracking-wider">
          Universal Skills Comparison
        </div>
        <div className="divide-y divide-border/10">
          {SKILL_SCORE_KEYS.map((skillKey) => {
            const prevScore = comparison.previousSkills[skillKey];
            const currScore = comparison.currentSkills[skillKey];
            const delta = comparison.skillDeltas[skillKey];
            const deltaInfo = formatDelta(delta);
            const meta =
              UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);

            return (
              <div
                key={skillKey}
                className="flex items-center justify-between px-5 py-3 text-xs"
              >
                <div>
                  <div className="font-display font-bold text-foreground">
                    {meta.name}
                  </div>
                  <div className="font-sans text-[11px] text-muted-foreground">
                    {meta.description}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-1.5 font-meta text-xs">
                    <span className="font-medium text-muted-foreground">
                      {prevScore}
                    </span>
                    <span className="text-border/40">→</span>
                    <span className="font-bold text-foreground">
                      {currScore}
                    </span>
                  </div>
                  {comparison.comparable ? (
                    <span
                      className={cn(
                        "inline-flex min-w-12 items-center justify-center rounded-full px-2 py-0.5 font-meta text-xs font-bold border shadow-2xs",
                        deltaInfo.badgeClass,
                      )}
                    >
                      {deltaInfo.text}
                    </span>
                  ) : (
                    <span className="font-meta text-[11px] text-muted-foreground">
                      Non-equivalent
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenario Objectives Comparison (if present) */}
      {comparison.objectives.length > 0 && (
        <div className="overflow-hidden rounded-control border border-border bg-white shadow-xs">
          <div className="border-b border-border/20 bg-surface-subtle px-5 py-3 font-meta text-xs font-bold text-foreground uppercase tracking-wider">
            Scenario Objectives Outcome Comparison
          </div>
          <div className="divide-y divide-border/10">
            {comparison.objectives.map((obj: ObjectiveDelta) => {
              const prevStatusInfo = formatObjectiveStatus(obj.previousStatus);
              const currStatusInfo = formatObjectiveStatus(obj.currentStatus);
              const deltaStatusInfo = formatObjectiveDeltaStatus(
                obj.statusChanged,
              );

              return (
                <div
                  key={obj.objectiveId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 text-xs"
                >
                  <div className="font-display font-bold text-foreground">
                    {obj.objectiveId.replace(/_/g, " ")}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-meta text-[11px]">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 font-semibold border",
                          prevStatusInfo.badgeClass,
                        )}
                      >
                        {prevStatusInfo.label}
                      </span>
                      <span className="text-border/40">→</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 font-semibold border",
                          currStatusInfo.badgeClass,
                        )}
                      >
                        {currStatusInfo.label}
                      </span>
                    </div>

                    {comparison.comparable && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 font-meta text-[11px] font-bold border",
                          deltaStatusInfo.badgeClass,
                        )}
                      >
                        {deltaStatusInfo.icon} {deltaStatusInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
