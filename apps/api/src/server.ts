import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

import { createApp } from "./app.js";
import { parseApiEnv } from "./config/env.js";
import { createPrismaClient } from "./infrastructure/database/prisma.js";
import { createAiService } from "./modules/ai/ai-service.js";
import { createOpenRouterProvider } from "./modules/ai/openrouter-provider.js";
import {
  createClerkAuthenticationMiddleware,
  resolveClerkUserId,
} from "./modules/auth/clerk-auth.js";
import { createAttemptService } from "./modules/attempts/attempt-service.js";
import { createPrismaAttemptRepository } from "./modules/attempts/prisma-attempt-repository.js";
import { createEvaluationService } from "./modules/evaluations/evaluation-service.js";
import { createPrismaEvaluationRepository } from "./modules/evaluations/prisma-evaluation-repository.js";
import { createHistoryService } from "./modules/history/history-service.js";
import { createPrismaHistoryRepository } from "./modules/history/prisma-history-repository.js";
import { createPrismaProgressRepository } from "./modules/progress/prisma-progress-repository.js";
import { createProgressService } from "./modules/progress/progress-service.js";
import { createPrismaScenarioRepository } from "./modules/scenarios/prisma-scenario-repository.js";
import { createScenarioService } from "./modules/scenarios/scenario-service.js";
import { createLocalUserProvisioner } from "./modules/users/provision-local-user.js";

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const apiEnv = parseApiEnv(process.env);
const prisma = createPrismaClient(apiEnv.DATABASE_URL);
const userProvisioner = createLocalUserProvisioner({
  upsert: (args) => prisma.user.upsert(args),
});
const scenarioService = createScenarioService(
  createPrismaScenarioRepository(prisma),
);
const aiService = createAiService({
  provider: createOpenRouterProvider({ apiKey: apiEnv.OPENROUTER_API_KEY }),
  roleplayModel: apiEnv.ROLEPLAY_MODEL,
  roleplayPromptVersion: apiEnv.ROLEPLAY_PROMPT_VERSION,
  roleplayTimeoutMs: apiEnv.ROLEPLAY_TIMEOUT_MS,
  evaluationModel: apiEnv.EVALUATION_MODEL,
  evaluationPromptVersion: apiEnv.EVALUATION_PROMPT_VERSION,
  evaluationTimeoutMs: apiEnv.EVALUATION_TIMEOUT_MS,
});
const attemptService = createAttemptService(
  createPrismaAttemptRepository(prisma),
  aiService,
);
const evaluationService = createEvaluationService(
  createPrismaEvaluationRepository(prisma),
  aiService,
);
const historyService = createHistoryService(
  createPrismaHistoryRepository(prisma),
);
const progressService = createProgressService(
  createPrismaProgressRepository(prisma),
);

const app = createApp({
  attemptService,
  authenticationMiddleware: createClerkAuthenticationMiddleware({
    publishableKey: apiEnv.CLERK_PUBLISHABLE_KEY,
    secretKey: apiEnv.CLERK_SECRET_KEY,
  }),
  evaluationService,
  historyService,
  progressService,
  resolveAuthProviderUserId: resolveClerkUserId,
  scenarioService,
  userProvisioner,
  webOrigin: apiEnv.WEB_ORIGIN,
});

const server = app.listen(apiEnv.PORT, () => {
  console.log(`API listening on port ${apiEnv.PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
