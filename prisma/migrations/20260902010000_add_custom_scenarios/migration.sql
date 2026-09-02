-- AlterEnum
ALTER TYPE "AiOperation" ADD VALUE 'SCENARIO_GENERATION';

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN "userId" UUID;

-- CreateIndex
CREATE INDEX "Scenario_userId_isActive_idx" ON "Scenario"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
