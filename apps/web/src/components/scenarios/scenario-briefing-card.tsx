import type {
  PublicScenarioDetail,
  SupportedLanguage,
} from "@kalemny/contracts";

import {
  AssignmentIcon,
  LightbulbIcon,
  SpeakingWithIcon,
  UserIcon,
} from "@/components/icons";
import { useLocale } from "@/lib/locale-context";

export interface ScenarioBriefingCardProps {
  scenario: PublicScenarioDetail;
  language?: SupportedLanguage;
}

export function ScenarioBriefingCard({
  scenario,
  language,
}: ScenarioBriefingCardProps) {
  const { locale } = useLocale();
  const isArabic = (language ?? locale) === "ar";
  const context = scenario.context;

  const situation =
    (isArabic && (context.descriptionAr ?? scenario.summaryAr)) ||
    context.description ||
    scenario.summary;
  const userRole = (isArabic && context.userRoleAr) || context.userRole;
  const aiRole = (isArabic && context.aiRoleAr) || context.aiRole;
  const userObjective =
    (isArabic && context.userObjectiveAr) || context.userObjective;
  const stakes = (isArabic && context.stakesAr) || context.stakes;

  return (
    <section
      aria-label={
        isArabic ? "ملخص وسياق السيناريو" : "Scenario Briefing and Context"
      }
      className="glass-surface rounded-card p-4 sm:p-8 border border-border shadow-[4px_4px_0px_0px_#1a1a1a] space-y-4 sm:space-y-6"
    >
      <div className="border-b border-border/20 pb-2.5 sm:pb-3">
        <span className="font-meta text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground font-bold block">
          {isArabic ? "ملخص التمرين" : "Rehearsal Briefing"}
        </span>
        <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground mt-0.5">
          {isArabic ? "سياق السيناريو والأهداف" : "Scenario Context & Objectives"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
        {/* Situation */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1 md:col-span-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AssignmentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              {isArabic ? "الموقف" : "Situation"}
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed">
            {situation}
          </p>
        </div>

        {/* Your Role */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              {isArabic ? "دورك" : "Your Role"}
            </span>
          </div>
          <p className="font-display text-xs sm:text-sm font-bold text-foreground">
            {userRole}
          </p>
        </div>

        {/* Counterpart Role */}
        <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <SpeakingWithIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              {isArabic ? "تتحدث مع" : "Speaking With"}
            </span>
          </div>
          <p className="font-display text-xs sm:text-sm font-bold text-foreground">
            {aiRole}
          </p>
        </div>

        {/* Your Objective */}
        <div className="rounded-control bg-primary/5 p-3 sm:p-4 border border-primary/20 space-y-1 md:col-span-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LightbulbIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-primary">
              {isArabic ? "هدفك الأساسي" : "Your Primary Objective"}
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed font-medium">
            {userObjective}
          </p>
        </div>

        {/* Stakes */}
        {stakes && (
          <div className="rounded-control bg-surface-subtle p-3 sm:p-4 border border-border/30 space-y-1 md:col-span-2">
            <span className="font-meta text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
              {isArabic ? "الرهانات الأساسية" : "Key Stakes"}
            </span>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {stakes}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
