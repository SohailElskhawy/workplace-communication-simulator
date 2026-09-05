export interface GenerateSpeechOptions {
  text: string;
  language: "en" | "ar";
  dialect?: ("EGYPTIAN" | "GULF" | null) | undefined;
  gender?: ("MALE" | "FEMALE") | undefined;
  timeoutMs: number;
}

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
  latencyMs: number;
}

export interface TtsProvider {
  readonly model?: string | undefined;
  generateSpeech(options: GenerateSpeechOptions): Promise<SpeechResult>;
}
