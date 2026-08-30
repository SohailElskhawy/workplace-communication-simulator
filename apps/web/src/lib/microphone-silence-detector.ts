export const SPEECH_LEVEL_THRESHOLD = 0.06;
export const SILENCE_AUTO_STOP_MS = 1_800;

export class MicrophoneSilenceDetector {
  private hasDetectedSpeech = false;
  private silenceStartedAt: number | null = null;
  private hasRequestedStop = false;

  observe(level: number, timestampMs: number): boolean {
    if (this.hasRequestedStop) return false;

    if (level >= SPEECH_LEVEL_THRESHOLD) {
      this.hasDetectedSpeech = true;
      this.silenceStartedAt = null;
      return false;
    }

    if (!this.hasDetectedSpeech) return false;

    if (this.silenceStartedAt === null) {
      this.silenceStartedAt = timestampMs;
      return false;
    }

    if (timestampMs - this.silenceStartedAt < SILENCE_AUTO_STOP_MS) {
      return false;
    }

    this.hasRequestedStop = true;
    return true;
  }

  reset(): void {
    this.hasDetectedSpeech = false;
    this.silenceStartedAt = null;
    this.hasRequestedStop = false;
  }
}
