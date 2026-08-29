"use client";

import { useAuth } from "@clerk/nextjs";
import type { HistoryItem } from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiClientError, createApiClient } from "../../../lib/api-client";
import { getScoreBand } from "../../../lib/score-utils";

function formatStatus(status: HistoryItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "EVALUATING":
      return {
        label: "Evaluating",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dotClass: "bg-indigo-500",
      };
    case "EVALUATION_FAILED":
      return {
        label: "Evaluation Incomplete",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      };
    case "ABANDONED":
      return {
        label: "Ended Early",
        badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
        dotClass: "bg-slate-400",
      };
    case "ACTIVE":
      return {
        label: "Active In-Progress",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        dotClass: "bg-blue-500",
      };
  }
}

export default function HistoryPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletion modal state
  const [deletingItem, setDeletingItem] = useState<HistoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const loadMoreHistory = useCallback(
    async (cursor: string) => {
      try {
        setLoadingMore(true);
        setError(null);

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const response = await client.fetchHistory(token, {
          cursor,
          limit: 15,
        });

        setItems((prev) => [...prev, ...response.data]);
        setNextCursor(response.meta.nextCursor);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load older sessions.",
        );
      } finally {
        setLoadingMore(false);
      }
    },
    [apiUrl, getToken],
  );

  const reloadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      const response = await client.fetchHistory(token, { limit: 15 });

      setItems(response.data);
      setNextCursor(response.meta.nextCursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load session history.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!isLoaded || !isSignedIn) return;
      try {
        setLoading(true);
        setError(null);

        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const client = createApiClient(apiUrl);
        const response = await client.fetchHistory(token, { limit: 15 });
        if (!isMounted) return;

        setItems(response.data);
        setNextCursor(response.meta.nextCursor);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load session history.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, getToken, isLoaded, isSignedIn]);

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const client = createApiClient(apiUrl);
      await client.deleteAttempt(token, deletingItem.attemptId);

      setItems((prev) =>
        prev.filter((i) => i.attemptId !== deletingItem.attemptId),
      );
      setSuccessMessage(
        `Session for "${deletingItem.scenario.title}" was successfully deleted.`,
      );
      setDeletingItem(null);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
        // Already deleted
        setItems((prev) =>
          prev.filter((i) => i.attemptId !== deletingItem.attemptId),
        );
        setDeletingItem(null);
      } else {
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete session.",
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Practice History
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Rehearsal Session History
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Reopen previous simulations, review structured evaluations and
            evidence-linked coaching, and manage your rehearsal records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            New Simulation
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 shadow-2xs">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="font-bold text-emerald-700 hover:text-emerald-950 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">Unable to load history</h2>
              <p className="mt-1 text-xs text-rose-800">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => reloadHistory()}
              className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-500"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && items.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-2xl">
            💬
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">
            No Session History Yet
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Start a workplace conversation simulation to rehearse challenging
            dialogues and track your communication improvement over time.
          </p>
          <div className="mt-6">
            <Link
              href="/app"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500"
            >
              Browse Scenarios
            </Link>
          </div>
        </div>
      )}

      {/* History Items List */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            const statusInfo = formatStatus(item.status);
            const scoreBand =
              item.overallScore !== null
                ? getScoreBand(item.overallScore)
                : null;
            const isRetry = Boolean(item.retryOfAttemptId);

            const displayDate = new Date(
              item.completedAt ?? item.startedAt,
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={item.attemptId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {item.scenario.title}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {item.difficulty}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusInfo.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`}
                      />
                      {statusInfo.label}
                    </span>
                    {isRetry && (
                      <span className="inline-flex items-center rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                        🔄 Retry
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{displayDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Score Pill if completed */}
                  {scoreBand && item.overallScore !== null && (
                    <div className="text-right pr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Score
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-lg font-extrabold ${scoreBand.textClass}`}
                        >
                          {item.overallScore}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          / 100
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Primary Link Button */}
                  {item.status === "ACTIVE" ? (
                    <Link
                      href={`/app/simulations/${encodeURIComponent(item.attemptId)}`}
                      className="inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-500"
                    >
                      Resume
                    </Link>
                  ) : (
                    <Link
                      href={`/app/results/${encodeURIComponent(item.attemptId)}`}
                      className="inline-flex items-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
                    >
                      View Results
                    </Link>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    title="Delete Session"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {nextCursor && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => loadMoreHistory(nextCursor)}
                disabled={loadingMore}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load Older Sessions"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 text-lg">
                ⚠️
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Practice Session?
                </h3>
                <p className="text-xs text-slate-500">
                  {deletingItem.scenario.title} ({deletingItem.difficulty})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete this simulation attempt, all
              stored conversation messages, and its evaluation data. Subsequent
              retry sessions will remain safely preserved.
            </p>

            {deleteError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingItem(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
