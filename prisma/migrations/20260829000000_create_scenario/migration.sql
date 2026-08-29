CREATE TABLE "Scenario" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Scenario_version_check" CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "Scenario_key_version_key" ON "Scenario"("key", "version");
CREATE INDEX "Scenario_key_isActive_idx" ON "Scenario"("key", "isActive");
