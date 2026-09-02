import { describe, expect, it } from "vitest";

import {
  BindRealtimeConversationRequestSchema,
  BindRealtimeConversationResponseSchema,
  RealtimeSessionResponseSchema,
  SubmitRealtimeTranscriptRequestSchema,
} from "./realtime.js";

describe("Realtime contracts", () => {
  const validResponse = {
    data: {
      attemptId: "0f0a6b70-6fbd-4c02-9e57-2f4b6f0f1f01",
      agentId: "agent_example",
      conversationToken: "elevenlabs-conversationToken",
      contextToken: "payload.signature",
      contextTokenExpiresAt: "2026-08-30T10:10:00.000Z",
      scenario: {
        key: "salary-negotiation",
        version: 2,
        title: "Salary Negotiation",
      },
      difficulty: "MEDIUM",
      openingMessage: "Thanks for making time today.",
      expiresAt: "2026-08-30T10:15:00.000Z",
    },
  };

  it("validates a realtime session response", () => {
    expect(RealtimeSessionResponseSchema.safeParse(validResponse).success).toBe(
      true,
    );
  });

  it("rejects responses with missing credentials or hidden fields", () => {
    expect(
      RealtimeSessionResponseSchema.safeParse({
        data: { ...validResponse.data, conversationToken: "" },
      }).success,
    ).toBe(false);

    expect(
      RealtimeSessionResponseSchema.safeParse({
        data: { ...validResponse.data, systemPrompt: "hidden prompt" },
      }).success,
    ).toBe(false);

    expect(
      RealtimeSessionResponseSchema.safeParse({
        data: { ...validResponse.data, difficulty: "IMPOSSIBLE" },
      }).success,
    ).toBe(false);
  });

  it("validates only a bounded conversation ID for binding", () => {
    expect(
      BindRealtimeConversationRequestSchema.safeParse({
        conversationId: "conv_example",
      }).success,
    ).toBe(true);
    expect(
      BindRealtimeConversationRequestSchema.safeParse({
        conversationId: " ",
      }).success,
    ).toBe(false);
    expect(
      BindRealtimeConversationResponseSchema.safeParse({
        data: {
          attemptId: validResponse.data.attemptId,
          conversationId: "conv_example",
        },
      }).success,
    ).toBe(true);
  });

  it("validates realtime transcript submissions including empty turns", () => {
    expect(
      SubmitRealtimeTranscriptRequestSchema.safeParse({
        conversationId: "conv_example",
        turns: [],
      }).success,
    ).toBe(true);

    expect(
      SubmitRealtimeTranscriptRequestSchema.safeParse({
        conversationId: "conv_example",
        turns: [{ userText: "Hello", assistantText: "Hi there" }],
      }).success,
    ).toBe(true);

    expect(
      SubmitRealtimeTranscriptRequestSchema.safeParse({
        conversationId: "conv_example",
        turns: [{ userText: "Hello", assistantText: null }],
      }).success,
    ).toBe(true);
  });
});
