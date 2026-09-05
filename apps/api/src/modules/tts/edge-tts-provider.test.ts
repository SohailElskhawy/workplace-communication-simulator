import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { MsEdgeTTS } from "msedge-tts";
import {
  EdgeTtsProvider,
  resolveEdgeVoice,
  sanitizeTtsText,
} from "./edge-tts-provider.js";

describe("sanitizeTtsText", () => {
  it("strips asterisk stage annotations", () => {
    expect(sanitizeTtsText("*sighs* Let's talk about the proposal.")).toBe(
      "Let's talk about the proposal.",
    );
    expect(sanitizeTtsText("I understand *nods* completely.")).toBe(
      "I understand completely.",
    );
  });

  it("strips square bracket stage annotations", () => {
    expect(sanitizeTtsText("[pause] Let's proceed.")).toBe("Let's proceed.");
    expect(sanitizeTtsText("Here is the plan. [clears throat] We start now.")).toBe(
      "Here is the plan. We start now.",
    );
  });

  it("strips parentheses stage annotations", () => {
    expect(sanitizeTtsText("(hesitates) I am not sure.")).toBe(
      "I am not sure.",
    );
    expect(sanitizeTtsText("Thank you (smiling) for your time.")).toBe(
      "Thank you for your time.",
    );
  });

  it("cleans combinations of annotations and normalizes whitespace", () => {
    const raw = "  *clears throat*   [pause]  (smiling)  Hello, world!  *chuckles*  ";
    expect(sanitizeTtsText(raw)).toBe("Hello, world!");
  });

  it("returns empty string when text only contains annotations", () => {
    expect(sanitizeTtsText("*sighs* [pause] (hesitates)")).toBe("");
  });
});

describe("resolveEdgeVoice", () => {
  it("resolves Gulf Arabic voices", () => {
    expect(resolveEdgeVoice("ar", "GULF", "FEMALE")).toBe("ar-SA-ZariyahNeural");
    expect(resolveEdgeVoice("ar", "GULF", "MALE")).toBe("ar-SA-HamedNeural");
    expect(resolveEdgeVoice("ar", "GULF")).toBe("ar-SA-HamedNeural");
  });

  it("resolves Egyptian Arabic voices as default for Arabic", () => {
    expect(resolveEdgeVoice("ar", "EGYPTIAN", "FEMALE")).toBe(
      "ar-EG-SalmaNeural",
    );
    expect(resolveEdgeVoice("ar", "EGYPTIAN", "MALE")).toBe(
      "ar-EG-ShakirNeural",
    );
    expect(resolveEdgeVoice("ar", null, "FEMALE")).toBe("ar-EG-SalmaNeural");
    expect(resolveEdgeVoice("ar", undefined, "MALE")).toBe(
      "ar-EG-ShakirNeural",
    );
    expect(resolveEdgeVoice("ar")).toBe("ar-EG-ShakirNeural");
  });

  it("resolves English voices", () => {
    expect(resolveEdgeVoice("en", null, "FEMALE")).toBe("en-US-JennyNeural");
    expect(resolveEdgeVoice("en", null, "MALE")).toBe("en-US-GuyNeural");
    expect(resolveEdgeVoice("en", undefined, "FEMALE")).toBe("en-US-JennyNeural");
    expect(resolveEdgeVoice("en")).toBe("en-US-GuyNeural");
  });
});

describe("EdgeTtsProvider", () => {
  it("synthesizes audio buffer successfully with appropriate voice", async () => {
    const setMetadata = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const fakeAudioData = Buffer.from("audio-chunk");

    const audioStream = new Readable({
      read() {
        this.push(fakeAudioData);
        this.push(null);
      },
    });

    const toStream = vi.fn().mockReturnValue({
      audioStream,
      metadataStream: null,
    });

    const mockClient = {
      setMetadata,
      toStream,
      close,
    } as unknown as MsEdgeTTS;

    const provider = new EdgeTtsProvider(() => mockClient);
    const result = await provider.generateSpeech({
      text: "*sighs* Hello team!",
      language: "en",
      gender: "FEMALE",
      timeoutMs: 5000,
    });

    expect(setMetadata).toHaveBeenCalledWith(
      "en-US-JennyNeural",
      "audio-24khz-48kbitrate-mono-mp3",
    );
    expect(toStream).toHaveBeenCalledWith("Hello team!");
    expect(result.contentType).toBe("audio/mpeg");
    expect(result.audio.toString()).toBe("audio-chunk");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(close).toHaveBeenCalled();
  });

  it("throws if sanitized text is empty", async () => {
    const mockClientFactory = vi.fn();
    const provider = new EdgeTtsProvider(mockClientFactory);

    await expect(
      provider.generateSpeech({
        text: "*sighs* [pause]",
        language: "ar",
        dialect: "EGYPTIAN",
        timeoutMs: 5000,
      }),
    ).rejects.toThrow("TTS text is empty after sanitization");

    expect(mockClientFactory).not.toHaveBeenCalled();
  });

  it("aborts and rejects when timeout occurs", async () => {
    const setMetadata = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );
    const close = vi.fn();

    const mockClient = {
      setMetadata,
      toStream: vi.fn(),
      close,
    } as unknown as MsEdgeTTS;

    const provider = new EdgeTtsProvider(() => mockClient);

    await expect(
      provider.generateSpeech({
        text: "This should time out",
        language: "en",
        timeoutMs: 50,
      }),
    ).rejects.toThrow("Edge TTS generation timed out after 50ms");

    expect(close).toHaveBeenCalled();
  });

  it("rejects if audio stream emits an error", async () => {
    const setMetadata = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();

    const audioStream = new Readable({
      read() {
        this.destroy(new Error("Network connection dropped"));
      },
    });

    const toStream = vi.fn().mockReturnValue({
      audioStream,
      metadataStream: null,
    });

    const mockClient = {
      setMetadata,
      toStream,
      close,
    } as unknown as MsEdgeTTS;

    const provider = new EdgeTtsProvider(() => mockClient);

    await expect(
      provider.generateSpeech({
        text: "Error test",
        language: "en",
        timeoutMs: 5000,
      }),
    ).rejects.toThrow("Network connection dropped");

    expect(close).toHaveBeenCalled();
  });

  it("rejects if audio stream emits zero bytes", async () => {
    const setMetadata = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();

    const audioStream = new Readable({
      read() {
        this.push(null);
      },
    });

    const toStream = vi.fn().mockReturnValue({
      audioStream,
      metadataStream: null,
    });

    const mockClient = {
      setMetadata,
      toStream,
      close,
    } as unknown as MsEdgeTTS;

    const provider = new EdgeTtsProvider(() => mockClient);

    await expect(
      provider.generateSpeech({
        text: "Empty stream test",
        language: "en",
        timeoutMs: 5000,
      }),
    ).rejects.toThrow("No audio data received from Edge TTS");

    expect(close).toHaveBeenCalled();
  });
});
