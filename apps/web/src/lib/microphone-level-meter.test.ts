import { describe, expect, it, vi } from "vitest";

import {
  MicrophoneLevelMeter,
  type MicrophoneAnalyser,
  type MicrophoneAudioContext,
  type MicrophoneSource,
} from "./microphone-level-meter";

function createMeterDependencies(samples: number[]) {
  let frameCallback: FrameRequestCallback | null = null;
  const analyser: MicrophoneAnalyser = {
    fftSize: 0,
    frequencyBinCount: samples.length,
    disconnect: vi.fn(),
    getByteTimeDomainData: vi.fn((data) => data.set(samples)),
  };
  const source: MicrophoneSource = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const context: MicrophoneAudioContext = {
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => source),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    frameCallback = callback;
    return 17;
  });
  const cancelAnimationFrame = vi.fn();

  return {
    analyser,
    cancelAnimationFrame,
    context,
    requestAnimationFrame,
    runAnimationFrame: () => frameCallback?.(0),
    source,
  };
}

describe("MicrophoneLevelMeter", () => {
  it("derives a normalized local amplitude level from analyser samples", () => {
    const dependencies = createMeterDependencies([128, 160, 96, 128]);
    const levels: number[] = [];
    const meter = new MicrophoneLevelMeter({
      createAudioContext: () => dependencies.context,
      requestAnimationFrame: dependencies.requestAnimationFrame,
      cancelAnimationFrame: dependencies.cancelAnimationFrame,
      onLevelChange: (level) => levels.push(level),
    });

    expect(meter.start({} as MediaStream)).toBe(true);
    dependencies.runAnimationFrame();

    expect(levels.at(-1)).toBe(0.125);
  });

  it("cleans up the animation frame, graph nodes, context, and reported level", () => {
    const dependencies = createMeterDependencies([128, 128]);
    const levels: number[] = [];
    const meter = new MicrophoneLevelMeter({
      createAudioContext: () => dependencies.context,
      requestAnimationFrame: dependencies.requestAnimationFrame,
      cancelAnimationFrame: dependencies.cancelAnimationFrame,
      onLevelChange: (level) => levels.push(level),
    });

    meter.start({} as MediaStream);
    meter.stop();

    expect(dependencies.cancelAnimationFrame).toHaveBeenCalledWith(17);
    expect(dependencies.source.disconnect).toHaveBeenCalledTimes(1);
    expect(dependencies.analyser.disconnect).toHaveBeenCalledTimes(1);
    expect(dependencies.context.close).toHaveBeenCalledTimes(1);
    expect(levels.at(-1)).toBe(0);
  });

  it("fails safely when browser audio analysis is unavailable", () => {
    const levels: number[] = [];
    const meter = new MicrophoneLevelMeter({
      createAudioContext: () => null,
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      onLevelChange: (level) => levels.push(level),
    });

    expect(meter.start({} as MediaStream)).toBe(false);
    expect(levels).toEqual([0]);
  });
});
