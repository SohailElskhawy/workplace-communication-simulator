-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('ACTIVE', 'EVALUATING', 'COMPLETED', 'EVALUATION_FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "InputMethod" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "TurnStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SimulationAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "retryOfAttemptId" UUID,
    "difficulty" "Difficulty" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "progressEligible" BOOLEAN NOT NULL DEFAULT false,
    "evaluationStartedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "clientRequestId" VARCHAR(128) NOT NULL,
    "inputMethod" "InputMethod" NOT NULL,
    "userText" TEXT NOT NULL,
    "assistantText" TEXT,
    "status" "TurnStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConversationTurn_sequence_check" CHECK ("sequence" >= 1)
);

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_createdAt_idx" ON "SimulationAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationAttempt_userId_status_idx" ON "SimulationAttempt"("userId", "status");

-- CreateIndex
CREATE INDEX "SimulationAttempt_retryOfAttemptId_idx" ON "SimulationAttempt"("retryOfAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTurn_attemptId_sequence_key" ON "ConversationTurn"("attemptId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTurn_attemptId_clientRequestId_key" ON "ConversationTurn"("attemptId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTurn_one_pending_per_attempt" ON "ConversationTurn"("attemptId") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_retryOfAttemptId_fkey" FOREIGN KEY ("retryOfAttemptId") REFERENCES "SimulationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimulationAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
