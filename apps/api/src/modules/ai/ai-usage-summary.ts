export type UsageOperation =
  "ROLEPLAY" | "EVALUATION" | "TRANSCRIPTION" | "TTS";

export interface SafeUsageEvent {
  attemptId: string | null;
  estimatedCost: number | string | null;
  operation: UsageOperation;
}

export function summarizeAiUsage(events: SafeUsageEvent[]) {
  const byOperation: Record<UsageOperation, number> = {
    ROLEPLAY: 0,
    EVALUATION: 0,
    TRANSCRIPTION: 0,
    TTS: 0,
  };
  const byAttempt: Record<string, number> = {};
  for (const event of events) {
    const cost = event.estimatedCost === null ? 0 : Number(event.estimatedCost);
    if (!Number.isFinite(cost) || cost < 0) continue;
    byOperation[event.operation] += cost;
    if (event.attemptId)
      byAttempt[event.attemptId] = (byAttempt[event.attemptId] ?? 0) + cost;
  }
  return {
    byOperation,
    byAttempt,
    total: Object.values(byOperation).reduce((sum, cost) => sum + cost, 0),
  };
}
