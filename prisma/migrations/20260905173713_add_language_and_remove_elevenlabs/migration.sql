/*
  Warnings:

  - You are about to drop the `RealtimeConversation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RealtimeConversation" DROP CONSTRAINT "RealtimeConversation_attemptId_fkey";

-- AlterTable
ALTER TABLE "SimulationAttempt" ADD COLUMN     "dialect" VARCHAR(20),
ADD COLUMN     "language" VARCHAR(10) NOT NULL DEFAULT 'en';

-- DropTable
DROP TABLE "RealtimeConversation";
