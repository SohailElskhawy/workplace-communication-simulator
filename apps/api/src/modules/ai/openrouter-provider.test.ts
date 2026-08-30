import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AiProviderError,
  createOpenRouterProvider,
} from "./openrouter-provider.js";

const request = {
  model: "deepseek/deepseek-v4-flash-0731",
  messages: [{ role: "user" as const, content: "private learner text" }],
  timeoutMs: 15_000,
};

describe("OpenRouterProvider", () => {
  afterEach(() => vi.useRealTimers());

  it("uses the fixed model and strict privacy routing and returns safe usage", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: " A concise reply. " } }],
          usage: {
            prompt_tokens: 42,
            completion_tokens: 7,
            cost: 0.00009,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(145),
    });

    await expect(provider.generateRoleplayReply(request)).resolves.toEqual({
      text: "A concise reply.",
      latencyMs: 45,
      inputTokens: 42,
      outputTokens: 7,
      estimatedCost: 0.00009,
    });

    const [, init] = fetchImplementation.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: request.model,
      stream: false,
      max_tokens: 2_000,
      provider: { zdr: true, data_collection: "deny" },
    });
    expect(body).not.toHaveProperty("models");
    expect(body).not.toHaveProperty("route");
  });

  it.each([
    { choices: [] },
    { choices: [{ message: { content: "   " } }] },
    { choices: [{ message: { content: null } }] },
  ])("rejects malformed or empty responses", async (responseBody) => {
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify(responseBody), { status: 200 }),
        ),
    });

    await expect(provider.generateRoleplayReply(request)).rejects.toMatchObject(
      {
        code: "AI_PROVIDER_ERROR",
        message: "AI provider request failed.",
      },
    );
  });

  it("rejects a roleplay response that exceeds the persisted context budget", async () => {
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "x".repeat(1_601) } }],
          }),
          { status: 200 },
        ),
      ),
    });

    await expect(provider.generateRoleplayReply(request)).rejects.toMatchObject(
      {
        code: "AI_PROVIDER_ERROR",
      },
    );
  });

  it("does not expose a sensitive upstream error", async () => {
    const sensitiveProviderText = "upstream echoed private learner text";
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(sensitiveProviderText, {
          status: 500,
          statusText: sensitiveProviderText,
        }),
      ),
    });

    const error = await provider
      .generateRoleplayReply(request)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({
      code: "AI_PROVIDER_ERROR",
      message: "AI provider request failed.",
    });
    expect(String(error)).not.toContain(sensitiveProviderText);
  });

  it("aborts at the configured timeout and returns only the safe timeout code", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn(
      (...args: Parameters<typeof fetch>) =>
        new Promise<Response>((_resolve, reject) => {
          const init = args[1];
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("private upstream abort detail", "AbortError"),
            );
          });
        }),
    ) as unknown as typeof fetch;
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: () => Date.now(),
    });

    const pending = provider.generateRoleplayReply({
      ...request,
      timeoutMs: 25,
    });
    const assertion = expect(pending).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      message: "AI request timed out.",
    });
    await vi.advanceTimersByTimeAsync(25);

    await assertion;
  });

  it("evaluates simulation with structured output and returns parsed evaluation", async () => {
    const rawEvaluation = {
      skills: {
        clarity: { score: 85, explanation: "Very clear" },
        assertiveness: { score: 80, explanation: "Advocated well" },
        empathy: { score: 75, explanation: "Acknowledged constraints" },
        structure: { score: 90, explanation: "Logical flow" },
        conciseness: { score: 80, explanation: "Direct" },
      },
      objectives: [
        {
          objectiveId: "CLEAR_REQUEST",
          status: "ACHIEVED",
          explanation: "Clear ask",
          evidenceTurnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      strengths: [
        {
          title: "Clear opening",
          explanation: "Direct ask",
          turnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      improvements: [
        {
          title: "Follow up timeline",
          explanation: "Confirm next steps",
          turnIds: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
      moments: [
        {
          turnId: "11111111-1111-4111-8111-111111111111",
          type: "STRENGTH",
          explanation: "Strong ask",
          betterResponse: null,
        },
      ],
      summary: "Good session",
      nextFocus: {
        skill: "ASSERTIVENESS",
        reason: "Maintain confidence",
      },
    };

    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(rawEvaluation) } }],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 80,
            cost: 0.001,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(350),
    });

    const result = await provider.evaluateSimulation({
      model: "openai/gpt-5.6-luna-pro",
      messages: [{ role: "user", content: "transcript" }],
      timeoutMs: 30_000,
    });

    expect(result.evaluation).toEqual(rawEvaluation);
    expect(result.latencyMs).toBe(250);
    expect(result.inputTokens).toBe(150);
    expect(result.outputTokens).toBe(80);
    expect(result.estimatedCost).toBe(0.001);

    const [, init] = fetchImplementation.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "openai/gpt-5.6-luna-pro",
      response_format: { type: "json_object" },
      max_tokens: 12_000,
      provider: { zdr: true, data_collection: "deny" },
    });
  });

  it("transcribes audio with OpenRouter audio transcription endpoint", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "I am ready to discuss my compensation package.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: vi.fn().mockReturnValueOnce(200).mockReturnValueOnce(320),
    });

    const audioBuffer = Buffer.from("fake-audio-bytes");
    const result = await provider.transcribeAudio({
      model: "openai/whisper-large-v3-turbo",
      audioBuffer,
      mimeType: "audio/webm",
      fileName: "recording.webm",
      timeoutMs: 20_000,
    });

    expect(result).toEqual({
      text: "I am ready to discuss my compensation package.",
      latencyMs: 120,
      estimatedCost: null,
    });

    const [url, init] = fetchImplementation.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer secret-api-key",
    });
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("provider")).toBe(
      JSON.stringify({ zdr: true, data_collection: "deny" }),
    );
  });

  it("handles transcription failure safely without exposing sensitive info", async () => {
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation: vi.fn<typeof fetch>().mockResolvedValue(
        new Response("upstream raw error", {
          status: 502,
        }),
      ),
    });

    await expect(
      provider.transcribeAudio({
        model: "openai/whisper-large-v3-turbo",
        audioBuffer: Buffer.from("audio"),
        mimeType: "audio/webm",
        timeoutMs: 20_000,
      }),
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_ERROR",
      message: "AI provider request failed.",
    });
  });

  it("generates MP3 speech as raw bytes", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(220),
    });
    const result = await provider.generateSpeech({
      model: "hexgrad/kokoro-82m",
      text: "Stored assistant reply",
      timeoutMs: 15_000,
    });
    expect(result.audio).toEqual(Buffer.from([1, 2, 3]));
    const [url, init] = fetchImplementation.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/audio/speech");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "hexgrad/kokoro-82m",
      input: "Stored assistant reply",
      voice: "af_heart",
      response_format: "mp3",
    });
  });

  it("aborts transcription on timeout", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn(
      (...args: Parameters<typeof fetch>) =>
        new Promise<Response>((_resolve, reject) => {
          const init = args[1];
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Transcription timeout", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;

    const provider = createOpenRouterProvider({
      apiKey: "secret-api-key",
      fetchImplementation,
      clock: () => Date.now(),
    });

    const pending = provider.transcribeAudio({
      model: "openai/whisper-large-v3-turbo",
      audioBuffer: Buffer.from("audio"),
      mimeType: "audio/webm",
      timeoutMs: 50,
    });

    const assertion = expect(pending).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      message: "AI request timed out.",
    });

    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
