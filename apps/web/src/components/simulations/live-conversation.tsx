"use client";

import { useAuth } from "@clerk/nextjs";
import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
  useRawConversation,
  type DisconnectionDetails,
  type Status,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CloseIcon,
  MicIcon,
  RefreshIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import { createApiClient } from "@/lib/api-client";
import {
  appendLiveTranscriptEntry,
  isLiveConversationActive,
  resolveLiveConversationUiState,
  type LiveConversationUiState,
  type LiveTranscriptEntry,
} from "@/lib/live-conversation-state";

export type { LiveConversationUiState };
export type { LiveTranscriptEntry };

export interface LiveConversationProps {
  attemptId: string;
  /**
   * True when the attempt cannot start a live session (text turn in flight,
   * counterpart TTS playing, expired, turn limit reached, or finishing).
   * While a session is active, becoming disabled ends it cleanly.
   */
  startDisabled: boolean;
  /** Notifies the page whether a live session is starting or connected. */
  onActiveChange: (active: boolean) => void;
  /** Blocks Finish until the SDK-created ID has been durably bound. */
  onBindingPendingChange: (pending: boolean) => void;
  /** Notifies the page of the live UI state for the shared conversation orb. */
  onUiStateChange: (state: LiveConversationUiState) => void;
  /** Live microphone level (0–1) while connected, for the shared orb visual. */
  onMicrophoneLevelChange: (level: number) => void;
  /**
   * Notifies the page of the ephemeral live transcript (finalized
   * `user_transcript` / `agent_response` events). Never persisted.
   */
  onTranscriptChange: (entries: LiveTranscriptEntry[]) => void;
}

/**
 * Privacy-safe diagnostics for the realtime spike (development builds only).
 * Logs connection lifecycle metadata — status, SDK error message, disconnect
 * reason — and never transcripts, tokens, prompts, or audio. Long strings are
 * truncated so provider error text cannot flood the console.
 */
function logLiveConversationEvent(
  event: string,
  details: Record<string, unknown> = {},
  level: "info" | "warn" = "info",
): void {
  if (process.env.NODE_ENV !== "development") return;
  const payload = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      typeof value === "string" && value.length > 200
        ? `${value.slice(0, 200)}…`
        : value,
    ]),
  );
  (level === "warn" ? console.warn : console.info)(
    `[live-conversation] ${event}`,
    payload,
  );
}

/**
 * Feature-flagged ElevenLabs realtime spike for the simulation screen.
 *
 * Wraps the control in the SDK `ConversationProvider` and uses the granular
 * hooks (`useConversationControls`, `useConversationStatus`,
 * `useConversationMode`, `useConversationInput`). Starting a session:
 *
 * 1. requests microphone permission;
 * 2. calls `POST /api/v1/attempts/:attemptId/realtime-session`;
 * 3. starts ElevenLabs WebRTC with the returned `conversationToken`;
 * 4. passes only the public dynamic variables `opening_message` and
 *    `secret__kalemny_context_token` — never persona, objective, variation,
 *    or difficulty internals, which stay behind the tool-protected endpoint.
 *
 * Ending a session: every end request (End/Cancel buttons, page-disabled
 * effect) converges on one guarded `requestEnd()` that awaits the underlying
 * conversation's `endSession()` promise. The SDK `onDisconnect` callback is
 * the authoritative cleanup point, and the `ConversationProvider` stays
 * mounted until ElevenLabs reports the disconnect.
 *
 * Presentation-only: the live transcript is ephemeral in-memory state that is
 * never persisted; no ConversationTurn, no changes to evaluation, scoring, or
 * the text/push-to-talk flow.
 */
export function LiveConversation(props: LiveConversationProps) {
  return <LiveConversationContainer {...props} />;
}

/**
 * Holds session-lifecycle state above the provider so the SDK's own status,
 * error, disconnect, and message events drive it (event-driven, no
 * state-syncing effects).
 */
function LiveConversationContainer({
  onTranscriptChange,
  ...props
}: LiveConversationProps) {
  const [awaitingStart, setAwaitingStart] = useState(false);
  const clearAwaitingStart = useCallback(() => setAwaitingStart(false), []);

  /**
   * True while an end request is in flight. Shared with the session below so
   * the guarded end request and the SDK `onDisconnect` callback (the
   * authoritative cleanup point) agree on the lifecycle.
   */
  const endingRef = useRef(false);

  /** Ephemeral transcript of the current live session. Never persisted. */
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptEntry[]>(
    [],
  );

  const handleStatusChange = useCallback(
    (event: { status: Status }) => {
      logLiveConversationEvent("status change", { status: event.status });
      clearAwaitingStart();
    },
    [clearAwaitingStart],
  );

  const handleError = useCallback(
    (errorMessage: string) => {
      // Surfaced to the learner through useConversationStatus below; logged
      // here for diagnosis. Never swallowed.
      logLiveConversationEvent("sdk error", { message: errorMessage }, "warn");
      clearAwaitingStart();
    },
    [clearAwaitingStart],
  );

  /**
   * Authoritative cleanup point: the SDK fires this when the conversation has
   * disconnected, on every path (user end, agent hangup, error). Releases the
   * end-in-flight guard; start-in-flight state is already cleared by the
   * status/error events that always precede a disconnect.
   */
  const handleDisconnect = useCallback((details: DisconnectionDetails) => {
    logLiveConversationEvent("disconnected", {
      reason: details.reason,
      ...(details.reason === "user" ? {} : { closeCode: details.closeCode }),
      ...(details.reason === "error" ? { message: details.message } : {}),
    });
    endingRef.current = false;
  }, []);

  /**
   * Finalized transcript events only (`user_transcript` and
   * `agent_response`); tentative/partial events arrive on other callbacks
   * and are ignored here.
   */
  const handleLiveMessage = useCallback(
    (payload: {
      source: "user" | "ai";
      message: string;
      event_id?: number;
    }) => {
      setLiveTranscript((previous) =>
        appendLiveTranscriptEntry(previous, payload),
      );
    },
    [],
  );

  const clearLiveTranscript = useCallback(() => setLiveTranscript([]), []);

  // Share the ephemeral transcript with the page (same notification pattern
  // as the UI state below).
  useEffect(() => {
    onTranscriptChange(liveTranscript);
  }, [liveTranscript, onTranscriptChange]);

  return (
    <ConversationProvider
      onStatusChange={handleStatusChange}
      onError={handleError}
      onDisconnect={handleDisconnect}
      onMessage={handleLiveMessage}
    >
      <LiveConversationSession
        {...props}
        awaitingStart={awaitingStart}
        onAwaitingStartChange={setAwaitingStart}
        endingRef={endingRef}
        onClearLiveTranscript={clearLiveTranscript}
      />
    </ConversationProvider>
  );
}

function LiveConversationSession({
  attemptId,
  startDisabled,
  onActiveChange,
  onBindingPendingChange,
  onUiStateChange,
  onMicrophoneLevelChange,
  awaitingStart,
  onAwaitingStartChange,
  endingRef,
  onClearLiveTranscript,
}: Omit<LiveConversationProps, "onTranscriptChange"> & {
  awaitingStart: boolean;
  onAwaitingStartChange: (awaiting: boolean) => void;
  endingRef: React.RefObject<boolean>;
  onClearLiveTranscript: () => void;
}) {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const { startSession, endSession, getInputVolume } =
    useConversationControls();
  const { status, message } = useConversationStatus();
  const { mode } = useConversationMode();
  const { isMuted, setMuted } = useConversationInput();
  /** Underlying SDK conversation; null while connecting or disconnected. */
  const conversation = useRawConversation();

  /** Error from the permission prompt or the realtime-session request. */
  const [requestError, setRequestError] = useState<string | null>(null);
  /** Cancelled starts never call startSession and reset their own state. */
  const cancelledRef = useRef(false);

  // The bridge only applies while the SDK still reports no session status
  // and the page has not disabled live mode; afterwards SDK status and page
  // state drive the UI directly.
  const awaitingConnection =
    awaitingStart && !startDisabled && status === "disconnected";

  const uiState = resolveLiveConversationUiState({
    sdkStatus: status,
    sdkMode: mode,
    awaitingConnection,
  });
  const isActive = isLiveConversationActive(uiState);
  const isConnected = uiState === "listening" || uiState === "speaking";

  // Share the live state with the page (orb + composer gating).
  useEffect(() => {
    onUiStateChange(uiState);
  }, [onUiStateChange, uiState]);

  useEffect(() => {
    onActiveChange(isActive);
  }, [isActive, onActiveChange]);

  /**
   * The single guarded end path. Every end request — the End/Cancel buttons
   * and the page-disabled effect below — converges here, so a session can
   * never be ended twice and the app waits for ElevenLabs to disconnect
   * instead of treating the end click as synchronous.
   *
   * With a live conversation instance, the underlying `endSession()` promise
   * is awaited: it resolves only after the client teardown completes and the
   * SDK has fired `onDisconnect`. Without one (start still pending or session
   * already gone), the SDK `endSession()` handles the pending-start lock.
   */
  const requestEnd = useCallback(async () => {
    if (endingRef.current) return;
    if (conversation) {
      endingRef.current = true;
      try {
        await conversation.endSession();
      } catch (error) {
        // The SDK fires onDisconnect even when teardown throws, so state
        // stays consistent; the error itself is logged, never swallowed.
        logLiveConversationEvent(
          "end session failed",
          { message: error instanceof Error ? error.message : String(error) },
          "warn",
        );
      } finally {
        endingRef.current = false;
      }
    } else {
      endingRef.current = true;
      endSession();
      // Released by the SDK onDisconnect callback; a failed pending start
      // reports onError instead, and the next start resets the lifecycle.
    }
  }, [conversation, endSession, endingRef]);

  // End cleanly whenever the page disables live mode (finish dialog, expiry,
  // turn limit). Unmount is covered by the provider's own cleanup. Any
  // in-flight start observes the cancellation at its next checkpoint.
  useEffect(() => {
    if (startDisabled && isActive) {
      cancelledRef.current = true;
      void requestEnd();
    }
  }, [isActive, requestEnd, startDisabled]);

  // Feed the shared conversation orb with the live microphone level while
  // connected. Read-only sampling of the SDK session; no extra stream.
  useEffect(() => {
    if (status !== "connected") {
      onMicrophoneLevelChange(0);
      return;
    }
    let cancelled = false;
    let frame: number | null = null;
    const tick = () => {
      if (cancelled) return;
      onMicrophoneLevelChange(getInputVolume());
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      onMicrophoneLevelChange(0);
    };
  }, [getInputVolume, onMicrophoneLevelChange, status]);

  const handleStart = useCallback(async () => {
    if (startDisabled) return;
    cancelledRef.current = false;
    // A new session begins: reset the end-in-flight guard and start from an
    // empty ephemeral transcript.
    endingRef.current = false;
    onClearLiveTranscript();
    setRequestError(null);
    onAwaitingStartChange(true);
    try {
      // 1. Microphone permission first, so a denied grant fails before any
      // network call. Tracks stop immediately; the SDK opens its own stream.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      for (const track of stream.getTracks()) track.stop();
      if (cancelledRef.current) {
        onAwaitingStartChange(false);
        return;
      }

      // 2. Server-issued short-lived tokens (ownership + ACTIVE validated).
      const authToken = await getToken();
      if (!authToken) throw new Error("Authentication token not available.");
      const session = await createApiClient(apiUrl).createRealtimeSession(
        authToken,
        attemptId,
      );
      if (cancelledRef.current) {
        onAwaitingStartChange(false);
        return;
      }

      // 3. Start WebRTC. The conversation token encodes the agent; only the
      // public dynamic variables cross the browser boundary.
      startSession({
        conversationToken: session.conversationToken,
        dynamicVariables: {
          opening_message: session.openingMessage,
          secret__kalemny_context_token: session.contextToken,
        },
        // The installed React SDK exposes the provider-created conversation
        // through this callback (its hook `startSession` is typed `void`).
        // Bind its authoritative ID immediately; no browser identity or
        // scenario data is included in this request.
        onConversationCreated: (createdConversation) => {
          const conversationId = createdConversation.getId();
          onBindingPendingChange(true);
          void createApiClient(apiUrl)
            .bindRealtimeConversation(authToken, attemptId, conversationId)
            .catch((error: unknown) => {
              void createdConversation.endSession();
              setRequestError(
                error instanceof Error
                  ? error.message
                  : "Failed to secure the live conversation.",
              );
            })
            .finally(() => onBindingPendingChange(false));
        },
      });
    } catch (error) {
      onAwaitingStartChange(false);
      if (!cancelledRef.current) {
        setRequestError(
          error instanceof Error
            ? error.message
            : "Failed to start the live conversation.",
        );
      }
    }
  }, [
    apiUrl,
    attemptId,
    endingRef,
    getToken,
    onAwaitingStartChange,
    onBindingPendingChange,
    onClearLiveTranscript,
    startDisabled,
    startSession,
  ]);

  const handleEnd = useCallback(() => {
    cancelledRef.current = true;
    onAwaitingStartChange(false);
    setRequestError(null);
    void requestEnd();
  }, [onAwaitingStartChange, requestEnd]);

  const handleToggleMute = useCallback(() => {
    try {
      setMuted(!isMuted);
    } catch {
      // The session dropped between render and click; the SDK status already
      // reflects the disconnect, so nothing else to do here.
    }
  }, [isMuted, setMuted]);

  const liveErrorMessage =
    uiState === "error"
      ? (message ?? "The live conversation ended unexpectedly.")
      : requestError;

  return (
    <section
      aria-label="Live conversation"
      className="shrink-0 border-t border-border/20 bg-surface-solid px-3 pt-2.5 sm:px-5"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 pb-2.5">
        {/* Error banner (request failure or SDK session error) */}
        {liveErrorMessage && (
          <div
            role="alert"
            className="rounded-control border border-alert/40 bg-alert/10 p-2 sm:p-2.5 font-sans text-xs text-alert flex items-center justify-between gap-2"
          >
            <span className="truncate">{liveErrorMessage}</span>
            {uiState !== "error" && (
              <button
                type="button"
                onClick={() => setRequestError(null)}
                className="p-1 rounded-control hover:bg-alert/20 cursor-pointer shrink-0"
                aria-label="Dismiss live conversation error"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {uiState === "disconnected" && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                Live conversation
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Talk with your counterpart in real time. Experimental.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={startDisabled}
              className="inline-flex shrink-0 items-center gap-2 rounded-control border-2 border-border bg-primary px-3.5 py-2 font-meta text-[11px] font-bold uppercase tracking-wider text-primary-foreground brutalist-shadow-sm cursor-pointer hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Start live conversation"
            >
              <MicIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Start
            </button>
          </div>
        )}

        {uiState === "connecting" && (
          <div className="rounded-control border border-primary/30 bg-primary/5 p-2.5 sm:p-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 text-primary min-w-0">
              <RefreshIcon className="w-4 h-4 animate-spin shrink-0" />
              <span className="font-meta text-xs font-semibold truncate">
                Connecting to your counterpart…
              </span>
            </div>
            <button
              type="button"
              onClick={handleEnd}
              className="shrink-0 px-2.5 py-1 rounded-control border border-border bg-surface-solid font-meta text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {isConnected && (
          <div
            className="rounded-control border-2 border-primary/40 bg-primary/5 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            aria-live="polite"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-xs uppercase tracking-wider text-primary">
                  {uiState === "speaking"
                    ? "Counterpart speaking…"
                    : "Listening — speak naturally"}
                </span>
                <span className="font-meta text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  Live voice session · finalized after the call
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleToggleMute}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control border border-border bg-surface-solid font-meta text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                aria-pressed={isMuted}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? (
                  <VolumeMuteIcon className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <VolumeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={handleEnd}
                className="px-3 py-1 rounded-control bg-alert text-white font-meta text-xs font-bold uppercase tracking-wider cursor-pointer brutalist-shadow-sm"
                aria-label="End live conversation"
              >
                End
              </button>
            </div>
          </div>
        )}

        {uiState === "error" && (
          <div className="flex items-center justify-between gap-3">
            <p className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Live conversation
            </p>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={startDisabled}
              className="inline-flex shrink-0 items-center gap-2 rounded-control border-2 border-border bg-surface-solid px-3.5 py-2 font-meta text-[11px] font-bold uppercase tracking-wider text-foreground brutalist-shadow-sm cursor-pointer hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Retry live conversation"
            >
              <MicIcon
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
