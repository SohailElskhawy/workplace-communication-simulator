"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const statusRef = useRef<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasAutoPlayedRef = useRef<boolean>(false);

  // Sync ref with current state in effect
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async () => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      return;
    }

    cleanup();
    statusRef.current = "loading";
    if (isMountedRef.current) setStatus("loading");

    try {
      const token = await getToken();
      if (!token) {
        statusRef.current = "idle";
        if (isMountedRef.current) setStatus("idle");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const blob = await createApiClient(apiUrl).generateSpeech(
        token,
        attemptId,
        turnId,
      );

      if (!isMountedRef.current) {
        cleanup();
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      urlRef.current = url;
      audioRef.current = audio;

      audio.onended = () => {
        cleanup();
        statusRef.current = "idle";
        if (isMountedRef.current) setStatus("idle");
      };

      audio.onerror = () => {
        cleanup();
        statusRef.current = "error";
        if (isMountedRef.current) setStatus("error");
      };

      try {
        await audio.play();
        if (isMountedRef.current) {
          statusRef.current = "playing";
          setStatus("playing");
        }
      } catch {
        // Autoplay policy prevented playback: revert to idle so user can click to play
        cleanup();
        statusRef.current = "idle";
        if (isMountedRef.current) setStatus("idle");
      }
    } catch {
      cleanup();
      statusRef.current = "error";
      if (isMountedRef.current) setStatus("error");
    }
  }, [attemptId, cleanup, getToken, turnId]);

  // Handle Autoplay on mount
  useEffect(() => {
    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      void playAudio();
    }
  }, [autoPlay, playAudio]);

  // Clean up on component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const toggle = async () => {
    if (statusRef.current === "playing") {
      cleanup();
      statusRef.current = "idle";
      if (isMountedRef.current) setStatus("idle");
      return;
    }
    await playAudio();
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
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
