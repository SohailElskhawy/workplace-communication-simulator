import type { PublicScenarioDetail } from "@kalemny/contracts";

import {
  AssignmentIcon,
  LightbulbIcon,
  SpeakingWithIcon,
  UserIcon,
} from "@/components/icons";

export interface ScenarioBriefingCardProps {
  scenario: PublicScenarioDetail;
}

export function ScenarioBriefingCard({ scenario }: ScenarioBriefingCardProps) {
  const context = scenario.context;

  return (
    <section
      aria-label="Scenario Briefing and Context"
      className="glass-surface rounded-card p-4 sm:p-8 border border-border shadow-[4px_4px_0px_0px_#1a1a1a] space-y-4 sm:space-y-6"
    >
      <div className="border-b border-border/20 pb-2.5 sm:pb-3">
        <span className="font-meta text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-bold block">
          Rehearsal Briefing
        </span>
        <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground mt-0.5">
          Scenario Context & Objectives
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
        {/* Situation */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1 md:col-span-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AssignmentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Situation
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed">
            {context.description ?? scenario.summary}
          </p>
        </div>

        {/* Your Role */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Your Role
            </span>
          </div>
          <p className="font-display text-xs sm:text-sm font-bold text-foreground">
            {context.userRole}
          </p>
        </div>

        {/* Counterpart Role */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SpeakingWithIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Speaking With
            </span>
          </div>
          <p className="font-display text-xs sm:text-sm font-bold text-foreground">
            {context.aiRole}
          </p>
        </div>

        {/* Your Objective */}
        <div className="rounded-control bg-primary/5 p-3 sm:p-4 border border-primary/20 space-y-1 md:col-span-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LightbulbIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-primary">
              Your Primary Objective
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed font-medium">
            {context.userObjective}
          </p>
        </div>

        {/* Stakes */}
        {context.stakes && (
          <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1 md:col-span-2">
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
              Key Stakes
            </span>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {context.stakes}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
