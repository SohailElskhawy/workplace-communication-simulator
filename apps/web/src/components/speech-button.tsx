"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { createApiClient } from "@/lib/api-client";

export function SpeechButton({
  attemptId,
  turnId,
}: {
  attemptId: string;
  turnId: string;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const cleanup = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const toggle = async () => {
    if (status === "playing") {
      cleanup();
      if (isMountedRef.current) setStatus("idle");
      return;
    }
    cleanup();
    if (isMountedRef.current) setStatus("loading");

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const blob = await createApiClient(apiUrl).generateSpeech(
        token,
        attemptId,
        turnId,
      );

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

      await audio.play();
      if (isMountedRef.current) setStatus("playing");
    } catch {
      cleanup();
      if (isMountedRef.current) setStatus("error");
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={status === "loading"}
        aria-label={
          status === "playing" ? "Stop speech" : "Play counterpart message"
        }
        className="rounded-control border border-border px-2.5 py-1 font-meta text-[11px] font-semibold text-foreground hover:bg-surface-subtle disabled:opacity-50 brutalist-shadow-sm cursor-pointer"
      >
        {status === "loading"
          ? "Loading audio…"
          : status === "playing"
            ? "Stop audio"
            : "Listen"}
      </button>
      {status === "error" && (
        <span role="status" className="font-meta text-[11px] text-alert">
          Audio unavailable. The text is still available.
        </span>
      )}
    </div>
  );
}
