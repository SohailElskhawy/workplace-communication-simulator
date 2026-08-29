import { parseBuffer } from "music-metadata";

export interface AudioDurationParser {
  parseDurationMs(audio: Buffer, mimeType: string): Promise<number>;
}

export type ParseAudioMetadata = (
  audio: Uint8Array,
  fileInfo: { mimeType: string; size: number },
) => Promise<{ format: { duration?: number } }>;

export function createAudioDurationParser(
  parseMetadata: ParseAudioMetadata = parseBuffer,
): AudioDurationParser {
  return {
    async parseDurationMs(audio, mimeType) {
      const metadata = await parseMetadata(audio, {
        mimeType,
        size: audio.length,
      });
      const durationSeconds = metadata.format.duration;
      if (!Number.isFinite(durationSeconds) || durationSeconds === undefined) {
        throw new Error("Audio duration is unavailable.");
      }
      return Math.ceil(durationSeconds * 1000);
    },
  };
}
