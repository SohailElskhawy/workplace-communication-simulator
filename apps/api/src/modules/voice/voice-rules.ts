export const MAX_RECORDING_DURATION_SECONDS = 120;
export const MAX_RECORDING_DURATION_MS = 120_000;
export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const SUPPORTED_MIME_PREFIXES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/flac",
  "audio/x-flac",
  "video/webm", // some browsers label audio-only MediaRecorder recordings as video/webm
  "video/mp4",
];

export function isSupportedAudioMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  const normalized = mimeType.trim().toLowerCase();
  // Strip codecs parameters like audio/webm;codecs=opus
  const baseType = normalized.split(";")[0]?.trim() ?? "";
  return SUPPORTED_MIME_PREFIXES.includes(baseType);
}

export interface AudioValidationInput {
  buffer: Buffer;
  mimeType: string;
  size: number;
  durationMs?: number | null | undefined;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateAudioInput(
  input: AudioValidationInput,
): ValidationResult {
  if (!input.buffer || input.size === 0 || input.buffer.length === 0) {
    return {
      valid: false,
      reason: "Audio recording cannot be empty.",
    };
  }

  if (input.size > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Audio file exceeds maximum allowed size of ${MAX_AUDIO_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  if (!isSupportedAudioMimeType(input.mimeType)) {
    return {
      valid: false,
      reason: `Unsupported audio format: ${input.mimeType}. Supported formats include WebM, MP4, M4A, WAV, OGG, and MP3.`,
    };
  }

  if (
    input.durationMs != null &&
    input.durationMs > MAX_RECORDING_DURATION_MS
  ) {
    return {
      valid: false,
      reason: `Audio recording duration exceeds the maximum limit of ${MAX_RECORDING_DURATION_SECONDS} seconds.`,
    };
  }

  return { valid: true };
}
