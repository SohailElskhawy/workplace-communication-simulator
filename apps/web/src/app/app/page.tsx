"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type {
  ProgressData,
  PublicScenarioDetail,
  PublicScenarioSummary,
} from "@kalemny/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { ArrowRightIcon, TrashIcon } from "@/components/icons";
import { CuratedScenarioGrid } from "@/components/scenarios/curated-scenario-grid";
import { DeleteCustomScenarioDialog } from "@/components/scenarios/delete-custom-scenario-dialog";
import { ScenarioBriefingModal } from "@/components/scenarios/scenario-briefing-modal";
import { TestingEntitlementCard } from "@/components/scenarios/testing-entitlement-card";
import { createApiClient } from "@/lib/api-client";
import { useLocale } from "@/lib/locale-context";
import { DEFAULT_MOCK_SCENARIOS } from "./scenario-library-view";

interface EntitlementState {
  remaining: number;
  limit: number;
  resetWindowDays: number;
}

function PracticeHubContent() {
  const searchParams = useSearchParams();
  const activeScenarioKey = searchParams.get("scenario");
  const router = useRouter();

  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { locale, direction } = useLocale();
  const isArabic = locale === "ar";

  const [scenarios, setScenarios] = useState<PublicScenarioSummary[]>(
    DEFAULT_MOCK_SCENARIOS,
  );
  const [entitlements, setEntitlements] = useState<EntitlementState | null>(
    null,
  );
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  // Scenario detail for modal
  const [activeScenarioDetail, setActiveScenarioDetail] =
    useState<PublicScenarioDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Custom scenario deletion
  const [scenarioToDelete, setScenarioToDelete] =
    useState<PublicScenarioSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const loadDashboardData = useCallback(async () => {
    if (!authLoaded || !isSignedIn) return;

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const client = createApiClient(apiUrl);
      const clientAny = client as unknown as {
        fetchEntitlements?: (t: string) => Promise<{
          remaining: number;
          limit: number;
          resetWindowDays?: number;
        }>;
        fetchEntitlement?: (t: string) => Promise<{
          simulationsRemaining?: number | null;
          simulationsLimit?: number | null;
        }>;
      };

      const entitlementsPromise =
        typeof clientAny.fetchEntitlements === "function"
          ? clientAny.fetchEntitlements(token)
          : typeof clientAny.fetchEntitlement === "function"
            ? clientAny.fetchEntitlement(token)
            : client.fetchEntitlement(token);

      const [entitlementsResult, scenariosResult, progressResult] =
        await Promise.allSettled([
          entitlementsPromise,
          client.fetchScenarios(token),
          client.fetchProgress(token),
        ]);

      if (entitlementsResult.status === "fulfilled") {
        const val = entitlementsResult.value as {
          remaining?: number;
          simulationsRemaining?: number | null;
          limit?: number;
          simulationsLimit?: number | null;
          resetWindowDays?: number;
        };
        setEntitlements({
          remaining: val.remaining ?? val.simulationsRemaining ?? 3,
          limit: val.limit ?? val.simulationsLimit ?? 3,
          resetWindowDays: val.resetWindowDays ?? 7,
        });
      }

      if (scenariosResult.status === "fulfilled") {
        const fetchedScenarios = scenariosResult.value;
        if (fetchedScenarios && fetchedScenarios.length > 0) {
          setScenarios(fetchedScenarios);
        } else {
          setScenarios(DEFAULT_MOCK_SCENARIOS);
        }
        setScenariosError(null);
      } else {
        setScenarios(DEFAULT_MOCK_SCENARIOS);
        setScenariosError(
          isArabic
            ? "تعذر تحديث قائمة السيناريوهات. نعرض السيناريوهات الجاهزة."
            : "We could not refresh the scenario list. Showing curated scenarios.",
        );
      }

      if (progressResult.status === "fulfilled") {
        setProgress(progressResult.value);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, authLoaded, getToken, isSignedIn, isArabic]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Fetch full detail when activeScenarioKey changes and is non-null
  useEffect(() => {
    if (!activeScenarioKey) {
      setActiveScenarioDetail(null);
      setModalLoading(false);
      setModalError(null);
      return;
    }

    const keyToLoad: string = activeScenarioKey;
    let isCurrent = true;
    setModalLoading(true);
    setModalError(null);

    async function loadDetail(key: string) {
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");
        const client = createApiClient(apiUrl);
        const detail = await client.fetchScenarioDetail(token, key);
        if (!isCurrent) return;
        setActiveScenarioDetail(detail);
      } catch (err: unknown) {
        if (!isCurrent) return;
        setModalError(
          err instanceof Error
            ? err.message
            : isArabic
              ? "فشل في تحميل تفاصيل السيناريو."
              : "Failed to load scenario details.",
        );
      } finally {
        if (isCurrent) {
          setModalLoading(false);
        }
      }
    }

    void loadDetail(keyToLoad);

    return () => {
      isCurrent = false;
    };
  }, [activeScenarioKey, apiUrl, getToken, isArabic]);

  // Partition scenarios
  const curatedScenarios = useMemo(() => {
    const filtered = scenarios.filter(
      (s) => !s.isCustom && s.category !== "CUSTOM",
    );
    return filtered.length > 0 ? filtered : DEFAULT_MOCK_SCENARIOS;
  }, [scenarios]);

  const customScenarios = useMemo(() => {
    return scenarios.filter(
      (s) => Boolean(s.isCustom) || s.category === "CUSTOM",
    );
  }, [scenarios]);

  const greetingName = user?.firstName
    ? isArabic
      ? `، ${user.firstName}`
      : `, ${user.firstName}`
    : "";

  const handleSelectScenario = useCallback(
    (key: string) => {
      router.replace(`/app?scenario=${encodeURIComponent(key)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const handleCloseModal = useCallback(() => {
    router.replace("/app", { scroll: false });
  }, [router]);

  const handleStartPractice = useCallback(
    async (config: {
      difficulty: "EASY" | "MEDIUM" | "HARD";
      language: "en" | "ar";
      dialect?: "EGYPTIAN" | "GULF";
      interactionMode: "PUSH_TO_TALK" | "REALTIME";
    }) => {
      if (!activeScenarioKey) return;
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const client = createApiClient(apiUrl);
      const attempt = await client.createAttempt(token, {
        scenarioKey: activeScenarioKey,
        difficulty: config.difficulty,
        language: config.language,
        dialect: config.dialect,
        interactionMode: config.interactionMode,
        retryOfAttemptId: null,
      });
      router.push(`/app/simulations/${encodeURIComponent(attempt.id)}`);
    },
    [activeScenarioKey, apiUrl, getToken, router],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!scenarioToDelete) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      const client = createApiClient(apiUrl);
      await client.deleteCustomScenario(token, scenarioToDelete.key);
      setScenarios((prev) =>
        prev.filter((s) => s.key !== scenarioToDelete.key),
      );
      setScenarioToDelete(null);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : isArabic
            ? "فشل في حذف المقابلة المخصصة."
            : "Failed to delete custom scenario.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }, [apiUrl, getToken, isArabic, scenarioToDelete]);

  return (
    <div
      dir={direction}
      className="space-y-12 py-8 sm:py-12"
      data-od-id="practice-selection-hub"
    >
      {/* 1. Header: Greeting, H1, and Subtitle */}
      <header className="max-w-3xl space-y-3" data-od-id="practice-hub-header">
        <p className="text-sm font-semibold text-primary">
          {isArabic
            ? `مرحباً بعودتك${greetingName}`
            : `Welcome back${greetingName}`}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
          {isArabic
            ? "ما هي المحادثة التي تود الاستعداد لها؟"
            : "What conversation would help you feel more prepared?"}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {isArabic
            ? "تدرب على انفراد مع محاور ذكي، واحصل على تدريب مستند إلى أدلة، وأعد المحاولة بثقة."
            : "Practice privately with an AI counterpart, get evidence-linked coaching, and try again while the moment is still fresh."}
        </p>
      </header>

      {/* Scenario fetch error banner */}
      {scenariosError && (
        <div
          role="status"
          className="rounded-control border border-alert/20 bg-alert-surface px-4 py-3 text-sm text-alert-foreground shadow-xs"
        >
          {scenariosError}
        </div>
      )}

      {/* 2. Testing Entitlement Card */}
      <TestingEntitlementCard
        remaining={entitlements?.remaining ?? 3}
        limit={entitlements?.limit ?? 3}
        resetWindowDays={entitlements?.resetWindowDays ?? 7}
        loading={loading}
      />

      {/* 3. Custom Interview Banner */}
      <section
        aria-label={
          isArabic
            ? "إنشاء مقابلة وظيفية مخصصة"
            : "Create custom job interview"
        }
        className="bg-primary-muted border border-primary/20 rounded-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs"
        data-od-id="custom-interview-banner"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {isArabic ? "إنشاء مجاني للسيناريو" : "Free scenario generation"}
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {isArabic
              ? "استعد لمقابلتك الوظيفية الحقيقية"
              : "Prepare for your real job interview"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isArabic
              ? "تدرّب مع محاور ذكي مخصص وفقاً لسيرتك الذاتية ووصف الوظيفة المستهدفة."
              : "Upload your CV and paste the job description to practice tailored questions grounded in your experience."}
          </p>
        </div>
        <Link
          href="/app/scenarios/custom"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-control bg-primary px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
        >
          {isArabic ? "إنشاء مقابلة مخصصة" : "Create custom interview"}
        </Link>
      </section>

      {/* 4. Curated Scenario Grid */}
      <CuratedScenarioGrid
        scenarios={curatedScenarios}
        {...(progress?.recommendedScenario?.key
          ? { recommendedKey: progress.recommendedScenario.key }
          : {})}
        onSelectScenario={handleSelectScenario}
      />

      {/* 5. My Custom Interviews Section (conditionally rendered) */}
      {customScenarios.length > 0 && (
        <section
          aria-label={isArabic ? "مقابلاتي المخصصة" : "My Custom Interviews"}
          className="space-y-6"
          data-od-id="my-custom-interviews"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isArabic ? "مقابلاتي المخصصة" : "My Custom Interviews"}
              </h2>
              <span className="inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface-subtle px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {customScenarios.length}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customScenarios.map((scenario) => {
              const title = (isArabic && scenario.titleAr) || scenario.title;
              const summary =
                (isArabic && scenario.summaryAr) || scenario.summary;
              const rawCreated = (scenario as { createdAt?: string | Date })
                .createdAt;
              const createdDate = rawCreated
                ? new Date(rawCreated).toLocaleDateString(
                    isArabic ? "ar-EG" : "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )
                : null;

              return (
                <div
                  key={scenario.key}
                  className="group flex flex-col justify-between rounded-card border border-border-subtle bg-surface-solid p-5 sm:p-6 shadow-xs transition-colors hover:border-primary/30"
                  data-od-id={`custom-scenario-${scenario.key}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {isArabic ? "مقابلة مخصصة" : "Custom Interview"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScenarioToDelete(scenario);
                          setDeleteError(null);
                        }}
                        aria-label={
                          isArabic ? `حذف ${title}` : `Delete ${title}`
                        }
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control text-muted-foreground hover:bg-alert/10 hover:text-alert transition-colors cursor-pointer"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {title}
                      </h3>
                      <p className="mt-1 font-meta text-xs text-muted-foreground">
                        {isArabic
                          ? "المحاور: محاور التوظيف الذكي"
                          : "Counterpart: AI Hiring Manager"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                        {summary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-2">
                    <span className="font-meta text-xs text-muted-foreground">
                      {createdDate ?? (isArabic ? "مخصص" : "Custom")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectScenario(scenario.key)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
                    >
                      <span>
                        {isArabic ? "تفاصيل التدرّب" : "Practice Setup"}
                      </span>
                      <ArrowRightIcon className="directional-icon h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Scenario Briefing Modal */}
      <ScenarioBriefingModal
        open={Boolean(activeScenarioKey)}
        scenario={activeScenarioDetail}
        loading={modalLoading}
        error={modalError}
        remainingQuota={entitlements?.remaining ?? 3}
        onClose={handleCloseModal}
        onStartPractice={handleStartPractice}
      />

      {/* Delete Custom Scenario Dialog */}
      {scenarioToDelete && (
        <DeleteCustomScenarioDialog
          open={Boolean(scenarioToDelete)}
          scenarioTitle={scenarioToDelete.title}
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) {
              setScenarioToDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

export default function PracticeHubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 py-8" role="status" aria-busy="true">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-subtle" />
          <div className="h-20 max-w-2xl animate-pulse rounded-card bg-surface-subtle" />
        </div>
      }
    >
      <PracticeHubContent />
    </Suspense>
  );
}
