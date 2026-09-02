"use client";

import type { PublicScenarioDetail } from "@kalemny/contracts";

import { AccessibleDialog } from "@/components/accessible-dialog";

export interface BriefingSidebarProps {
  scenarioDetail: PublicScenarioDetail | null;
  scenarioTitle: string;
  counterpartRole: string;
  userObjective: string;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export function BriefingSidebar({
  scenarioDetail,
  scenarioTitle,
  counterpartRole,
  userObjective,
  isOpenMobile,
  onToggleMobile,
}: BriefingSidebarProps) {
  const contextDesc =
    scenarioDetail?.context?.description ?? scenarioDetail?.summary;
  const stakes = scenarioDetail?.context?.stakes;

  const briefingContent = (
    <div className="space-y-3 sm:space-y-4 font-sans text-xs">
      {/* 1. Counterpart Info */}
      <div className="rounded-control bg-surface-subtle p-3 sm:p-3.5 border border-border/30 space-y-1">
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
          Counterpart
        </span>
        <p className="font-display font-bold text-sm text-foreground">
          {counterpartRole}
        </p>
      </div>

      {/* 2. Your Role & Objective */}
      <div className="rounded-control bg-primary/5 p-3 sm:p-3.5 border border-primary/20 space-y-1">
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary block">
          Your Objective
        </span>
        <p className="text-foreground leading-relaxed font-medium">
          {userObjective}
        </p>
      </div>

      {/* 3. Situation Context / Background */}
      {contextDesc && (
        <div className="rounded-control bg-surface-subtle p-3 sm:p-3.5 border border-border/30 space-y-1">
          <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Situation Context
          </span>
          <p className="text-muted-foreground leading-relaxed">{contextDesc}</p>
        </div>
      )}

      {/* 4. Stakes (if present) */}
      {stakes && (
        <div className="rounded-control bg-surface-subtle p-3 sm:p-3.5 border border-border/30 space-y-1">
          <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Key Stakes
          </span>
          <p className="text-muted-foreground leading-relaxed">{stakes}</p>
        </div>
      )}

      {/* 5. Tips for success */}
      <div className="rounded-control bg-surface-subtle p-3 sm:p-3.5 border border-border/30 space-y-1.5">
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
          Practice Tips
        </span>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-normal">
          <li>State your perspective with clarity and directness.</li>
          <li>Acknowledge counterpart constraints and objections.</li>
          <li>Structure your proposal before concluding.</li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Modal Dialog (Never pushes or squishes chat stream) */}
      <AccessibleDialog
        open={isOpenMobile}
        title="Rehearsal Briefing"
        description={scenarioTitle}
        onClose={onToggleMobile}
      >
        <div className="flex flex-col gap-3">
          <div className="max-h-[60dvh] overflow-y-auto pr-1">
            {briefingContent}
          </div>
          <button
            type="button"
            onClick={onToggleMobile}
            className="w-full mt-2 rounded-control bg-primary py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-shadow-sm cursor-pointer hover:opacity-90"
          >
            Return to Rehearsal
          </button>
        </div>
      </AccessibleDialog>

      {/* Desktop Sticky Sidebar (Visible ONLY on md+ screens) */}
      <aside className="hidden md:flex flex-col w-72 lg:w-80 border-r border-border bg-surface-solid/50 p-5 overflow-y-auto shrink-0 space-y-4">
        <div className="border-b border-border/20 pb-3">
          <span className="font-meta text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">
            Rehearsal Briefing
          </span>
          <h2 className="font-display text-base font-bold uppercase tracking-tight text-foreground line-clamp-1 mt-0.5">
            {scenarioTitle}
          </h2>
        </div>
        {briefingContent}
      </aside>
    </>
  );
}
