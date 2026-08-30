"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { RefreshIcon, VolumeIcon } from "@/components/icons";
import { createApiClient } from "@/lib/api-client";

export function SpeechButton({
  attemptId,
  turnId,
  autoPlay = false,
}: {
  attemptId: string;
  turnId: string;
  autoPlay?: boolean;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasAutoPlayedRef = useRef<boolean>(false);

  const cleanup = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  const playAudio = async () => {
    if (status === "playing" || status === "loading") return;
    cleanup();
    if (isMountedRef.current) setStatus("loading");

    try {
      const token = await getToken();
      if (!token) {
        if (isMountedRef.current) setStatus("idle");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const blob = await createApiClient(apiUrl).generateSpeech(
        token,
        attemptId,
        turnId,
      );

      if (!isMountedRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      urlRef.current = url;
      audioRef.current = audio;

      audio.onended = () => {
        cleanup();
        if (isMountedRef.current) setStatus("idle");
      };

      audio.onerror = () => {
        cleanup();
        if (isMountedRef.current) setStatus("error");
      };

      try {
        await audio.play();
        if (isMountedRef.current) setStatus("playing");
      } catch {
        // Browser autoplay restriction: revert to idle so user can click to play
        cleanup();
        if (isMountedRef.current) setStatus("idle");
      }
    } catch {
      cleanup();
      if (isMountedRef.current) setStatus("error");
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      void playAudio();
    }
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [autoPlay, attemptId, turnId]);

  const toggle = async () => {
    if (status === "playing") {
      cleanup();
      if (isMountedRef.current) setStatus("idle");
      return;
    }
    await playAudio();
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={status === "loading"}
        aria-label={
          status === "playing" ? "Stop audio" : "Play counterpart message"
        }
        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 font-meta text-[11px] font-semibold text-foreground hover:bg-surface-subtle disabled:opacity-50 brutalist-shadow-sm cursor-pointer transition-colors"
      >
        {status === "loading" ? (
          <>
            <RefreshIcon className="w-3 h-3 animate-spin text-primary" />
            <span>Loading voice…</span>
          </>
        ) : status === "playing" ? (
          <>
            <span className="flex h-2 w-2 relative mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>Stop audio</span>
          </>
        ) : (
          <>
            <VolumeIcon className="w-3 h-3 text-primary" />
            <span>Listen</span>
          </>
        )}
      </button>
      {status === "error" && (
        <span role="status" className="font-meta text-[11px] text-alert">
          Audio unavailable. The text is still available.
        </span>
      )}
    </div>
  );
}
