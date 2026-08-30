import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetSpeechPlaybackForTests,
  SpeechPlaybackController,
  type SpeechAudio,
} from "./speech-playback-controller";

function createAudio(): SpeechAudio & {
  emitEnded: () => void;
  emitError: () => void;
} {
  let onended: ((event: Event) => void) | null = null;
  let onerror: ((event: Event) => void) | null = null;

  return {
    get onended() {
      return onended;
    },
    set onended(value) {
      onended = value;
    },
    get onerror() {
      return onerror;
    },
    set onerror(value) {
      onerror = value;
    },
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    emitEnded: () => onended?.(new Event("ended")),
    emitError: () => onerror?.(new Event("error")),
  };
}

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve: resolve! };
}

afterEach(() => {
  resetSpeechPlaybackForTests();
});

describe("SpeechPlaybackController", () => {
  it("transitions from loading to playing to idle after playback ends", async () => {
    const states: string[] = [];
    const audio = createAudio();
    const controller = new SpeechPlaybackController({
      requestAudio: vi.fn().mockResolvedValue(new Blob(["audio"])),
      createObjectUrl: vi.fn().mockReturnValue("blob:reply"),
      revokeObjectUrl: vi.fn(),
      createAudio: vi.fn().mockReturnValue(audio),
      onStatusChange: (status) => states.push(status),
    });

    await controller.play();
    audio.emitEnded();

    expect(states).toEqual(["loading", "playing", "idle"]);
  });

  it("does not request the same playback twice while a request is in flight", async () => {
    const deferred = createDeferred<Blob>();
    const requestAudio = vi.fn().mockReturnValue(deferred.promise);
    const audio = createAudio();
    const controller = new SpeechPlaybackController({
      requestAudio,
      createObjectUrl: vi.fn().mockReturnValue("blob:reply"),
      revokeObjectUrl: vi.fn(),
      createAudio: vi.fn().mockReturnValue(audio),
      onStatusChange: vi.fn(),
    });

    const firstPlayback = controller.play();
    const duplicatePlayback = controller.play();
    deferred.resolve(new Blob(["audio"]));

    expect(await duplicatePlayback).toBe(false);
    await firstPlayback;
    expect(requestAudio).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight speech request when playback stops", async () => {
    const deferred = createDeferred<Blob>();
    const requestAudio = vi.fn((signal: AbortSignal) => {
      void signal;
      return deferred.promise;
    });
    const controller = new SpeechPlaybackController({
      requestAudio,
      createObjectUrl: vi.fn(),
      revokeObjectUrl: vi.fn(),
      createAudio: vi.fn(),
      onStatusChange: vi.fn(),
    });

    const playback = controller.play();
    controller.stop();
    deferred.resolve(new Blob(["audio"]));

    const requestSignal = requestAudio.mock.calls[0]?.[0];
    expect(requestSignal?.aborted).toBe(true);
    await expect(playback).resolves.toBe(false);
  });

  it("reports an audio failure without leaving playback active", async () => {
    const states: string[] = [];
    const controller = new SpeechPlaybackController({
      requestAudio: vi.fn().mockRejectedValue(new Error("TTS failed")),
      createObjectUrl: vi.fn(),
      revokeObjectUrl: vi.fn(),
      createAudio: vi.fn(),
      onStatusChange: (status) => states.push(status),
    });

    expect(await controller.play()).toBe(false);
    expect(states).toEqual(["loading", "error"]);
  });

  it("stops and revokes the prior audio before another playback starts", async () => {
    const firstAudio = createAudio();
    const secondAudio = createAudio();
    const revokeObjectUrl = vi.fn();
    const first = new SpeechPlaybackController({
      requestAudio: vi.fn().mockResolvedValue(new Blob(["first"])),
      createObjectUrl: vi.fn().mockReturnValue("blob:first"),
      revokeObjectUrl,
      createAudio: vi.fn().mockReturnValue(firstAudio),
      onStatusChange: vi.fn(),
    });
    const second = new SpeechPlaybackController({
      requestAudio: vi.fn().mockResolvedValue(new Blob(["second"])),
      createObjectUrl: vi.fn().mockReturnValue("blob:second"),
      revokeObjectUrl,
      createAudio: vi.fn().mockReturnValue(secondAudio),
      onStatusChange: vi.fn(),
    });

    await first.play();
    await second.play();

    expect(firstAudio.pause).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:first");

    second.dispose();
    expect(secondAudio.pause).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:second");
  });
});
