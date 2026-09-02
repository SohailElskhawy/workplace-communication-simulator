"use client";

import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export type SimulationUiState =
  | "YOUR_TURN"
  | "LISTENING"
  | "TRANSCRIBING"
  | "REVIEWING"
  | "AI_THINKING"
  | "AI_SPEAKING";

/**
 * Core animation per conversation state. All keyframes live in globals.css
 * and are disabled globally under `prefers-reduced-motion: reduce`.
 */
const coreAnimation: Record<SimulationUiState, string> = {
  YOUR_TURN: "animate-[orb-breathe_4.5s_ease-in-out_infinite]",
  LISTENING: "", // driven by the live microphone level instead
  TRANSCRIBING: "animate-[orb-process_1.6s_ease-in-out_infinite]",
  REVIEWING: "", // intentionally static
  AI_THINKING: "animate-[orb-morph_7s_linear_infinite]",
  AI_SPEAKING: "animate-[orb-speak_1.1s_ease-in-out_infinite]",
};

export interface ConversationOrbProps {
  uiState: SimulationUiState;
  /** Live microphone level (0–1); only used while LISTENING. */
  microphoneLevel?: number;
  className?: string;
}

/**
 * Central animated orb reflecting the conversation state.
 * Decorative only: state is always announced through adjacent text.
 */
export function ConversationOrb({
  uiState,
  microphoneLevel = 0,
  className,
}: ConversationOrbProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const isListening = uiState === "LISTENING";
  const isSpeaking = uiState === "AI_SPEAKING";
  const showRipples = isSpeaking && !prefersReducedMotion;

  const clampedLevel = Math.min(1, Math.max(0, microphoneLevel));
  const listenScale =
    isListening && !prefersReducedMotion ? 1 + clampedLevel * 0.22 : 1;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      aria-hidden="true"
    >
      {/* Outer ripple rings while the counterpart speaks */}
      {showRipples && (
        <>
          <span className="absolute inset-0 rounded-full border-2 border-primary/60 animate-[orb-ripple_2.4s_ease-out_0s_infinite]" />
          <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-[orb-ripple_2.4s_ease-out_0.8s_infinite]" />
          <span className="absolute inset-0 rounded-full border-2 border-primary/25 animate-[orb-ripple_2.4s_ease-out_1.6s_infinite]" />
        </>
      )}

      {/* Soft halo behind the core */}
      <span className="absolute inset-2 rounded-full bg-primary/15 blur-md" />

      {/* Microphone-reactive wrapper (LISTENING only) */}
      <span
        className="relative block h-full w-full transition-transform duration-100 ease-out"
        style={
          listenScale !== 1 ? { transform: `scale(${listenScale})` } : undefined
        }
      >
        <span
          className={cn(
            "block h-full w-full rounded-full border-2 border-border bg-linear-to-br from-primary to-[#003ecc] shadow-brutal-sm",
            coreAnimation[uiState],
          )}
        >
          {/* Highlight sheen */}
          <span className="block h-[36%] w-[36%] translate-x-[20%] translate-y-[16%] rounded-full bg-white/35 blur-[2px]" />
        </span>
      </span>
    </div>
  );
}
