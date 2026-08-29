import type { AttemptStatus } from "@kalemny/contracts";

export interface SpeechTurnRecord {
  assistantText: string | null;
  attemptStatus: AttemptStatus;
}

export interface TtsUsageInput {
  userId: string;
  attemptId: string;
  model: string;
  status: "SUCCESS" | "FAILED";
  latencyMs: number;
  estimatedCost: number | null;
  errorCode: string | null;
}

export interface TtsRepository {
  findOwnedSpeechTurn(
    attemptId: string,
    turnId: string,
    userId: string,
  ): Promise<SpeechTurnRecord | null>;
  recordUsage(input: TtsUsageInput): Promise<void>;
}
