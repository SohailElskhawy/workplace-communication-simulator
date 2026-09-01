import type { InteractionMode } from "@kalemny/contracts";

export type { InteractionMode };

export interface ResolveInteractionModeInput {
  /** Interaction mode persisted on the attempt at creation. */
  persistedMode: InteractionMode;
  /** Whether the current build exposes the realtime voice feature flag. */
  realtimeVoiceEnabled: boolean;
}

/**
 * Resolves the interaction mode a simulation screen may actually initialize.
 *
 * The mode is chosen once at simulation start and persisted on the attempt.
 * A persisted `REALTIME` attempt falls back to push-to-talk when the realtime
 * feature flag is disabled in the current build, so an attempt is never
 * stranded without any voice path. Push-to-talk remains the Release 1
 * default and the text fallback is always available in either mode.
 */
export function resolveEffectiveInteractionMode({
  persistedMode,
  realtimeVoiceEnabled,
}: ResolveInteractionModeInput): InteractionMode {
  if (persistedMode === "REALTIME" && realtimeVoiceEnabled) {
    return "REALTIME";
  }
  return "PUSH_TO_TALK";
}
