/**
 * Pure UI-state mapping for the feature-flagged ElevenLabs live conversation
 * spike. Kept free of React and SDK imports so it is trivially testable.
 *
 * The live conversation is a presentation-only addition: it never persists
 * transcripts, creates ConversationTurns, or touches evaluation/scoring.
 */

/** SDK connection status reported by `useConversationStatus`. */
export type LiveConversationSdkStatus =
  "disconnected" | "connecting" | "connected" | "error";

/** SDK counterpart mode reported by `useConversationMode`. */
export type LiveConversationSdkMode = "speaking" | "listening";

/**
 * UI states exposed by the live conversation control.
 * `disconnected` covers both "never started" and "ended cleanly".
 */
export type LiveConversationUiState =
  "disconnected" | "connecting" | "listening" | "speaking" | "error";

export interface ResolveLiveConversationUiStateInput {
  sdkStatus: LiveConversationSdkStatus;
  sdkMode: LiveConversationSdkMode;
  /**
   * True between the learner pressing start and the SDK emitting its first
   * non-disconnected status (permission prompt, token request, WebRTC setup).
   */
  awaitingConnection: boolean;
}

/**
 * Resolves the live conversation UI state. `awaitingConnection` wins so the
 * learner immediately sees "connecting" instead of a stale idle/error state.
 */
export function resolveLiveConversationUiState({
  sdkStatus,
  sdkMode,
  awaitingConnection,
}: ResolveLiveConversationUiStateInput): LiveConversationUiState {
  if (awaitingConnection) return "connecting";
  if (sdkStatus === "error") return "error";
  if (sdkStatus === "connecting") return "connecting";
  if (sdkStatus === "connected") {
    return sdkMode === "speaking" ? "speaking" : "listening";
  }
  return "disconnected";
}

/**
 * True while a live session is starting or connected. The page uses this to
 * gate the text/push-to-talk composer so the two input paths never overlap.
 */
export function isLiveConversationActive(
  state: LiveConversationUiState,
): boolean {
  return (
    state === "connecting" || state === "listening" || state === "speaking"
  );
}

/**
 * Minimal structural shape of the finalized transcript events the ElevenLabs
 * SDK delivers through its `onMessage` callback (`user_transcript` and
 * `agent_response`). Kept structural so the pure helper stays free of SDK
 * imports and the SDK payload assigns to it directly.
 */
export interface LiveTranscriptInput {
  /** `"user"` for finalized `user_transcript`, `"ai"` for `agent_response`. */
  source: "user" | "ai";
  message: string;
  /** SDK event id; unique per role stream when present. */
  event_id?: number;
}

/** One finalized utterance in the ephemeral live transcript. */
export interface LiveTranscriptEntry {
  id: string;
  role: "user" | "agent";
  text: string;
}

/**
 * Upper bound for the ephemeral live transcript. The transcript is never
 * persisted, but a runaway session should not grow memory without limit.
 */
export const LIVE_TRANSCRIPT_MAX_ENTRIES = 200;

/**
 * Appends one finalized SDK transcript event to the ephemeral live
 * transcript. Pure and defensive:
 *
 * - ignores empty/whitespace messages;
 * - dedupes by `role + event_id` (the SDK can redeliver an event, and user
 *   and agent id streams are independent so the role is part of the key);
 * - drops a same-role repeat of the previous text when no event id exists;
 * - caps the list at {@link LIVE_TRANSCRIPT_MAX_ENTRIES}, dropping oldest.
 */
export function appendLiveTranscriptEntry(
  existing: readonly LiveTranscriptEntry[],
  payload: LiveTranscriptInput,
): LiveTranscriptEntry[] {
  const text = payload.message.trim();
  if (!text) return [...existing];

  const role: LiveTranscriptEntry["role"] =
    payload.source === "user" ? "user" : "agent";

  if (payload.event_id !== undefined) {
    const duplicate = existing.some(
      (entry) => entry.role === role && entry.id === `${role}:${payload.event_id}`,
    );
    if (duplicate) return [...existing];
  } else {
    const previous = existing[existing.length - 1];
    if (previous && previous.role === role && previous.text === text) {
      return [...existing];
    }
  }

  const entry: LiveTranscriptEntry = {
    id:
      payload.event_id !== undefined
        ? `${role}:${payload.event_id}`
        : `${role}:${existing.length}:${text.slice(0, 32)}`,
    role,
    text,
  };
  const next = [...existing, entry];
  return next.length > LIVE_TRANSCRIPT_MAX_ENTRIES
    ? next.slice(next.length - LIVE_TRANSCRIPT_MAX_ENTRIES)
    : next;
}
