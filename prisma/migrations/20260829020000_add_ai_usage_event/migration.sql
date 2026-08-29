-- CreateEnum
CREATE TYPE "AiOperation" AS ENUM ('ROLEPLAY', 'EVALUATION', 'TRANSCRIPTION', 'TTS');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "ConversationTurn" ADD COLUMN "generationStartedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attemptId" UUID,
    "operation" "AiOperation" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiUsageStatus" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "audioDurationMs" INTEGER,
    "estimatedCost" DECIMAL(18,12),
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AiUsageEvent_latencyMs_check" CHECK ("latencyMs" >= 0),
    CONSTRAINT "AiUsageEvent_inputTokens_check" CHECK ("inputTokens" IS NULL OR "inputTokens" >= 0),
    CONSTRAINT "AiUsageEvent_outputTokens_check" CHECK ("outputTokens" IS NULL OR "outputTokens" >= 0),
    CONSTRAINT "AiUsageEvent_audioDurationMs_check" CHECK ("audioDurationMs" IS NULL OR "audioDurationMs" >= 0),
    CONSTRAINT "AiUsageEvent_estimatedCost_check" CHECK ("estimatedCost" IS NULL OR "estimatedCost" >= 0)
);

-- CreateIndex
CREATE INDEX "AiUsageEvent_attemptId_createdAt_idx" ON "AiUsageEvent"("attemptId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageEvent_operation_createdAt_idx" ON "AiUsageEvent"("operation", "createdAt");

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimulationAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
