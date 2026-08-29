"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  AttemptDetailResponse,
  ConversationTurn,
} from "@kalemny/contracts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiClientError, createApiClient } from "../../../../lib/api-client";

export default function SimulationPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [attempt, setAttempt] = useState<AttemptDetailResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composerText, setComposerText] = useState("");
  const [sendingTurn, setSendingTurn] = useState(false);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const data = await client.fetchAttempt(token, attemptId);
        if (!isMounted) return;
        setAttempt(data);

        if (
          data.status === "COMPLETED" ||
          data.status === "EVALUATING" ||
          data.status === "EVALUATION_FAILED"
        ) {
          router.push(`/app/results/${encodeURIComponent(attemptId)}`);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
          setError("Simulation attempt not found.");
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load simulation attempt.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadAttempt();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, getToken, attemptId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [attempt?.turns, sendingTurn]);

  const handleSendTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = composerText.trim();
    if (!trimmed || sendingTurn || finishing) return;

    try {
      setSendingTurn(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const clientRequestId = crypto.randomUUID();
      const newTurn = await client.createTurn(token, attemptId, {
        clientRequestId,
        text: trimmed,
        inputMethod: "TEXT",
      });

      setComposerText("");
      setAttempt((prev) => {
        if (!prev) return prev;
        const exists = prev.turns.some((t) => t.id === newTurn.id);
        const updatedTurns = exists
          ? prev.turns.map((t) => (t.id === newTurn.id ? newTurn : t))
          : [...prev.turns, newTurn];
        return {
          ...prev,
          turns: updatedTurns,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
      const token = await getToken();
      if (token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const data = await client
          .fetchAttempt(token, attemptId)
          .catch(() => null);
        if (data) setAttempt(data);
      }
    } finally {
      setSendingTurn(false);
    }
  };

  const handleRetryTurn = async (turnId: string) => {
    if (retryingTurnId || finishing) return;
    try {
      setRetryingTurnId(turnId);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const updatedTurn = await client.retryTurn(token, attemptId, turnId);
      setAttempt((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          turns: prev.turns.map((t) => (t.id === turnId ? updatedTurn : t)),
        };
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to retry counterpart reply.",
      );
    } finally {
      setRetryingTurnId(null);
    }
  };

  const handleFinish = async () => {
    if (finishing || sendingTurn) return;

    const turnCount = attempt?.turns.length ?? 0;
    if (turnCount === 0) {
      const confirmed = window.confirm(
        "You haven't sent any messages yet. Finishing now will abandon this simulation without an evaluation. End session?",
      );
      if (!confirmed) return;
    }

    try {
      setFinishing(true);
      setError(null);
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const client = createApiClient(apiUrl);

      const result = await client.finishAttempt(token, attemptId);

      if (result.status === "ABANDONED") {
        router.push("/app");
      } else {
        router.push(`/app/results/${encodeURIComponent(attemptId)}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to finish simulation.",
      );
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
        <p className="mt-3 text-sm text-slate-500">
          Entering simulation workspace...
        </p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-bold">Unable to Load Simulation</h2>
          <p className="mt-1 text-sm">{error}</p>
          <div className="mt-4">
            <Link
              href="/app"
              className="inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50"
            >
              Back to Scenarios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 rounded-t-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {attempt.scenario.title}
              </h1>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {attempt.difficulty}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Turn {attempt.turns.length} of 20 • English
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing || sendingTurn}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {finishing ? "Finishing..." : "Finish Simulation"}
          </button>
        </div>
      </div>

      {/* Error notification banner if any */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto bg-slate-100/60 p-4 sm:p-6 space-y-4">
        {attempt.turns.length === 0 && !sendingTurn && (
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Simulation Active
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Start the conversation by typing your response below. Your
              counterpart will respond dynamically.
            </p>
          </div>
        )}

        {attempt.turns.map((turn: ConversationTurn) => (
          <div key={turn.id} className="space-y-4">
            {/* User Message */}
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-2xl rounded-tr-xs bg-indigo-600 px-4 py-3 text-white shadow-xs">
                <div className="flex items-center justify-between gap-2 text-[10px] text-indigo-200 mb-1">
                  <span>You (Turn #{turn.sequence})</span>
                  <span>
                    {new Date(turn.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {turn.userText}
                </p>
              </div>
            </div>

            {/* AI Response or Error */}
            {turn.status === "COMPLETED" && turn.assistantText && (
              <div className="flex justify-start">
                <div className="max-w-[82%] rounded-2xl rounded-tl-xs border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-xs">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">
                      Counterpart
                    </span>
                    {turn.completedAt && (
                      <span>
                        {new Date(turn.completedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {turn.assistantText}
                  </p>
                </div>
              </div>
            )}

            {turn.status === "FAILED" && (
              <div className="flex justify-start">
                <div className="max-w-[82%] rounded-2xl rounded-tl-xs border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 shadow-xs">
                  <p className="text-xs font-semibold text-rose-800">
                    Failed to receive counterpart reply.
                  </p>
                  <p className="mt-1 text-xs text-rose-700">
                    Your message was safely recorded. Click below to retry the
                    counterpart response.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRetryTurn(turn.id)}
                    disabled={retryingTurnId === turn.id}
                    className="mt-2.5 inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50"
                  >
                    {retryingTurnId === turn.id ? "Retrying..." : "Retry Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Sending indicator */}
        {sendingTurn && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-xs">
              <span className="h-2 w-2 animate-ping rounded-full bg-indigo-600" />
              <span className="text-xs font-medium text-slate-500">
                Counterpart is formulating a response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="border-t border-slate-200 bg-white p-4 rounded-b-2xl shadow-xs">
        <form onSubmit={handleSendTurn} className="space-y-2">
          <div className="relative">
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendTurn();
                }
              }}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              rows={3}
              disabled={sendingTurn || finishing}
              className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-50 disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {composerText.length} / 60,000 characters
            </span>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!composerText.trim() || sendingTurn || finishing}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                {sendingTurn ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent mr-1.5" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
