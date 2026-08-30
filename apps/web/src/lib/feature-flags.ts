/**
 * Client-side feature flags. These gate UI only — no secrets may ever live
 * here or in any `NEXT_PUBLIC_*` variable.
 */

/**
 * Feature-flagged ElevenLabs live conversation spike. Enabled explicitly via
 * `NEXT_PUBLIC_ENABLE_REALTIME_VOICE=true`; the backend must also have its
 * optional `ELEVENLABS_*` settings configured for the endpoints to exist.
 */
export function isRealtimeVoiceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REALTIME_VOICE === "true";
}
