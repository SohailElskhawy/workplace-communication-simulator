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
