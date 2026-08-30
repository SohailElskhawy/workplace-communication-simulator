import { describe, expect, it, vi } from "vitest";

import { createAudioDurationParser } from "./audio-duration.js";

describe("AudioDurationParser", () => {
  it("uses parsed media metadata rather than caller-supplied duration", async () => {
    const parseMetadata = vi.fn().mockResolvedValue({
      format: { duration: 120.001 },
    });
    const parser = createAudioDurationParser(parseMetadata);

    await expect(
      parser.parseDurationMs(Buffer.from("audio"), "audio/webm"),
    ).resolves.toBe(120_001);
    expect(parseMetadata).toHaveBeenCalledWith(expect.any(Uint8Array), {
      mimeType: "audio/webm",
      size: 5,
    });
  });

  it("returns null for metadata without a finite duration", async () => {
    const parser = createAudioDurationParser(
      vi.fn().mockResolvedValue({ format: {} }),
    );
    await expect(
      parser.parseDurationMs(Buffer.from("audio"), "audio/webm"),
    ).resolves.toBeNull();
  });

  it("returns null when metadata parsing throws", async () => {
    const parser = createAudioDurationParser(
      vi.fn().mockRejectedValue(new Error("Corrupt header")),
    );
    await expect(
      parser.parseDurationMs(Buffer.from("audio"), "audio/webm"),
    ).resolves.toBeNull();
  });
});
