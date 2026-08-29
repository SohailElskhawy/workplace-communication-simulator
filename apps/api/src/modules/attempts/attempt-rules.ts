import type { AttemptStatus } from "@kalemny/contracts";

export const ATTEMPT_DURATION_MS = 15 * 60 * 1000;
export const MAX_LEARNER_TURNS = 20;

export interface TurnAcceptanceSnapshot {
  status: AttemptStatus;
  expiresAt: Date;
  learnerTurnCount: number;
  hasPendingTurn: boolean;
}

export type TurnRejectionCode =
  "INVALID_ATTEMPT_STATE" | "SESSION_LIMIT_REACHED" | "TURN_ALREADY_PENDING";

export function getTurnRejection(
  snapshot: TurnAcceptanceSnapshot,
  currentTime: Date,
): TurnRejectionCode | null {
  if (snapshot.status !== "ACTIVE") {
    return "INVALID_ATTEMPT_STATE";
  }

  if (
    currentTime.getTime() >= snapshot.expiresAt.getTime() ||
    snapshot.learnerTurnCount >= MAX_LEARNER_TURNS
  ) {
    return "SESSION_LIMIT_REACHED";
  }

  if (snapshot.hasPendingTurn) {
    return "TURN_ALREADY_PENDING";
  }

  return null;
}

export function getFinishStatus(
  currentStatus: AttemptStatus,
  learnerTurnCount: number,
): AttemptStatus {
  if (currentStatus !== "ACTIVE") {
    return currentStatus;
  }

  return learnerTurnCount === 0 ? "ABANDONED" : "EVALUATING";
}
