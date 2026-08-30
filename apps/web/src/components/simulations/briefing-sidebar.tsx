"use client";

import type { PublicScenarioDetail } from "@kalemny/contracts";

import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

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
  const contextDesc = scenarioDetail?.context?.description ?? scenarioDetail?.summary;
  const stakes = scenarioDetail?.context?.stakes;

  const briefingContent = (
    <div className="space-y-4 font-sans text-xs">
      {/* 1. Counterpart Info */}
      <div className="rounded-control bg-surface-subtle p-3.5 border border-border/30 space-y-1">
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
          Counterpart
        </span>
        <p className="font-display font-bold text-sm text-foreground">
          {counterpartRole}
        </p>
      </div>

      {/* 2. Your Role & Objective */}
      <div className="rounded-control bg-primary/5 p-3.5 border border-primary/20 space-y-1.5">
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary block">
          Your Objective
        </span>
        <p className="text-foreground leading-relaxed font-medium">
          {userObjective}
        </p>
      </div>

      {/* 3. Scenario Context / Background */}
      {contextDesc && (
        <div className="rounded-control bg-surface-subtle p-3.5 border border-border/30 space-y-1">
          <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Situation Context
          </span>
          <p className="text-muted-foreground leading-relaxed">
            {contextDesc}
          </p>
        </div>
      )}

      {/* 4. Stakes (if present) */}
      {stakes && (
        <div className="rounded-control bg-surface-subtle p-3.5 border border-border/30 space-y-1">
          <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Key Stakes
          </span>
          <p className="text-muted-foreground leading-relaxed">
            {stakes}
          </p>
        </div>
      )}

      {/* 5. Tips for success */}
      <div className="rounded-control bg-surface-subtle p-3.5 border border-border/30 space-y-1.5">
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
      {/* Mobile Collapsible Briefing Accordion */}
      <div className="md:hidden border-b border-border/30 bg-surface px-4 py-2.5">
        <button
          type="button"
          onClick={onToggleMobile}
          className="flex w-full items-center justify-between font-display text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer"
        >
          <span>Scenario Briefing & Objectives</span>
          <ChevronDownIcon
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpenMobile && "rotate-180",
            )}
          />
        </button>
        {isOpenMobile && <div className="mt-3 pt-3 border-t border-border/20">{briefingContent}</div>}
      </div>

      {/* Desktop Sticky Sidebar */}
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
