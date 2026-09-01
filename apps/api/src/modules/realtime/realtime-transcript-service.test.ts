import { describe, expect, it, vi } from "vitest";

import {
  normalizeElevenLabsTranscript,
  type ElevenLabsPostCallTranscription,
} from "./elevenlabs-webhook.js";
import { createRealtimeTranscriptService } from "./realtime-transcript-service.js";

const transcript: ElevenLabsPostCallTranscription["data"]["transcript"] = [
  { role: "agent", message: "Welcome." },
  { role: "agent", message: null, tool_calls: [{ name: "context" }] },
  { role: "user", message: "I would like to discuss my salary." },
  { role: "agent", message: "Tell me more." },
  { role: "user", message: "I delivered the migration." },
  { role: "user", message: "And I would like a specific range." },
  { role: "agent", message: "What range are you considering?" },
  { role: "user", message: "I am targeting 90,000." },
];

describe("normalizeElevenLabsTranscript", () => {
  it("omits the opening/tool entries and pairs finalized speech", () => {
    expect(normalizeElevenLabsTranscript("conv_example", transcript)).toEqual([
      {
        clientRequestId: "realtime:conv_example:2",
        userText: "I would like to discuss my salary.",
        assistantText: "Tell me more.",
        status: "COMPLETED",
      },
      {
        clientRequestId: "realtime:conv_example:4",
        userText: "I delivered the migration.",
        assistantText: null,
        status: "FAILED",
      },
      {
        clientRequestId: "realtime:conv_example:5",
        userText: "And I would like a specific range.",
        assistantText: "What range are you considering?",
        status: "COMPLETED",
      },
      {
        clientRequestId: "realtime:conv_example:7",
        userText: "I am targeting 90,000.",
        assistantText: null,
        status: "FAILED",
      },
    ]);
  });

  it("passes normalized transcript data to one importer call", async () => {
    const repository = {
      importTranscript: vi.fn().mockResolvedValue("imported"),
    };
    const service = createRealtimeTranscriptService(
      repository,
      () => new Date("2026-08-31T10:00:00.000Z"),
    );
    await service.importPostCallTranscription({
      type: "post_call_transcription",
      event_timestamp: 1,
      data: {
        agent_id: "agent_example",
        conversation_id: "conv_example",
        transcript,
      },
    });
    expect(repository.importTranscript).toHaveBeenCalledTimes(1);
    expect(repository.importTranscript.mock.calls[0]?.[0]).toBe("conv_example");
  });
});
