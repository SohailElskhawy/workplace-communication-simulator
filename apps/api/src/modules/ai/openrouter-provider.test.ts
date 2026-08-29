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
      provider: { zdr: true, data_collection: "deny" },
    });
  });
});
