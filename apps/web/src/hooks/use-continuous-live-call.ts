"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MicrophoneLevelMeter,
  type MicrophoneAudioContext,
} from "../lib/microphone-level-meter";
import { MicrophoneSilenceDetector } from "../lib/microphone-silence-detector";

export type LiveCallUiState =
  | "CONNECTING"
  | "LISTENING"
  | "USER_SPEAKING"
  | "AI_THINKING"
  | "AI_SPEAKING"
  | "MUTED"
  | "ERROR";

export interface UseContinuousLiveCallOptions {
  hasOpeningMessage: boolean;
  onTranscribeAudio: (
    audioBlob: Blob,
    durationMs: number,
  ) => Promise<{ transcript: string }>;
  onSendTurn: (text: string) => Promise<string | null>; // returns turnId or null on failure
  onRequestAudioStream: (turnId: string) => Promise<Blob>;
  onError?: (message: string) => void;
}

function createBrowserAudioContext(): MicrophoneAudioContext | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const BrowserAudioContext =
    globalThis.AudioContext ?? browserWindow.webkitAudioContext;
  return BrowserAudioContext
    ? (new BrowserAudioContext() as unknown as MicrophoneAudioContext)
    : null;
}

export function useContinuousLiveCall({
  hasOpeningMessage,
  onTranscribeAudio,
  onSendTurn,
  onRequestAudioStream,
  onError,
}: UseContinuousLiveCallOptions) {
  const [callState, setCallState] = useState<LiveCallUiState>("CONNECTING");
  const [microphoneLevel, setMicrophoneLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [interruptionCount, setInterruptionCount] = useState<number>(0);

  const callStateRef = useRef<LiveCallUiState>("CONNECTING");
  const isMutedRef = useRef<boolean>(false);
  const isConnectedRef = useRef<boolean>(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const levelMeterRef = useRef<MicrophoneLevelMeter | null>(null);
  const silenceDetectorRef = useRef<MicrophoneSilenceDetector>(
    new MicrophoneSilenceDetector(),
  );

  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const sustainedSpeechCountRef = useRef<number>(0);

  const updateState = useCallback((nextState: LiveCallUiState) => {
    callStateRef.current = nextState;
    setCallState(nextState);
  }, []);

  const stopActiveAudioPlayback = useCallback(() => {
    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current.currentTime = 0;
      activeAudioElementRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  // Play assistant speech stream for a given turn
  const playSpeechForTurn = useCallback(
    async (turnId: string) => {
      try {
        stopActiveAudioPlayback();
        updateState("AI_SPEAKING");

        const blob = await onRequestAudioStream(turnId);
        const url = URL.createObjectURL(blob);
        activeObjectUrlRef.current = url;

        const audio = new Audio(url);
        activeAudioElementRef.current = audio;

        audio.onended = () => {
          stopActiveAudioPlayback();
          if (callStateRef.current === "AI_SPEAKING") {
            updateState(isMutedRef.current ? "MUTED" : "LISTENING");
          }
        };

        audio.onerror = () => {
          stopActiveAudioPlayback();
          if (callStateRef.current === "AI_SPEAKING") {
            updateState(isMutedRef.current ? "MUTED" : "LISTENING");
          }
        };

        await audio.play();
      } catch {
        stopActiveAudioPlayback();
        if (callStateRef.current === "AI_SPEAKING") {
          updateState(isMutedRef.current ? "MUTED" : "LISTENING");
        }
      }
    },
    [onRequestAudioStream, stopActiveAudioPlayback, updateState],
  );

  // Stop recording user slice and submit turn
  const finishRecordingSlice = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    updateState("AI_THINKING");
    silenceDetectorRef.current.reset();

    const durationMs = Math.max(
      100,
      Date.now() - recordingStartTimeRef.current,
    );

    const recordingPromise = new Promise<Blob>((resolve) => {
      const handleStop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        recorder.removeEventListener("stop", handleStop);
        resolve(blob);
      };
      recorder.addEventListener("stop", handleStop);
      recorder.stop();
    });

    const audioBlob = await recordingPromise;

    // Minimum check: at least some audio
    if (audioBlob.size < 1_000) {
      updateState(isMutedRef.current ? "MUTED" : "LISTENING");
      return;
    }

    try {
      const { transcript } = await onTranscribeAudio(audioBlob, durationMs);
      const cleanTranscript = transcript.trim();

      if (!cleanTranscript || cleanTranscript.length < 2) {
        updateState(isMutedRef.current ? "MUTED" : "LISTENING");
        return;
      }

      const turnId = await onSendTurn(cleanTranscript);
      if (turnId) {
        await playSpeechForTurn(turnId);
      } else {
        updateState(isMutedRef.current ? "MUTED" : "LISTENING");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Live call turn failed.";
      onError?.(message);
      updateState(isMutedRef.current ? "MUTED" : "LISTENING");
    }
  }, [
    onError,
    onSendTurn,
    onTranscribeAudio,
    playSpeechForTurn,
    updateState,
  ]);

  // Start recording user slice
  const startRecordingSlice = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) return;

    audioChunksRef.current = [];
    recordingStartTimeRef.current = Date.now();
    silenceDetectorRef.current.reset();

    try {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      updateState("USER_SPEAKING");
    } catch {
      updateState("ERROR");
    }
  }, [updateState]);

  // Interruption handler (barge-in)
  const interruptAi = useCallback(() => {
    if (callStateRef.current === "AI_SPEAKING") {
      stopActiveAudioPlayback();
      setInterruptionCount((prev) => prev + 1);
      startRecordingSlice();
    }
  }, [startRecordingSlice, stopActiveAudioPlayback]);

  // Monitor audio levels continuously
  const handleMicrophoneLevel = useCallback(
    (level: number) => {
      setMicrophoneLevel(level);

      if (isMutedRef.current) return;

      const currentState = callStateRef.current;

      // 1. AI is speaking: check for user voice to interrupt
      if (currentState === "AI_SPEAKING") {
        if (level >= 0.08) {
          sustainedSpeechCountRef.current += 1;
          if (sustainedSpeechCountRef.current >= 3) {
            sustainedSpeechCountRef.current = 0;
            interruptAi();
          }
        } else {
          sustainedSpeechCountRef.current = 0;
        }
        return;
      }

      // 2. We are waiting for user to speak
      if (currentState === "LISTENING") {
        if (level >= 0.05) {
          startRecordingSlice();
        }
        return;
      }

      // 3. User is actively speaking: check silence for turn completion
      if (currentState === "USER_SPEAKING") {
        const isSilence = silenceDetectorRef.current.observe(
          level,
          Date.now(),
        );
        if (isSilence) {
          void finishRecordingSlice();
        }
      }
    },
    [finishRecordingSlice, interruptAi, startRecordingSlice],
  );

  // Initialize call session
  const startCall = useCallback(async () => {
    updateState("CONNECTING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const levelMeter = new MicrophoneLevelMeter({
        createAudioContext: createBrowserAudioContext,
        requestAnimationFrame: (callback) =>
          typeof window !== "undefined"
            ? window.requestAnimationFrame(callback)
            : 0,
        cancelAnimationFrame: (handle) => {
          if (typeof window !== "undefined") {
            window.cancelAnimationFrame(handle);
          }
        },
        onLevelChange: handleMicrophoneLevel,
      });
      levelMeterRef.current = levelMeter;
      levelMeter.start(stream);

      isConnectedRef.current = true;
      setIsConnected(true);

      // Speak opening message if turn count is 0
      if (hasOpeningMessage) {
        await playSpeechForTurn("opening");
      } else {
        updateState("LISTENING");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Microphone permission required for Live Call.";
      onError?.(message);
      updateState("ERROR");
    }
  }, [handleMicrophoneLevel, hasOpeningMessage, onError, playSpeechForTurn, updateState]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (nextMuted) {
      if (callStateRef.current === "USER_SPEAKING") {
        void finishRecordingSlice();
      }
      updateState("MUTED");
    } else {
      updateState("LISTENING");
    }
  }, [finishRecordingSlice, isMuted, updateState]);

  // Teardown
  const endCall = useCallback(() => {
    stopActiveAudioPlayback();
    levelMeterRef.current?.stop();
    levelMeterRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
    updateState("CONNECTING");
  }, [stopActiveAudioPlayback, updateState]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    callState,
    microphoneLevel,
    isMuted,
    isConnected,
    interruptionCount,
    startCall,
    toggleMute,
    interruptAi,
    endCall,
  };
}
