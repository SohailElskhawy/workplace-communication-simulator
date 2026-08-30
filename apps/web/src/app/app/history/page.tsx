"use client";

import { useAuth } from "@clerk/nextjs";
import type { Difficulty, HistoryItem } from "@kalemny/contracts";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HistoryItemCard } from "@/components/history/history-item-card";
import {
  ArrowRightIcon,
  RefreshIcon,
  SearchIcon,
} from "@/components/icons";
import { DeleteAttemptDialog } from "@/components/results/delete-attempt-dialog";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";

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
      <header className="relative space-y-4 max-w-4xl">
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
              back into challenging scenarios to improve your score.
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
      </header>

      {/* 2. Overview Metrics Cards */}
      <section aria-label="History overview metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
            aria-label="Dismiss success notification"
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
            onClick={() => void reloadHistory()}
            className="shrink-0 rounded-control bg-alert px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:opacity-90 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 3. Search and Filters Toolbar */}
      <section aria-label="History search and filter controls" className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80 glass-surface rounded-control border border-border">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            id="history-search-input"
            aria-label="Search scenario history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenario history..."
            className="w-full bg-transparent border-none pl-10 pr-4 py-2.5 font-sans text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none rounded-control"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            id="history-difficulty-filter"
            aria-label="Filter by difficulty"
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
            id="history-status-filter"
            aria-label="Filter by simulation status"
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
        <div className="space-y-4" role="status" aria-busy="true">
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
          {filteredItems.map((item) => (
            <HistoryItemCard
              key={item.attemptId}
              item={item}
              parentItem={item.retryOfAttemptId ? itemMap.get(item.retryOfAttemptId) ?? null : null}
              onOpenDelete={setDeletingItem}
            />
          ))}

          {/* Load More History Button */}
          {nextCursor && (
            <div className="pt-6 text-center">
              <button
                type="button"
                onClick={() => void loadMoreHistory(nextCursor)}
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
      {deletingItem && (
        <DeleteAttemptDialog
          open={deletingItem !== null}
          scenarioTitle={deletingItem.scenario.title}
          difficulty={deletingItem.difficulty}
          status={deletingItem.status}
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) {
              setDeletingItem(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
