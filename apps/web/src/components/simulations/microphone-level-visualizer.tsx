"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

const BAR_MULTIPLIERS = [0.55, 0.85, 1, 0.85, 0.55];

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function MicrophoneLevelVisualizer({ level }: { level: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className="flex items-center gap-2 text-primary" role="status">
        <span
          className="h-2.5 w-2.5 rounded-full bg-primary"
          aria-hidden="true"
        />
        <span className="font-meta text-[10px] font-bold uppercase tracking-widest">
          Listening
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex h-10 items-center justify-center gap-1.5 sm:h-12"
      role="status"
      aria-label="Microphone level"
    >
      {BAR_MULTIPLIERS.map((multiplier, index) => (
        <span
          key={`${multiplier}-${index}`}
          className={cn(
            "w-1.5 rounded-full bg-primary transition-[height] duration-75 sm:w-2",
            level > 0.03 ? "opacity-100" : "opacity-35",
          )}
          style={{ height: `${Math.max(16, level * multiplier * 100)}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
