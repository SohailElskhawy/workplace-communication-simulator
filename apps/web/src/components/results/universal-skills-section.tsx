import type { SkillScores } from "@kalemny/contracts";

import { cn } from "@/lib/cn";
import { getScoreBand, getSkillMetadata, UNIVERSAL_SKILLS_META } from "@/lib/score-utils";
import { SKILL_SCORE_KEYS } from "@/lib/constants";

export interface UniversalSkillsSectionProps {
  skills: SkillScores;
  nextFocusSkillKey?: string | undefined;
}

export function UniversalSkillsSection({
  skills,
  nextFocusSkillKey,
}: UniversalSkillsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border/20 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
            Universal Skills Breakdown
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
            Detailed 0–100 benchmark scores across our core professional
            communication competencies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {SKILL_SCORE_KEYS.map((skillKey) => {
          const score = skills[skillKey];
          const band = getScoreBand(score);
          const meta =
            UNIVERSAL_SKILLS_META[skillKey] ?? getSkillMetadata(skillKey);
          const isFocus =
            nextFocusSkillKey &&
            nextFocusSkillKey.toLowerCase() === skillKey.toLowerCase();

          return (
            <div
              key={skillKey}
              className={cn(
                "glass-surface rounded-card p-5 flex flex-col justify-between transition-all relative overflow-hidden",
                isFocus
                  ? "border-2 border-primary bg-primary/5 shadow-[4px_4px_0px_0px_#1a1a1a]"
                  : "border border-border shadow-xs hover:border-border/80",
              )}
            >
              {isFocus && (
                <div className="absolute top-2 right-2 bg-[#d4ff00] text-[#171e00] font-meta text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider border border-border shadow-2xs">
                  Target
                </div>
              )}

              <div>
                <span className="font-meta text-xs font-bold text-foreground uppercase tracking-wider block mb-1">
                  {meta.name}
                </span>

                <div
                  className={cn(
                    "font-display text-3xl sm:text-4xl font-bold my-1.5",
                    isFocus ? "text-primary" : "text-foreground",
                  )}
                >
                  {score}
                </div>

                <span
                  className={cn(
                    "inline-block font-meta text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2",
                    band.badgeClass,
                  )}
                >
                  {band.label}
                </span>

                <p className="font-sans text-[11px] text-muted-foreground leading-snug">
                  {meta.description}
                </p>
              </div>

              <div className="w-full bg-surface-container-high h-2 mt-4 border border-border/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isFocus ? "bg-primary" : band.progressClass,
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, score))}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
