-- DropIndex
DROP INDEX "Evaluation_attemptId_idx";

-- CreateIndex
CREATE INDEX "ConversationTurn_attemptId_status_idx" ON "ConversationTurn"("attemptId", "status");

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_status_progressEligible_endedAt_idx" ON "SimulationAttempt"("userId", "status", "progressEligible", "endedAt" DESC);
