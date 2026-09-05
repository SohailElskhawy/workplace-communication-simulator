/**
 * Client-side feature flags. These gate UI only — no secrets may ever live
 * here or in any `NEXT_PUBLIC_*` variable.
 */

/**
 * @deprecated Realtime voice mode has been removed in favor of in-house neural voice.
 * Always returns false.
 */
export function isRealtimeVoiceEnabled(): boolean {
  return false;
}

