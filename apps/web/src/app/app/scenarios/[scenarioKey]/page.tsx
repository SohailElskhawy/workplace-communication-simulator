"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  Difficulty,
  InteractionMode,
  PublicScenarioDetail,
} from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowLeftIcon,
  PlayIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/icons";
import { ErrorState, LoadingState } from "@/components/route-state";
import { DeleteCustomScenarioDialog } from "@/components/scenarios/delete-custom-scenario-dialog";
import { DifficultySelector } from "@/components/scenarios/difficulty-selector";
import { InteractionModeSelector } from "@/components/scenarios/interaction-mode-selector";
import { ScenarioBriefingCard } from "@/components/scenarios/scenario-briefing-card";
import { ScenarioHeroGraphic } from "@/components/scenarios/scenario-hero-graphic";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { isRealtimeVoiceEnabled } from "@/lib/feature-flags";

import { getScenarioMeta } from "../../scenario-library-view";

// Build-time UI gate only; the backend endpoints remain separately gated by
// the server-only ELEVENLABS_* settings.
const realtimeVoiceEnabled = isRealtimeVoiceEnabled();
const availableInteractionModes: InteractionMode[] = realtimeVoiceEnabled
  ? ["PUSH_TO_TALK", "REALTIME"]
  : ["PUSH_TO_TALK"];

export default function ScenarioDetailPage() {
  const params = useParams();
  const rawKey = params?.scenarioKey;
  const scenarioKey =
    (Array.isArray(rawKey) ? rawKey[0] : (rawKey as string | undefined)) ?? "";

  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [scenario, setScenario] = useState<PublicScenarioDetail | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  // Voice interaction mode chosen at simulation start and persisted on the
  // attempt. Push-to-talk is the Release 1 default; realtime is offered only
  // when the build-time feature flag is enabled.
  const [selectedInteractionMode, setSelectedInteractionMode] =
    useState<InteractionMode>("PUSH_TO_TALK");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const reloadScenario = useCallback(async () => {
    if (!scenarioKey) return;
    try {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const data = await client.fetchScenarioDetail(token, scenarioKey);
      setScenario(data);

      if (data.availableDifficulties.includes("MEDIUM")) {
        setSelectedDifficulty("MEDIUM");
      } else if (data.availableDifficulties.length > 0) {
        setSelectedDifficulty(data.availableDifficulties[0]!);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
        setIsNotFound(true);
        setError("The requested scenario could not be found.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load scenario detail.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, scenarioKey, getToken]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!isLoaded || !isSignedIn || !scenarioKey) return;
      try {
        setError(null);
        setIsNotFound(false);

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const data = await client.fetchScenarioDetail(token, scenarioKey);
        if (!isMounted) return;

        setScenario(data);
        if (data.availableDifficulties.includes("MEDIUM")) {
          setSelectedDifficulty("MEDIUM");
        } else if (data.availableDifficulties.length > 0) {
          setSelectedDifficulty(data.availableDifficulties[0]!);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setIsNotFound(true);
          setError("The requested scenario could not be found.");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load scenario detail.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, scenarioKey, getToken, isLoaded, isSignedIn]);

  const handleStartSimulation = async () => {
    if (!scenario || starting) return;
    try {
      setStarting(true);
      setStartError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const attempt = await client.createAttempt(token, {
        scenarioKey: scenario.key,
        difficulty: selectedDifficulty,
        retryOfAttemptId: null,
        interactionMode: selectedInteractionMode,
      });

      router.push(`/app/simulations/${encodeURIComponent(attempt.id)}`);
    } catch (err: unknown) {
      setStartError(
        err instanceof Error
          ? err.message
          : "Failed to begin simulation rehearsal.",
      );
      setStarting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!scenario) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      await client.deleteCustomScenario(token, scenario.key);

      router.push("/app/scenarios");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Failed to delete custom scenario.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const availableDifficulties = useMemo<Difficulty[]>(() => {
    return scenario?.availableDifficulties ?? ["EASY", "MEDIUM", "HARD"];
  }, [scenario?.availableDifficulties]);

  if (loading) {
    return <LoadingState label="Loading scenario details..." />;
  }

  if (isNotFound) {
    return (
      <ErrorState
        title="Scenario Not Found"
        description="The workplace scenario you selected does not exist or has been retired."
      />
    );
  }

  if (error || !scenario) {
    return (
      <ErrorState
        title="Unable to load scenario"
        description={error ?? "An error occurred."}
        onRetry={reloadScenario}
      />
    );
  }

  return (
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-10 font-sans pb-24">
      {/* 1. Top Navigation & Category */}
      <nav
        aria-label="Breadcrumb navigation"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>All Scenarios</span>
          </Link>
          <span className="text-border/40 font-meta text-xs">/</span>
          <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
            {getScenarioMeta(scenario).categoryLabel}
          </span>
        </div>

        {scenario.isCustom && (
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-muted-foreground hover:text-alert hover:bg-alert/10 border border-border/40 font-meta text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Delete Scenario</span>
          </button>
        )}
      </nav>

      {/* 2. Memphis Hero Banner */}
      <ScenarioHeroGraphic scenarioKey={scenario.key} title={scenario.title} />

      {/* 3. Scenario Title & Overview */}
      <header className="space-y-3">
        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
          {scenario.title}
        </h1>
        <p className="font-sans text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          {scenario.summary}
        </p>
      </header>

      {/* 4. Scenario Briefing & Context Card */}
      <ScenarioBriefingCard scenario={scenario} />

      {/* 5. Difficulty Selection */}
      <DifficultySelector
        availableDifficulties={availableDifficulties}
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={setSelectedDifficulty}
      />

      {/* 5b. Interaction Mode Selection (realtime builds only) */}
      {realtimeVoiceEnabled && (
        <InteractionModeSelector
          availableModes={availableInteractionModes}
          selectedMode={selectedInteractionMode}
          onSelectMode={setSelectedInteractionMode}
        />
      )}

      {/* Start Simulation Error Alert (if any) */}
      {startError && (
        <div
          role="alert"
          className="rounded-control border-2 border-alert bg-alert/10 p-4 font-sans text-xs text-alert shadow-xs"
        >
          {startError}
        </div>
      )}

      {/* 6. Sticky CTA Bar */}
      <div className="glass-surface rounded-card border-2 border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_0px_#1a1a1a]">
        <div>
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-bold block">
            Ready to Begin
          </span>
          <p className="font-display text-base font-bold uppercase tracking-tight text-foreground">
            Rehearse at {selectedDifficulty} Difficulty
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartSimulation}
          disabled={starting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-control bg-primary px-8 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
        >
          {starting ? (
            <>
              <RefreshIcon className="w-4 h-4 animate-spin" />
              <span>Initializing Rehearsal...</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              <span>Begin Simulation</span>
            </>
          )}
        </button>
      </div>

      {scenario.isCustom && (
        <DeleteCustomScenarioDialog
          open={deleteOpen}
          scenarioTitle={scenario.title}
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) {
              setDeleteOpen(false);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
