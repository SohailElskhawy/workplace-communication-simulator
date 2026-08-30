"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshIcon, VolumeIcon } from "@/components/icons";
import { createApiClient } from "@/lib/api-client";
import {
  SpeechPlaybackController,
  type SpeechPlaybackStatus,
} from "@/lib/speech-playback-controller";

export function SpeechButton({
  attemptId,
  turnId,
  autoPlay = false,
  onStatusChange,
}: {
  attemptId: string;
  turnId: string;
  autoPlay?: boolean;
  onStatusChange?: (status: SpeechPlaybackStatus) => void;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<SpeechPlaybackStatus>("idle");
  const statusRef = useRef<SpeechPlaybackStatus>("idle");
  const isMountedRef = useRef<boolean>(true);
  const hasAutoPlayedRef = useRef<boolean>(false);
  const onStatusChangeRef = useRef(onStatusChange);
  const playbackRequestRef = useRef({ attemptId, getToken, turnId });
  const controllerRef = useRef<SpeechPlaybackController | null>(null);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    playbackRequestRef.current = { attemptId, getToken, turnId };
  }, [attemptId, getToken, turnId]);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new SpeechPlaybackController({
      requestAudio: async () => {
        const request = playbackRequestRef.current;
        const token = await request.getToken();
        if (!token) throw new Error("Authentication token not available.");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        return createApiClient(apiUrl).generateSpeech(
          token,
          request.attemptId,
          request.turnId,
        );
      },
      createObjectUrl: (audio) => URL.createObjectURL(audio),
      revokeObjectUrl: (url) => URL.revokeObjectURL(url),
      createAudio: (url) => new Audio(url),
      onStatusChange: (nextStatus) => {
        statusRef.current = nextStatus;
        onStatusChangeRef.current?.(nextStatus);
        if (isMountedRef.current) setStatus(nextStatus);
      },
    });
    controllerRef.current = controller;

    return () => {
      isMountedRef.current = false;
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  const playAudio = useCallback(async () => {
    await controllerRef.current?.play();
  }, []);

  useEffect(() => {
    controllerRef.current?.stop();
    hasAutoPlayedRef.current = false;
  }, [attemptId, turnId]);

  // Handle Autoplay on mount
  useEffect(() => {
    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      void playAudio();
    }
  }, [autoPlay, playAudio]);

  const toggle = async () => {
    if (statusRef.current === "playing" || statusRef.current === "loading") {
      controllerRef.current?.stop();
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
