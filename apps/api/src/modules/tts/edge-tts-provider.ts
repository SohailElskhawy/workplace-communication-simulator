import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type {
  GenerateSpeechOptions,
  SpeechResult,
  TtsProvider,
} from "./tts-provider.js";

export function sanitizeTtsText(text: string): string {
  return text
    .replace(/\*[^*]*\*/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveEdgeVoice(
  language: "en" | "ar",
  dialect?: ("EGYPTIAN" | "GULF" | null) | undefined,
  gender?: ("MALE" | "FEMALE") | undefined,
): string {
  const isFemale = gender === "FEMALE";

  if (language === "ar") {
    if (dialect === "GULF") {
      return isFemale ? "ar-SA-ZariyahNeural" : "ar-SA-HamedNeural";
    }
    return isFemale ? "ar-EG-SalmaNeural" : "ar-EG-ShakirNeural";
  }

  return isFemale ? "en-US-JennyNeural" : "en-US-GuyNeural";
}

export class EdgeTtsProvider implements TtsProvider {
  readonly model = "edge-tts";

  constructor(
    private readonly createClient: () => MsEdgeTTS = () => new MsEdgeTTS(),
  ) {}

  async generateSpeech(options: GenerateSpeechOptions): Promise<SpeechResult> {
    const startTime = Date.now();
    const cleanText = sanitizeTtsText(options.text);

    if (!cleanText) {
      throw new Error("TTS text is empty after sanitization");
    }

    const voice = resolveEdgeVoice(
      options.language,
      options.dialect,
      options.gender,
    );

    const tts = this.createClient();
    const abortController = new AbortController();
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          abortController.abort();
          tts.close();
          reject(
            new Error(
              `Edge TTS generation timed out after ${options.timeoutMs}ms`,
            ),
          );
        }, options.timeoutMs);
      });

      const synthPromise = (async () => {
        await tts.setMetadata(
          voice,
          OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
        );

        if (abortController.signal.aborted) {
          throw new Error(
            `Edge TTS generation timed out after ${options.timeoutMs}ms`,
          );
        }

        const { audioStream } = tts.toStream(cleanText);
        const chunks: Buffer[] = [];

        return new Promise<Buffer>((resolve, reject) => {
          const onAbort = () => {
            audioStream.destroy();
            tts.close();
            reject(
              new Error(
                `Edge TTS generation timed out after ${options.timeoutMs}ms`,
              ),
            );
          };

          if (abortController.signal.aborted) {
            return onAbort();
          }

          abortController.signal.addEventListener("abort", onAbort, {
            once: true,
          });

          audioStream.on("data", (chunk: Buffer | Uint8Array) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          audioStream.once("end", () => {
            abortController.signal.removeEventListener("abort", onAbort);
            const audio = Buffer.concat(chunks);
            if (audio.length === 0) {
              reject(new Error("No audio data received from Edge TTS"));
            } else {
              resolve(audio);
            }
          });

          audioStream.once("error", (err: Error) => {
            abortController.signal.removeEventListener("abort", onAbort);
            reject(err);
          });
        });
      })();

      const audio = await Promise.race([synthPromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      return {
        audio,
        contentType: "audio/mpeg",
        latencyMs,
      };
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      tts.close();
    }
  }
}
