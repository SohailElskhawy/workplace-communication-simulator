export type SpeechPlaybackStatus = "idle" | "loading" | "playing" | "error";

export interface SpeechAudio {
  onended: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  pause(): void;
  play(): Promise<void>;
}

export interface SpeechPlaybackControllerOptions {
  requestAudio: () => Promise<Blob>;
  createObjectUrl: (audio: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  createAudio: (url: string) => SpeechAudio;
  onStatusChange: (status: SpeechPlaybackStatus) => void;
}

let activePlayback: { id: symbol; stop: () => void } | null = null;

export class SpeechPlaybackController {
  private readonly id = Symbol("speech-playback");
  private audio: SpeechAudio | null = null;
  private objectUrl: string | null = null;
  private requestVersion = 0;
  private status: SpeechPlaybackStatus = "idle";

  constructor(private readonly options: SpeechPlaybackControllerOptions) {}

  async play(): Promise<boolean> {
    if (this.status === "loading" || this.status === "playing") {
      return false;
    }

    activePlayback?.stop();
    activePlayback = { id: this.id, stop: () => this.stop() };
    this.cleanupAudio();

    const requestVersion = ++this.requestVersion;
    this.setStatus("loading");

    try {
      const blob = await this.options.requestAudio();
      if (!this.isCurrent(requestVersion)) return false;

      const objectUrl = this.options.createObjectUrl(blob);
      const audio = this.options.createAudio(objectUrl);
      this.objectUrl = objectUrl;
      this.audio = audio;

      audio.onended = () => this.completePlayback(requestVersion, "idle");
      audio.onerror = () => this.completePlayback(requestVersion, "error");

      await audio.play();
      if (!this.isCurrent(requestVersion)) return false;

      this.setStatus("playing");
      return true;
    } catch {
      if (this.isCurrent(requestVersion)) {
        this.cleanupAudio();
        this.releaseActiveController();
        this.setStatus("error");
      }
      return false;
    }
  }

  stop(): void {
    ++this.requestVersion;
    this.cleanupAudio();
    this.releaseActiveController();
    this.setStatus("idle");
  }

  dispose(): void {
    this.stop();
  }

  private completePlayback(
    requestVersion: number,
    status: "idle" | "error",
  ): void {
    if (!this.isCurrent(requestVersion)) return;

    this.cleanupAudio();
    this.releaseActiveController();
    this.setStatus(status);
  }

  private isCurrent(requestVersion: number): boolean {
    return this.requestVersion === requestVersion;
  }

  private cleanupAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    if (this.objectUrl) {
      this.options.revokeObjectUrl(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private releaseActiveController(): void {
    if (activePlayback?.id === this.id) activePlayback = null;
  }

  private setStatus(status: SpeechPlaybackStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatusChange(status);
  }
}

export function resetSpeechPlaybackForTests(): void {
  activePlayback?.stop();
  activePlayback = null;
}
