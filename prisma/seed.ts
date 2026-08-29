import "dotenv/config";

import { createPrismaClient } from "../apps/api/src/infrastructure/database/prisma.js";
import { createPrismaScenarioSyncStore } from "../apps/api/src/modules/scenarios/prisma-scenario-sync-store.js";
import { syncScenarioDefinitions } from "../apps/api/src/modules/scenarios/sync-scenarios.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to synchronize scenarios.");
}

const prisma = createPrismaClient(databaseUrl);

try {
  await syncScenarioDefinitions(createPrismaScenarioSyncStore(prisma));
  console.log("Scenario definitions synchronized successfully.");
} finally {
  await prisma.$disconnect();
}
