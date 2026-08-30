"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  AttemptComparison,
  AttemptDetailResponse,
  ConversationTurn,
  Difficulty,
  EvaluationData,
} from "@kalemny/contracts";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AttemptComparisonSection } from "@/components/results/attempt-comparison-section";
import { CoachingMomentsSection } from "@/components/results/coaching-moments-section";
import { DeleteAttemptDialog } from "@/components/results/delete-attempt-dialog";
import { EvaluationFailureView } from "@/components/results/evaluation-failure-view";
import { EvaluationProcessingView } from "@/components/results/evaluation-processing-view";
import { ObjectivesOutcomeSection } from "@/components/results/objectives-outcome-section";
import { ResultsHeroCard } from "@/components/results/results-hero-card";
import { RetryAttemptDialog } from "@/components/results/retry-attempt-dialog";
import { StrengthsImprovementsSection } from "@/components/results/strengths-improvements-section";
import { TranscriptViewerModal } from "@/components/results/transcript-viewer-modal";
import { UniversalSkillsSection } from "@/components/results/universal-skills-section";
import { ErrorState, LoadingState } from "@/components/route-state";
import { ApiClientError, createApiClient } from "@/lib/api-client";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const attemptId = useMemo(() => {
    const raw = params.attemptId;
    return (Array.isArray(raw) ? raw[0] : (raw as string | undefined)) ?? "";
  }, [params.attemptId]);

  const [attempt, setAttempt] = useState<AttemptDetailResponse["data"] | null>(
    null,
  );
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [comparison, setComparison] = useState<AttemptComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evalFailed, setEvalFailed] = useState(false);
  const evaluationRequestInFlight = useRef(false);

  // Modals
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const turns = attempt?.turns;
  const turnMap = useMemo(() => {
    const map = new Map<string, ConversationTurn>();
    if (!turns) return map;
    for (const t of turns) {
      map.set(t.id, t);
    }
    return map;
  }, [turns]);

  const requestEvaluation = useCallback(async () => {
    if (!attemptId || evaluationRequestInFlight.current) return;

    evaluationRequestInFlight.current = true;
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const evaluationData = await createApiClient(apiUrl).evaluateAttempt(
        token,
        attemptId,
      );
      setEvaluation(evaluationData);
      setAttempt((current) =>
        current
          ? {
              ...current,
              status: "COMPLETED",
              evaluation: evaluationData,
            }
          : current,
      );
      setEvalFailed(false);
    } catch (requestError: unknown) {
      if (
        requestError instanceof ApiClientError &&
        requestError.code === "EVALUATION_IN_PROGRESS"
      ) {
        return;
      }

      if (
        requestError instanceof ApiClientError &&
        (requestError.code === "EVALUATION_FAILED" ||
          requestError.code === "EVALUATION_NOT_FOUND")
      ) {
        setEvalFailed(true);
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate the simulation evaluation.",
      );
    } finally {
      evaluationRequestInFlight.current = false;
    }
  }, [apiUrl, attemptId, getToken]);

  const reloadData = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      setError(null);
      setEvalFailed(false);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const attemptData = await client.fetchAttempt(token, attemptId);
      setAttempt(attemptData);
      setSelectedDifficulty(attemptData.difficulty);

      if (
        attemptData.status === "EVALUATING" ||
        attemptData.status === "ACTIVE"
      ) {
        setLoading(false);
        if (attemptData.status === "EVALUATING" && !attemptData.evaluation) {
          void requestEvaluation();
        }
        return;
      }

      if (attemptData.status === "EVALUATION_FAILED") {
        setEvalFailed(true);
        setLoading(false);
        return;
      }

      if (attemptData.evaluation) {
        setEvaluation(attemptData.evaluation);
      } else {
        const evalData = await client.evaluateAttempt(token, attemptId);
        setEvaluation(evalData);
        setAttempt((prev) =>
          prev ? { ...prev, status: "COMPLETED", evaluation: evalData } : prev,
        );
      }

      if (attemptData.comparison) {
        setComparison(attemptData.comparison);
      } else if (attemptData.retryOfAttemptId) {
        try {
          const compData = await client.fetchAttemptComparison(
            token,
            attemptId,
          );
          setComparison(compData);
        } catch {}
      }
    } catch (err: unknown) {
      if (
        err instanceof ApiClientError &&
        (err.code === "EVALUATION_NOT_FOUND" ||
          err.code === "EVALUATION_FAILED")
      ) {
        setEvalFailed(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load simulation results.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, attemptId, getToken, requestEvaluation]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!isLoaded || !isSignedIn || !attemptId) return;
      try {
        setError(null);
        setEvalFailed(false);

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const attemptData = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;

        setAttempt(attemptData);
        setSelectedDifficulty(attemptData.difficulty);

        if (attemptData.status === "EVALUATION_FAILED") {
          setEvalFailed(true);
          return;
        }

        if (attemptData.evaluation) {
          setEvaluation(attemptData.evaluation);
        } else if (attemptData.status === "EVALUATING") {
          void requestEvaluation();
        } else {
          setError(
            "This simulation must be finished before it can be evaluated.",
          );
        }

        if (attemptData.comparison) {
          setComparison(attemptData.comparison);
        } else if (attemptData.retryOfAttemptId) {
          try {
            const compData = await client.fetchAttemptComparison(
              token,
              attemptId,
            );
            if (isMounted) setComparison(compData);
          } catch {}
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (
          err instanceof ApiClientError &&
          (err.code === "EVALUATION_NOT_FOUND" ||
            err.code === "EVALUATION_FAILED")
        ) {
          setEvalFailed(true);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load simulation results.",
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
  }, [apiUrl, attemptId, getToken, isLoaded, isSignedIn, requestEvaluation]);

  // Polling for EVALUATING status
  useEffect(() => {
    if (attempt?.status !== "EVALUATING" || !attemptId) return;

    const poll = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const client = createApiClient(apiUrl);
        const updated = await client.fetchAttempt(token, attemptId);

        setAttempt(updated);

        if (updated.status === "EVALUATING" && !updated.evaluation) {
          void requestEvaluation();
          return;
        }

        if (updated.status !== "EVALUATING") {
          if (updated.status === "COMPLETED") {
            if (updated.evaluation) {
              setEvaluation(updated.evaluation);
            }
            if (updated.comparison) {
              setComparison(updated.comparison);
            } else if (updated.retryOfAttemptId) {
              try {
                const compData = await client.fetchAttemptComparison(
                  token,
                  attemptId,
                );
                setComparison(compData);
              } catch {}
            }
          } else if (updated.status === "EVALUATION_FAILED") {
            setEvalFailed(true);
          }
        }
      } catch {}
    };

    void poll();
    const interval = setInterval(() => void poll(), 2500);

    return () => clearInterval(interval);
  }, [apiUrl, attempt?.status, attemptId, getToken, requestEvaluation]);

  const handleStartRetry = async () => {
    if (!attempt || !attemptId) return;
    try {
      setRetrying(true);
      setRetryError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const newAttempt = await client.createAttempt(token, {
        scenarioKey: attempt.scenario.key,
        difficulty: selectedDifficulty,
        retryOfAttemptId: attempt.id,
      });

      router.push(`/app/simulations/${encodeURIComponent(newAttempt.id)}`);
    } catch (err: unknown) {
      setRetryError(
        err instanceof Error ? err.message : "Failed to start retry rehearsal.",
      );
      setRetrying(false);
    }
  };

  const handleDeleteAttempt = async () => {
    if (!attemptId) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      await client.deleteAttempt(token, attemptId);
      router.push("/app/history");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete attempt.",
      );
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading rehearsal results and coaching..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load results"
        description={error}
        onRetry={reloadData}
      />
    );
  }

  if (!attempt) {
    return (
      <ErrorState
        title="Session not found"
        description="The requested rehearsal session could not be located."
      />
    );
  }

  if (attempt.status === "EVALUATING") {
    const latestUserTurn = attempt.turns
      .filter((t: ConversationTurn) => Boolean(t.userText))
      .slice(-1)[0];
    return (
      <EvaluationProcessingView
        scenarioTitle={attempt.scenario.title}
        difficulty={attempt.difficulty}
        latestUserTurnText={latestUserTurn?.userText}
      />
    );
  }

  if (evalFailed || attempt.status === "EVALUATION_FAILED") {
    return (
      <EvaluationFailureView
        error={error}
        attemptId={attempt.id}
        onRetry={reloadData}
        retrying={loading}
      />
    );
  }

  if (!evaluation) {
    return (
      <ErrorState
        title="Evaluation Unavailable"
        description="Evaluation data is not ready yet."
        onRetry={reloadData}
      />
    );
  }

  return (
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-10 font-sans pb-24">
      {/* 1. Hero & Overall Scores */}
      <ResultsHeroCard
        attempt={attempt}
        evaluation={evaluation}
        retrying={retrying}
        onOpenRetryModal={() => setShowRetryModal(true)}
        onOpenTranscriptModal={() => setShowTranscriptModal(true)}
        onOpenDeleteModal={() => setShowDeleteModal(true)}
      />

      {/* 2. Attempt Comparison Section (if retry) */}
      {comparison && <AttemptComparisonSection comparison={comparison} />}

      {/* 3. Universal Skills Bento Grid */}
      <UniversalSkillsSection
        skills={evaluation.skills}
        nextFocusSkillKey={evaluation.nextFocus.skill}
      />

      {/* 4. Coaching Moments (Moments That Mattered) */}
      <CoachingMomentsSection moments={evaluation.moments} turnMap={turnMap} />

      {/* 5. Scenario Specific Objectives Outcome */}
      <ObjectivesOutcomeSection
        objectives={evaluation.objectives}
        turnMap={turnMap}
      />

      {/* 6. Key Strengths & Areas for Improvement */}
      <StrengthsImprovementsSection
        strengths={evaluation.strengths}
        improvements={evaluation.improvements}
        turnMap={turnMap}
      />

      {/* Modals */}
      <RetryAttemptDialog
        open={showRetryModal}
        scenarioTitle={attempt.scenario.title}
        currentDifficulty={attempt.difficulty}
        selectedDifficulty={selectedDifficulty}
        nextFocusSkillKey={evaluation.nextFocus.skill}
        retryError={retryError}
        retrying={retrying}
        onSelectDifficulty={setSelectedDifficulty}
        onClose={() => setShowRetryModal(false)}
        onConfirm={handleStartRetry}
      />

      <TranscriptViewerModal
        open={showTranscriptModal}
        attemptId={attempt.id}
        scenarioTitle={attempt.scenario.title}
        turns={attempt.turns}
        onClose={() => setShowTranscriptModal(false)}
      />

      <DeleteAttemptDialog
        open={showDeleteModal}
        scenarioTitle={attempt.scenario.title}
        difficulty={attempt.difficulty}
        turnCount={attempt.turns.length}
        deleteError={deleteError}
        deleteLoading={deleteLoading}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteAttempt}
      />
    </div>
  );
}
