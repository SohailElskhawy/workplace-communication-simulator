export interface MicrophoneAnalyser {
  fftSize: number;
  frequencyBinCount: number;
  disconnect(): void;
  getByteTimeDomainData(data: Uint8Array): void;
}

export interface MicrophoneSource {
  connect(destination: MicrophoneAnalyser): void;
  disconnect(): void;
}

export interface MicrophoneAudioContext {
  createAnalyser(): MicrophoneAnalyser;
  createMediaStreamSource(stream: MediaStream): MicrophoneSource;
  close(): Promise<void>;
}

export interface MicrophoneLevelMeterOptions {
  createAudioContext: () => MicrophoneAudioContext | null;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  onLevelChange: (level: number) => void;
}

export class MicrophoneLevelMeter {
  private context: MicrophoneAudioContext | null = null;
  private analyser: MicrophoneAnalyser | null = null;
  private source: MicrophoneSource | null = null;
  private sampleBuffer: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private isRunning = false;

  constructor(private readonly options: MicrophoneLevelMeterOptions) {}

  start(stream: MediaStream): boolean {
    this.stop();

    try {
      const context = this.options.createAudioContext();
      if (!context) return false;

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      this.context = context;
      this.analyser = analyser;
      this.source = source;
      this.sampleBuffer = new Uint8Array(analyser.frequencyBinCount);
      this.isRunning = true;
      this.scheduleSample();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop(): void {
    this.isRunning = false;

    if (this.animationFrame !== null) {
      this.options.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.source?.disconnect();
    this.analyser?.disconnect();
    this.source = null;
    this.analyser = null;
    this.sampleBuffer = null;

    const context = this.context;
    this.context = null;
    if (context) {
      void context.close().catch(() => undefined);
    }

    this.options.onLevelChange(0);
  }

  private scheduleSample(): void {
    this.animationFrame = this.options.requestAnimationFrame(() => {
      this.animationFrame = null;
      if (!this.isRunning || !this.analyser || !this.sampleBuffer) return;

      this.analyser.getByteTimeDomainData(this.sampleBuffer);
      const totalDeviation = this.sampleBuffer.reduce(
        (total, sample) => total + Math.abs(sample - 128),
        0,
      );
      this.options.onLevelChange(
        Math.min(1, totalDeviation / this.sampleBuffer.length / 128),
      );
      this.scheduleSample();
    });
  }
}
