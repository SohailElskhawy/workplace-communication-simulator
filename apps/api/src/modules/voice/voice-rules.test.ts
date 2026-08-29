import { describe, expect, it } from "vitest";

import {
  isSupportedAudioMimeType,
  MAX_AUDIO_SIZE_BYTES,
  MAX_RECORDING_DURATION_MS,
  validateAudioInput,
} from "./voice-rules.js";

describe("voice-rules", () => {
  describe("isSupportedAudioMimeType", () => {
    it("accepts common audio formats and codecs parameter", () => {
      expect(isSupportedAudioMimeType("audio/webm")).toBe(true);
      expect(isSupportedAudioMimeType("audio/webm;codecs=opus")).toBe(true);
      expect(isSupportedAudioMimeType("audio/ogg")).toBe(true);
      expect(isSupportedAudioMimeType("audio/ogg; codecs=opus")).toBe(true);
      expect(isSupportedAudioMimeType("audio/mp4")).toBe(true);
      expect(isSupportedAudioMimeType("audio/m4a")).toBe(true);
      expect(isSupportedAudioMimeType("audio/wav")).toBe(true);
      expect(isSupportedAudioMimeType("audio/x-wav")).toBe(true);
      expect(isSupportedAudioMimeType("audio/mpeg")).toBe(true);
      expect(isSupportedAudioMimeType("audio/mp3")).toBe(true);
      expect(isSupportedAudioMimeType("audio/flac")).toBe(true);
      expect(isSupportedAudioMimeType("video/webm")).toBe(true);
    });

    it("rejects unsupported MIME types", () => {
      expect(isSupportedAudioMimeType("text/plain")).toBe(false);
      expect(isSupportedAudioMimeType("application/json")).toBe(false);
      expect(isSupportedAudioMimeType("image/png")).toBe(false);
      expect(isSupportedAudioMimeType("")).toBe(false);
    });
  });

  describe("validateAudioInput", () => {
    it("validates a valid audio input", () => {
      const result = validateAudioInput({
        buffer: Buffer.from("test-audio-content"),
        mimeType: "audio/webm;codecs=opus",
        size: 1024,
        durationMs: 30_000,
      });

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("rejects empty audio buffer or 0 size", () => {
      const result = validateAudioInput({
        buffer: Buffer.alloc(0),
        mimeType: "audio/webm",
        size: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("empty");
    });

    it("rejects audio exceeding 25MB", () => {
      const result = validateAudioInput({
        buffer: Buffer.from("audio"),
        mimeType: "audio/webm",
        size: MAX_AUDIO_SIZE_BYTES + 1,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds maximum allowed size");
    });

    it("rejects unsupported MIME type", () => {
      const result = validateAudioInput({
        buffer: Buffer.from("audio"),
        mimeType: "application/pdf",
        size: 500,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Unsupported audio format");
    });

    it("rejects duration over 120 seconds", () => {
      const result = validateAudioInput({
        buffer: Buffer.from("audio"),
        mimeType: "audio/webm",
        size: 500,
        durationMs: MAX_RECORDING_DURATION_MS + 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain(
        "exceeds the maximum limit of 120 seconds",
      );
    });
  });
});
