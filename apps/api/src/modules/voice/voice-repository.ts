import type { AttemptStatus } from "@kalemny/contracts";

export interface VoiceAttemptRecord {
  id: string;
  status: AttemptStatus;
  expiresAt: Date;
}

export interface VoiceUsageRecordInput {
  userId: string;
  attemptId: string;
  provider: "openrouter";
  model: string;
  status: "SUCCESS" | "FAILED";
  latencyMs: number;
  audioDurationMs?: number | null;
  estimatedCost?: number | null;
  errorCode?: string | null;
}

export interface VoiceRepository {
  findAttemptForTranscription(
    attemptId: string,
    userId: string,
  ): Promise<VoiceAttemptRecord | null>;
  recordTranscriptionUsage(input: VoiceUsageRecordInput): Promise<void>;
}
