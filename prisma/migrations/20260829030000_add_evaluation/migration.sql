-- CreateEnum
CREATE TYPE "UniversalSkill" AS ENUM ('CLARITY', 'ASSERTIVENESS', 'EMPATHY', 'STRUCTURE', 'CONCISENESS');

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "clarity" INTEGER NOT NULL,
    "assertiveness" INTEGER NOT NULL,
    "empathy" INTEGER NOT NULL,
    "structure" INTEGER NOT NULL,
    "conciseness" INTEGER NOT NULL,
    "universalScore" INTEGER NOT NULL,
    "scenarioScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "objectiveResults" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "moments" JSONB NOT NULL,
    "nextFocusSkill" "UniversalSkill" NOT NULL,
    "nextFocusReason" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Evaluation_clarity_check" CHECK ("clarity" >= 0 AND "clarity" <= 100),
    CONSTRAINT "Evaluation_assertiveness_check" CHECK ("assertiveness" >= 0 AND "assertiveness" <= 100),
    CONSTRAINT "Evaluation_empathy_check" CHECK ("empathy" >= 0 AND "empathy" <= 100),
    CONSTRAINT "Evaluation_structure_check" CHECK ("structure" >= 0 AND "structure" <= 100),
    CONSTRAINT "Evaluation_conciseness_check" CHECK ("conciseness" >= 0 AND "conciseness" <= 100),
    CONSTRAINT "Evaluation_universalScore_check" CHECK ("universalScore" >= 0 AND "universalScore" <= 100),
    CONSTRAINT "Evaluation_scenarioScore_check" CHECK ("scenarioScore" >= 0 AND "scenarioScore" <= 100),
    CONSTRAINT "Evaluation_overallScore_check" CHECK ("overallScore" >= 0 AND "overallScore" <= 100)
);

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_attemptId_key" ON "Evaluation"("attemptId");

-- CreateIndex
CREATE INDEX "Evaluation_attemptId_idx" ON "Evaluation"("attemptId");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimulationAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
