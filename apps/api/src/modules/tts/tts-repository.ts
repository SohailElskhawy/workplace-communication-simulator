import type { AttemptStatus } from "@kalemny/contracts";

export interface SpeechTurnRecord {
  assistantText: string | null;
  attemptStatus: AttemptStatus;
  language?: ("en" | "ar") | undefined;
  dialect?: ("EGYPTIAN" | "GULF" | null) | undefined;
  personaRole?: string | undefined;
  personaGender?: ("MALE" | "FEMALE") | undefined;
}

export interface TtsUsageInput {
  userId: string;
  attemptId: string;
  provider?: string | undefined;
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
