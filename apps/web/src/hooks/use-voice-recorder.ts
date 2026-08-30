"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MicrophoneLevelMeter,
  type MicrophoneAudioContext,
} from "../lib/microphone-level-meter";
import { MicrophoneSilenceDetector } from "../lib/microphone-silence-detector";

export const MAX_RECORDING_DURATION_SECONDS = 120;

export type VoiceRecorderStatus =
  "idle" | "requesting_permission" | "recording" | "transcribing" | "error";

export interface UseVoiceRecorderOptions {
  onTranscriptReady: (transcript: string) => void;
  onTranscribeAudio: (
    audioBlob: Blob,
    durationMs: number,
  ) => Promise<{ transcript: string }>;
}

function checkIsSupported(): boolean {
  if (typeof window === "undefined") return true;
  return (
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== "undefined"
  );
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

export function useVoiceRecorder({
  onTranscriptReady,
  onTranscribeAudio,
}: UseVoiceRecorderOptions) {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported] = useState<boolean>(() => checkIsSupported());

  const optionsRef = useRef({ onTranscriptReady, onTranscribeAudio });

  useEffect(() => {
    optionsRef.current = { onTranscriptReady, onTranscribeAudio };
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const microphoneLevelMeterRef = useRef<MicrophoneLevelMeter | null>(null);
  const silenceDetectorRef = useRef(new MicrophoneSilenceDetector());
  const isRecordingRef = useRef(false);

  const cleanupMicrophoneLevelMeter = useCallback(() => {
    microphoneLevelMeterRef.current?.stop();
    microphoneLevelMeterRef.current = null;
    setMicrophoneLevel(0);
  }, []);

  const cleanupStream = useCallback(() => {
    isRecordingRef.current = false;
    silenceDetectorRef.current.reset();
    cleanupMicrophoneLevelMeter();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  }, [cleanupMicrophoneLevelMeter]);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    isRecordingRef.current = false;
    silenceDetectorRef.current.reset();
    clearTimer();
    const elapsedMs = Math.max(0, Date.now() - recordingStartTimeRef.current);

    setStatus("transcribing");

    recorder.onstop = async () => {
      cleanupStream();
      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (audioBlob.size === 0) {
        setStatus("idle");
        return;
      }

      try {
        const result = await optionsRef.current.onTranscribeAudio(
          audioBlob,
          elapsedMs,
        );
        if (result.transcript) {
          optionsRef.current.onTranscriptReady(result.transcript);
        }
        setStatus("idle");
        setDurationSeconds(0);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to transcribe voice recording.",
        );
      }
    };

    recorder.stop();
  }, [clearTimer, cleanupStream]);

  const cancelRecording = useCallback(() => {
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupStream();
    audioChunksRef.current = [];
    setStatus("idle");
    setDurationSeconds(0);
  }, [clearTimer, cleanupStream]);

  const startRecording = useCallback(async () => {
    if (!checkIsSupported()) {
      setStatus("error");
      setErrorMessage(
        "Voice recording is not supported in this browser. Please use text.",
      );
      return;
    }

    setErrorMessage(null);
    setStatus("requesting_permission");
    audioChunksRef.current = [];
    isRecordingRef.current = false;
    silenceDetectorRef.current.reset();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      const levelMeter = new MicrophoneLevelMeter({
        createAudioContext: createBrowserAudioContext,
        requestAnimationFrame: (callback) =>
          window.requestAnimationFrame(callback),
        cancelAnimationFrame: (handle) => window.cancelAnimationFrame(handle),
        onLevelChange: (level) => {
          setMicrophoneLevel(level);
          if (
            isRecordingRef.current &&
            silenceDetectorRef.current.observe(level, window.performance.now())
          ) {
            void stopAndTranscribe();
          }
        },
      });
      microphoneLevelMeterRef.current = levelMeter;
      levelMeter.start(stream);

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        cleanupStream();
        clearTimer();
        setStatus("error");
        setErrorMessage("An error occurred while recording voice.");
      };

      recorder.start(250);
      recordingStartTimeRef.current = Date.now();
      isRecordingRef.current = true;
      setStatus("recording");
      setDurationSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000,
        );
        setDurationSeconds(seconds);

        if (seconds >= MAX_RECORDING_DURATION_SECONDS) {
          void stopAndTranscribe();
        }
      }, 1000);
    } catch (err: unknown) {
      cleanupStream();
      setStatus("error");
      if (
        err instanceof Error &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setErrorMessage(
          "Microphone access was denied. Please allow microphone permissions in your browser or continue typing below.",
        );
      } else if (
        err instanceof Error &&
        (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")
      ) {
        setErrorMessage(
          "No microphone found. Please connect a microphone or use text input.",
        );
      } else {
        setErrorMessage(
          "Unable to access microphone. Please check your settings or use text.",
        );
      }
    }
  }, [cleanupStream, clearTimer, stopAndTranscribe]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (status === "error") {
      setStatus("idle");
    }
  }, [status]);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupStream();
    };
  }, [clearTimer, cleanupStream]);

  return {
    status,
    durationSeconds,
    microphoneLevel,
    errorMessage,
    isSupported,
    startRecording,
    stopAndTranscribe,
    cancelRecording,
    clearError,
  };
}
