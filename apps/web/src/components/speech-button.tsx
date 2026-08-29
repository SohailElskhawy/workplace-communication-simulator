"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { createApiClient } from "../lib/api-client";

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

  const cleanup = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };
  useEffect(() => cleanup, []);

  const toggle = async () => {
    if (status === "playing") {
      cleanup();
      setStatus("idle");
      return;
    }
    cleanup();
    setStatus("loading");
    try {
      const token = await getToken();
      if (!token) throw new Error();
      const blob = await createApiClient(
        process.env.NEXT_PUBLIC_API_URL ?? "",
      ).generateSpeech(token, attemptId, turnId);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      urlRef.current = url;
      audioRef.current = audio;
      audio.onended = () => {
        cleanup();
        setStatus("idle");
      };
      audio.onerror = () => {
        cleanup();
        setStatus("error");
      };
      await audio.play();
      setStatus("playing");
    } catch {
      cleanup();
      setStatus("error");
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
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {status === "loading"
          ? "Loading audio…"
          : status === "playing"
            ? "Stop audio"
            : "Listen"}
      </button>
      {status === "error" && (
        <span role="status" className="text-[11px] text-amber-700">
          Audio unavailable. The text is still available.
        </span>
      )}
    </div>
  );
}
