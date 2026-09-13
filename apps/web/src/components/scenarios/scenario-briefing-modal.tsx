"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  ArabicDialect,
  Difficulty,
  InteractionMode,
  PublicScenarioDetail,
  SupportedLanguage,
} from "@kalemny/contracts";

import { AccessibleDialog } from "@/components/accessible-dialog";
import {
  AlertTriangleIcon,
  AssignmentIcon,
  LightbulbIcon,
  SpeakingWithIcon,
  UserIcon,
} from "@/components/icons";
import { DIFFICULTY_OPTIONS, DifficultySelector } from "./difficulty-selector";
import { LanguageDialectSelector } from "./language-dialect-selector";
import { PracticeModeSelector } from "./practice-mode-selector";
import { useLocale } from "@/lib/locale-context";
import { getScenarioImage } from "@/lib/scenario-images";

export interface ScenarioBriefingModalProps {
  open: boolean;
  scenario: PublicScenarioDetail | null;
  loading?: boolean;
  error?: string | null;
  remainingQuota: number;
  onClose: () => void;
  onStartPractice: (config: {
    difficulty: Difficulty;
    language: SupportedLanguage;
    dialect?: ArabicDialect;
    interactionMode: InteractionMode;
  }) => Promise<void>;
}

export function ScenarioBriefingModal({
  open,
  scenario,
  loading = false,
  error = null,
  remainingQuota,
  onClose,
  onStartPractice,
}: ScenarioBriefingModalProps) {
  const { locale, direction } = useLocale();
  const isUiAr = locale === "ar";

  const defaultDifficulty = useMemo<Difficulty>(() => {
    if (!scenario?.availableDifficulties?.length) return "MEDIUM";
    return scenario.availableDifficulties.includes("MEDIUM")
      ? "MEDIUM"
      : (scenario.availableDifficulties[0] ?? "MEDIUM");
  }, [scenario?.availableDifficulties]);

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>(defaultDifficulty);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    locale === "ar" ? "ar" : "en",
  );
  const [selectedDialect, setSelectedDialect] =
    useState<ArabicDialect>("EGYPTIAN");
  const [selectedInteractionMode, setSelectedInteractionMode] =
    useState<InteractionMode>("PUSH_TO_TALK");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Sync state when dialog opens or scenario changes
  useEffect(() => {
    if (open && scenario) {
      const initialDiff = scenario.availableDifficulties.includes("MEDIUM")
        ? "MEDIUM"
        : (scenario.availableDifficulties[0] ?? "MEDIUM");
      setSelectedDifficulty(initialDiff);
      setSelectedLanguage(locale === "ar" ? "ar" : "en");
      setSelectedDialect("EGYPTIAN");
      setSelectedInteractionMode("PUSH_TO_TALK");
      setStarting(false);
      setStartError(null);
    }
  }, [open, scenario, locale]);

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    if (lang === "ar" && !selectedDialect) {
      setSelectedDialect("EGYPTIAN");
    }
  };

  const handleStartPractice = async () => {
    if (remainingQuota <= 0 || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await onStartPractice({
        difficulty: selectedDifficulty,
        language: selectedLanguage,
        ...(selectedLanguage === "ar" ? { dialect: selectedDialect } : {}),
        interactionMode: selectedInteractionMode,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isUiAr
            ? "فشل في بدء جلسة التدريب. حاول مرة أخرى."
            : "Failed to start practice session. Please try again.";
      setStartError(message);
    } finally {
      setStarting(false);
    }
  };

  const isContentAr = selectedLanguage === "ar" || isUiAr;

  const scenarioTitle = scenario
    ? isContentAr && scenario.titleAr
      ? scenario.titleAr
      : scenario.title
    : "";

  const situation = scenario
    ? (isContentAr && (scenario.context.descriptionAr ?? scenario.summaryAr)) ||
      scenario.context.description ||
      scenario.summary
    : "";

  const userRole = scenario
    ? (isContentAr && scenario.context.userRoleAr) || scenario.context.userRole
    : "";

  const aiRole = scenario
    ? (isContentAr && scenario.context.aiRoleAr) || scenario.context.aiRole
    : "";

  const userObjective = scenario
    ? (isContentAr && scenario.context.userObjectiveAr) ||
      scenario.context.userObjective
    : "";

  const portrait = scenario ? getScenarioImage(scenario.key) : null;

  return (
    <AccessibleDialog
      open={open}
      title={isUiAr ? "ملخص جلسة التدريب" : "Scenario Briefing"}
      description={
        isUiAr
          ? "راجع تفاصيل وسياق السيناريو وحدد إعدادات التدريب قبل البدء."
          : "Review scenario context and configure your rehearsal parameters before starting."
      }
      onClose={() => {
        if (!starting) onClose();
      }}
      maxWidthClass="max-w-3xl"
    >
      <div dir={direction} className="space-y-6">
        {loading ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center py-12 space-y-3"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="font-sans text-sm text-muted-foreground">
              {isUiAr
                ? "جاري تحميل تفاصيل السيناريو..."
                : "Loading scenario details..."}
            </p>
          </div>
        ) : !scenario ? (
          <div className="space-y-4 py-4">
            {error && (
              <div
                role="alert"
                className="rounded-control border border-alert/30 bg-alert-surface p-3 font-sans text-xs text-alert-foreground"
              >
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] items-center justify-center rounded-control border border-border bg-surface-solid px-5 py-2 font-display text-sm font-semibold text-foreground hover:bg-surface-subtle cursor-pointer"
              >
                {isUiAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header & Counterpart Profile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-card bg-surface-subtle border border-border-subtle">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-solid">
                  {portrait ? (
                    <Image
                      src={portrait}
                      alt={scenarioTitle}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-base font-semibold text-muted-foreground">
                      {scenarioTitle.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-foreground truncate">
                    {scenarioTitle}
                  </h3>
                  <p className="font-meta text-xs text-muted-foreground truncate">
                    {isContentAr
                      ? `تتحدث مع: ${aiRole}`
                      : `Speaking with: ${aiRole}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="inline-flex items-center rounded-full bg-surface-solid border border-border-subtle px-3 py-1 font-meta text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {scenario.category}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-3 py-1 font-meta text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isContentAr
                    ? DIFFICULTY_OPTIONS[selectedDifficulty]?.titleAr ??
                      selectedDifficulty
                    : DIFFICULTY_OPTIONS[selectedDifficulty]?.title ??
                      selectedDifficulty}
                </span>
              </div>
            </div>

            {/* Scenario Context Cards */}
            <div className="space-y-3 sm:space-y-4">
              {/* Situation */}
              <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1.5">
                <div className="flex items-center gap-2">
                  <AssignmentIcon className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-meta text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    {isContentAr ? "الموقف" : "Situation"}
                  </span>
                </div>
                <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed">
                  {situation}
                </p>
              </div>

              {/* Two-column roles card: "Your Role" and "Counterpart Role" */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1.5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-meta text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      {isContentAr ? "دورك" : "Your Role"}
                    </span>
                  </div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {userRole}
                  </p>
                </div>

                <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1.5">
                  <div className="flex items-center gap-2">
                    <SpeakingWithIcon className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-meta text-xs uppercase tracking-wider font-bold text-muted-foreground">
                      {isContentAr ? "دور المحاور" : "Counterpart Role"}
                    </span>
                  </div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {aiRole}
                  </p>
                </div>
              </div>

              {/* Primary Objective card (border-primary/20 bg-primary/5) */}
              <div className="rounded-card bg-primary/5 p-4 border border-primary/20 space-y-1.5">
                <div className="flex items-center gap-2">
                  <LightbulbIcon className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-meta text-xs uppercase tracking-wider font-bold text-primary">
                    {isContentAr ? "هدفك الأساسي" : "Primary Objective"}
                  </span>
                </div>
                <p className="font-sans text-xs sm:text-sm text-foreground leading-relaxed font-medium">
                  {userObjective}
                </p>
              </div>
            </div>

            {/* Integrated Configuration Selectors */}
            <div className="space-y-6 pt-2 border-t border-border-subtle">
              <DifficultySelector
                availableDifficulties={scenario.availableDifficulties}
                selectedDifficulty={selectedDifficulty}
                onSelectDifficulty={setSelectedDifficulty}
              />

              <LanguageDialectSelector
                language={selectedLanguage}
                dialect={selectedDialect}
                onSelectLanguage={handleSelectLanguage}
                onSelectDialect={setSelectedDialect}
              />

              <PracticeModeSelector
                mode={selectedInteractionMode}
                onSelectMode={setSelectedInteractionMode}
                language={selectedLanguage}
              />
            </div>

            {/* Footer & Quota Gate */}
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              {/* Quota notices or alerts */}
              {remainingQuota <= 0 ? (
                <div
                  role="alert"
                  className="rounded-control border border-alert/30 bg-alert-surface p-3 font-sans text-xs text-alert-foreground flex items-center gap-2"
                >
                  <AlertTriangleIcon className="w-4 h-4 text-alert shrink-0" />
                  <span>
                    {isUiAr
                      ? "تم استنفاد حصتك الأسبوعية (3 جلسات). تتجدد الجلسات خلال 7 أيام متجددة."
                      : "Weekly quota is exhausted (3 sessions). Sessions reset on a rolling 7-day window."}
                  </span>
                </div>
              ) : (
                <p className="font-meta text-xs text-muted-foreground">
                  {isUiAr
                    ? "بدء هذه الجلسة سيستهلك 1 من جلساتك الأسبوعية الـ 3 المتاحة."
                    : "Starting this practice will consume 1 of your 3 weekly sessions."}
                </p>
              )}

              {/* Error alert */}
              {(startError || error) && (
                <div
                  role="alert"
                  className="rounded-control border border-alert/30 bg-alert-surface p-3 font-sans text-xs text-alert-foreground"
                >
                  {startError || error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={starting}
                  className="flex min-h-[44px] items-center justify-center rounded-control border border-border bg-surface-solid px-5 py-2.5 font-display text-sm font-semibold text-foreground transition-all hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isUiAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleStartPractice}
                  disabled={remainingQuota <= 0 || starting}
                  className="flex min-h-[44px] items-center justify-center rounded-control bg-primary px-6 py-2.5 font-display text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {starting
                    ? isUiAr
                      ? "جاري البدء..."
                      : "Starting..."
                    : isUiAr
                      ? "ابدأ التدرّب"
                      : "Start Practice"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AccessibleDialog>
  );
}
