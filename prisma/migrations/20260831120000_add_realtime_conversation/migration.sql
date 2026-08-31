-- CreateTable
CREATE TABLE "RealtimeConversation" (
    "id" UUID NOT NULL,
    "conversationId" VARCHAR(128) NOT NULL,
    "attemptId" UUID NOT NULL,
    "transcriptImportedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RealtimeConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RealtimeConversation_conversationId_key" ON "RealtimeConversation"("conversationId");

-- CreateIndex
CREATE INDEX "RealtimeConversation_attemptId_idx" ON "RealtimeConversation"("attemptId");

-- AddForeignKey
ALTER TABLE "RealtimeConversation" ADD CONSTRAINT "RealtimeConversation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimulationAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
