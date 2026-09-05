export interface GenerateSpeechOptions {
  text: string;
  language: "en" | "ar";
  dialect?: "EGYPTIAN" | "GULF" | null;
  gender?: "MALE" | "FEMALE";
  timeoutMs: number;
}

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
  latencyMs: number;
}

export interface TtsProvider {
  readonly model?: string;
  generateSpeech(options: GenerateSpeechOptions): Promise<SpeechResult>;
}
