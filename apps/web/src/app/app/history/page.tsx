"use client";

import { useAuth } from "@clerk/nextjs";
import type { Difficulty, HistoryItem } from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccessibleDialog } from "../../../components/accessible-dialog";
import { ApiClientError, createApiClient } from "../../../lib/api-client";
import { cn } from "@/lib/cn";
import { formatDelta, getScoreBand } from "../../../lib/score-utils";

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function formatStatus(status: HistoryItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        badgeClass: "bg-[#d4ff00]/20 text-[#171e00] border-border",
        dotClass: "bg-[#536600]",
      };
    case "EVALUATING":
      return {
        label: "Evaluating",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
        dotClass: "bg-primary animate-pulse",
      };
    case "EVALUATION_FAILED":
      return {
        label: "Evaluation Incomplete",
        badgeClass: "bg-[#ffb3b0]/30 text-[#971e26] border-border",
        dotClass: "bg-[#ba1a1a]",
      };
    case "ABANDONED":
      return {
        label: "Ended Early",
        badgeClass: "bg-surface-subtle text-muted-foreground border-border/40",
        dotClass: "bg-muted-foreground",
      };
    case "ACTIVE":
      return {
        label: "In Progress",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
        dotClass: "bg-primary",
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

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Deletion modal state
  const [deletingItem, setDeletingItem] = useState<HistoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Lookup map for fast resolution of retry parent items
  const itemMap = useMemo(() => {
    const map = new Map<string, HistoryItem>();
    for (const item of items) {
      map.set(item.attemptId, item);
    }
    return map;
  }, [items]);

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

  // Filtered items based on search and selected difficulty/status
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.scenario.title
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

      const matchesDifficulty =
        selectedDifficulty === "ALL" ||
        item.difficulty === (selectedDifficulty as Difficulty);

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "COMPLETED" && item.status === "COMPLETED") ||
        (selectedStatus === "FAILED" &&
          (item.status === "EVALUATION_FAILED" ||
            item.status === "ABANDONED")) ||
        (selectedStatus === "ACTIVE" &&
          (item.status === "ACTIVE" || item.status === "EVALUATING"));

      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }, [items, searchQuery, selectedDifficulty, selectedStatus]);

  // Overview metrics
  const completedCount = useMemo(
    () => items.filter((i) => i.status === "COMPLETED").length,
    [items],
  );
  const scenariosCount = useMemo(
    () => new Set(items.map((i) => i.scenario.key)).size,
    [items],
  );

  return (
    <div className="w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-10 font-sans pb-24">
      {/* 1. Hero Section */}
      <section className="relative space-y-4 max-w-4xl">
        <div className="inline-block px-3 py-1 border border-border rounded-full bg-surface-subtle">
          <span className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Practice History
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
              Every conversation is another rep.
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed max-w-2xl">
              Revisit past simulations, review your performance data, and jump
              back into challenging scenarios to improve your score. Growth
              happens in the retries.
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
            >
              <span>Browse Scenarios</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Overview Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="glass-surface p-6 rounded-card border border-border shadow-xs">
          <p className="font-meta text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Completed Sessions
          </p>
          <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            {completedCount}
          </p>
        </div>

        <div className="glass-surface p-6 rounded-card border border-border shadow-xs">
          <p className="font-meta text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Scenarios Practiced
          </p>
          <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            {scenariosCount}
          </p>
        </div>

        <div className="glass-surface p-6 rounded-card border border-border shadow-xs">
          <p className="font-meta text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Total Rehearsals
          </p>
          <p className="font-display text-3xl sm:text-4xl font-bold text-primary">
            {items.length}
          </p>
        </div>
      </section>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-control border border-border bg-[#d4ff00]/20 p-4 font-meta text-xs text-[#171e00] shadow-xs">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="font-bold text-[#171e00] hover:opacity-75 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-card border-2 border-alert bg-alert/10 p-6 shadow-xs flex items-start justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-alert">
              Unable to load history
            </h2>
            <p className="font-sans text-xs sm:text-sm text-foreground/80 mt-1">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => reloadHistory()}
            className="shrink-0 rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:opacity-90 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 3. Search and Filters Toolbar */}
      <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80 glass-surface rounded-control border border-border">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenario history..."
            className="w-full bg-transparent border-none pl-10 pr-4 py-2.5 font-sans text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none rounded-control"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="glass-surface px-3 py-2 rounded-control font-meta text-xs bg-surface-subtle border border-border text-foreground focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="glass-surface px-3 py-2 rounded-control font-meta text-xs bg-surface-subtle border border-border text-foreground focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="ACTIVE">Active / In Progress</option>
            <option value="FAILED">Incomplete / Ended</option>
          </select>
        </div>
      </section>

      {/* 4. Loading Skeleton */}
      {loading && items.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="glass-surface rounded-card border border-border p-6 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-border/40 rounded" />
                <div className="h-4 w-16 bg-border/40 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-border/20 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="glass-surface rounded-card border border-border p-12 text-center shadow-[6px_6px_0px_0px_#1a1a1a]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl mb-4">
            💬
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
            {items.length === 0
              ? "No Practice History Yet"
              : "No Matching Sessions Found"}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
            {items.length === 0
              ? "Start a workplace conversation simulation to rehearse challenging dialogues and review structured AI coaching."
              : "Try adjusting your search query or difficulty filters to find specific rehearsal sessions."}
          </p>
          <div className="mt-6">
            <Link
              href="/app"
              className="inline-flex items-center rounded-control bg-primary px-5 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] brutalist-interactive"
            >
              Browse Scenarios
            </Link>
          </div>
        </div>
      )}

      {/* 6. History Items List */}
      {filteredItems.length > 0 && (
        <div className="space-y-5">
          {filteredItems.map((item) => {
            const statusInfo = formatStatus(item.status);
            const scoreBand =
              item.overallScore !== null
                ? getScoreBand(item.overallScore)
                : null;
            const isRetry = Boolean(item.retryOfAttemptId);
            const parentItem = item.retryOfAttemptId
              ? itemMap.get(item.retryOfAttemptId)
              : null;

            // Check if retry is comparable (same difficulty + both have scores)
            const isComparableRetry =
              isRetry &&
              parentItem &&
              parentItem.difficulty === item.difficulty &&
              parentItem.overallScore !== null &&
              item.overallScore !== null;

            const isCrossDifficultyRetry =
              isRetry &&
              parentItem &&
              parentItem.difficulty !== item.difficulty;

            const scoreDelta = isComparableRetry
              ? item.overallScore! - parentItem!.overallScore!
              : null;

            const isFailed = item.status === "EVALUATION_FAILED";
            const isAbandoned = item.status === "ABANDONED";
            const isActive = item.status === "ACTIVE";

            const displayDate = new Date(
              item.completedAt ?? item.startedAt,
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={item.attemptId}
                className={cn(
                  "glass-surface rounded-card p-6 md:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 transition-all",
                  isFailed && "border-l-4 border-l-[#ffb3b0] bg-[#ffb3b0]/5",
                  isRetry && !isFailed && "border-l-4 border-l-primary",
                )}
              >
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full border border-border font-meta text-[11px] font-bold uppercase tracking-wider bg-surface-subtle text-foreground">
                      {item.difficulty}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-meta text-[11px] font-bold border",
                        statusInfo.badgeClass,
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusInfo.dotClass,
                        )}
                      />
                      {statusInfo.label}
                    </span>

                    <span className="font-meta text-xs text-muted-foreground">
                      {displayDate}
                    </span>

                    {isRetry && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 font-meta text-[11px] font-bold uppercase tracking-wider">
                        <RefreshIcon className="w-3 h-3" />
                        <span>Retry</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
                    {item.scenario.title}
                  </h3>

                  {/* Retry relationship notes */}
                  {isComparableRetry && scoreDelta !== null && (
                    <div className="font-meta text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>Previous: {parentItem?.overallScore} pts</span>
                      <span>·</span>
                      <span
                        className={cn(
                          "font-bold",
                          scoreDelta > 0
                            ? "text-[#536600]"
                            : scoreDelta < 0
                              ? "text-[#ba1a1a]"
                              : "text-muted-foreground",
                        )}
                      >
                        ({formatDelta(scoreDelta).text} pts vs previous attempt)
                      </span>
                    </div>
                  )}

                  {isCrossDifficultyRetry && (
                    <p className="font-meta text-[11px] text-amber-800">
                      Cross-difficulty retry ({parentItem?.difficulty} →{" "}
                      {item.difficulty}) · Non-equivalent comparison
                    </p>
                  )}

                  {isFailed && (
                    <p className="font-sans text-xs text-muted-foreground">
                      The automated evaluation was incomplete. Your conversation
                      transcript is safely preserved.
                    </p>
                  )}

                  {isAbandoned && (
                    <p className="font-sans text-xs text-muted-foreground">
                      The simulation ended before conversation turns were
                      exchanged.
                    </p>
                  )}
                </div>

                {/* Right Actions & Score */}
                <div className="flex flex-wrap items-center gap-4 self-end md:self-center">
                  {/* Score Pill if completed and score is valid */}
                  {!isFailed &&
                    !isAbandoned &&
                    scoreBand &&
                    item.overallScore !== null && (
                      <div className="text-right pr-2">
                        <div className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
                          Overall Score
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={cn(
                              "font-display text-2xl sm:text-3xl font-bold text-primary",
                            )}
                          >
                            {item.overallScore}
                          </span>
                          <span className="font-meta text-xs text-muted-foreground">
                            / 100
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Action Navigation */}
                  {isActive ? (
                    <Link
                      href={`/app/simulations/${encodeURIComponent(item.attemptId)}`}
                      className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-2xs brutalist-interactive"
                    >
                      <span>Resume</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/app/results/${encodeURIComponent(item.attemptId)}`}
                      className="inline-flex items-center gap-1.5 rounded-control bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground border border-border shadow-2xs brutalist-interactive hover:bg-surface-subtle"
                    >
                      <span>{isFailed ? "View & Retry" : "View Results"}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    title="Delete Rehearsal Session"
                    className="inline-flex items-center justify-center rounded-control border border-border bg-surface-solid p-2 text-muted-foreground hover:text-alert hover:border-alert brutalist-interactive cursor-pointer"
                    aria-label="Delete rehearsal session"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Load More History Button */}
          {nextCursor && (
            <div className="pt-6 text-center">
              <button
                type="button"
                onClick={() => loadMoreHistory(nextCursor)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-control border border-border bg-surface-solid px-6 py-2.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground shadow-xs brutalist-interactive cursor-pointer disabled:opacity-50"
              >
                <RefreshIcon
                  className={cn("w-3.5 h-3.5", loadingMore && "animate-spin")}
                />
                <span>{loadingMore ? "Loading..." : "Load Older Sessions"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      <AccessibleDialog
        open={deletingItem !== null}
        title="Delete practice session?"
        description="This permanently deletes this rehearsal attempt, its conversation messages, and evaluation data. Later retry sessions remain preserved."
        onClose={() => {
          if (!deleteLoading) {
            setDeletingItem(null);
            setDeleteError(null);
          }
        }}
      >
        {deletingItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-control bg-alert/10 text-alert border border-alert/20 text-lg">
                <AlertTriangleIcon className="w-6 h-6" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  {deletingItem.scenario.title}
                </p>
                <p className="font-meta text-xs text-muted-foreground">
                  {deletingItem.difficulty} Difficulty · Status:{" "}
                  {deletingItem.status}
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                role="alert"
                className="rounded-control border border-alert/30 bg-alert/10 p-3 font-sans text-xs text-alert"
              >
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
                className="rounded-control border border-border bg-surface-solid px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-subtle disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        )}
      </AccessibleDialog>
    </div>
  );
}
