import { describe, expect, it, vi } from "vitest";

import { createElevenLabsProvider } from "./elevenlabs-provider.js";

const API_KEY = "el-api-key-example";
const AGENT_ID = "agent_example";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("createElevenLabsProvider", () => {
  it("requests a conversation token for the configured agent", async () => {
    const fetchImplementation = vi.fn(async () =>
      okResponse({ token: "twilio-webrtc-token" }),
    );
    const provider = createElevenLabsProvider({
      apiKey: API_KEY,
      agentId: AGENT_ID,
      fetchImplementation,
      clock: () => 0,
    });

    const result = await provider.issueConversationToken({ timeoutMs: 5_000 });

    expect(result).toEqual({ token: "twilio-webrtc-token", latencyMs: 0 });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImplementation.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.origin).toBe("https://api.elevenlabs.io");
    expect(url.pathname).toBe("/v1/convai/conversation/token");
    expect(url.searchParams.get("agent_id")).toBe(AGENT_ID);
    expect(new Headers(init.headers).get("xi-api-key")).toBe(API_KEY);
  });

  it("maps non-2xx responses to AI_PROVIDER_ERROR", async () => {
    const provider = createElevenLabsProvider({
      apiKey: API_KEY,
      agentId: AGENT_ID,
      fetchImplementation: async () => new Response("nope", { status: 401 }),
      clock: () => 0,
    });

    await expect(
      provider.issueConversationToken({ timeoutMs: 5_000 }),
    ).rejects.toMatchObject({
      name: "RealtimeProviderError",
      code: "AI_PROVIDER_ERROR",
    });
  });

  it("rejects responses without a token", async () => {
    const provider = createElevenLabsProvider({
      apiKey: API_KEY,
      agentId: AGENT_ID,
      fetchImplementation: async () => okResponse({ unexpected: true }),
      clock: () => 0,
    });

    await expect(
      provider.issueConversationToken({ timeoutMs: 5_000 }),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  });

  it("maps aborted requests to AI_TIMEOUT", async () => {
    vi.useFakeTimers();
    try {
      const provider = createElevenLabsProvider({
        apiKey: API_KEY,
        agentId: AGENT_ID,
        fetchImplementation: (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      });

      const assertion = expect(
        provider.issueConversationToken({ timeoutMs: 5_000 }),
      ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
      vi.advanceTimersByTime(5_001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps unexpected fetch failures to AI_PROVIDER_ERROR", async () => {
    const provider = createElevenLabsProvider({
      apiKey: API_KEY,
      agentId: AGENT_ID,
      fetchImplementation: async () => {
        throw new Error("network down");
      },
      clock: () => 0,
    });

    await expect(
      provider.issueConversationToken({ timeoutMs: 5_000 }),
    ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
  });
});
