import type { AttemptStatus } from "@kalemny/contracts";

export interface SpeechTurnRecord {
  assistantText: string | null;
  attemptStatus: AttemptStatus;
  language?: "en" | "ar";
  dialect?: "EGYPTIAN" | "GULF" | null;
  personaRole?: string;
  personaGender?: "MALE" | "FEMALE";
}

export interface TtsUsageInput {
  userId: string;
  attemptId: string;
  provider?: string;
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
