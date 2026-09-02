-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS', 'PRO');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "plan" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN "planExpiresAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "PracticeUsageLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attemptId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeUsageLedger_userId_createdAt_idx" ON "PracticeUsageLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeUsageLedger_attemptId_idx" ON "PracticeUsageLedger"("attemptId");

-- AddForeignKey
ALTER TABLE "PracticeUsageLedger" ADD CONSTRAINT "PracticeUsageLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeUsageLedger" ADD CONSTRAINT "PracticeUsageLedger_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimulationAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
