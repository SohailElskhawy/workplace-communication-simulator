import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

import { createApp } from "./app.js";
import { parseApiEnv } from "./config/env.js";
import { createDatabaseConnection } from "./infrastructure/database/prisma.js";
import { logger } from "./infrastructure/logging/logger.js";
import { initializeApiMonitoring } from "./infrastructure/monitoring/sentry.js";
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
import { createPrismaVoiceRepository } from "./modules/voice/prisma-voice-repository.js";
import { createVoiceService } from "./modules/voice/voice-service.js";
import { createPrismaTtsRepository } from "./modules/tts/prisma-tts-repository.js";
import { createTtsService } from "./modules/tts/tts-service.js";
import { createElevenLabsProvider } from "./modules/realtime/elevenlabs-provider.js";
import { createRealtimeVoiceService } from "./modules/realtime/realtime-service.js";

const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const apiEnv = parseApiEnv(process.env);

const captureException = initializeApiMonitoring({
  dsn: apiEnv.SENTRY_DSN,
  environment: apiEnv.SENTRY_ENVIRONMENT ?? apiEnv.NODE_ENV,
  release: apiEnv.SENTRY_RELEASE,
});

const db = createDatabaseConnection(apiEnv.DATABASE_URL);

const prisma = db.prisma;

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
  transcriptionModel: apiEnv.TRANSCRIPTION_MODEL,
  transcriptionTimeoutMs: apiEnv.TRANSCRIPTION_TIMEOUT_MS,
  ttsModel: apiEnv.TTS_MODEL,
  ttsTimeoutMs: apiEnv.TTS_TIMEOUT_MS,
});

const attemptRepository = createPrismaAttemptRepository(prisma);

const attemptService = createAttemptService(attemptRepository, aiService);

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

const voiceService = createVoiceService(
  createPrismaVoiceRepository(prisma),
  aiService,
);

const ttsService = createTtsService(
  createPrismaTtsRepository(prisma),
  aiService,
);

// Realtime voice bootstrap: enabled only when all server-only ElevenLabs
// settings are configured. Absent configuration leaves text/STT/TTS flows
// untouched and the realtime endpoints unregistered.
const elevenLabsToolSecret = apiEnv.ELEVENLABS_TOOL_SECRET;
const realtimeVoiceService =
  apiEnv.ELEVENLABS_API_KEY &&
  apiEnv.ELEVENLABS_AGENT_ID &&
  elevenLabsToolSecret
    ? createRealtimeVoiceService({
        repository: attemptRepository,
        elevenLabsProvider: createElevenLabsProvider({
          apiKey: apiEnv.ELEVENLABS_API_KEY,
          agentId: apiEnv.ELEVENLABS_AGENT_ID,
        }),
        contextTokenSecret: elevenLabsToolSecret,
        agentId: apiEnv.ELEVENLABS_AGENT_ID,
      })
    : undefined;

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
  voiceService,
  ttsService,
  ...(realtimeVoiceService && elevenLabsToolSecret
    ? { realtimeVoiceService, elevenLabsToolSecret }
    : {}),
  webOrigin: apiEnv.WEB_ORIGIN,
  logger,
  captureException,
  generalRateLimit: {
    windowMs: apiEnv.GENERAL_RATE_LIMIT_WINDOW_MS,
    limit: apiEnv.GENERAL_RATE_LIMIT_MAX,
  },
  aiRateLimit: {
    windowMs: apiEnv.AI_RATE_LIMIT_WINDOW_MS,
    limit: apiEnv.AI_RATE_LIMIT_MAX,
  },
});

const server = app.listen(apiEnv.PORT, () => {
  logger.info({ event: "api_started", status: apiEnv.PORT });
});

const shutdown = (signal: string) => {
  logger.info({ event: "api_shutdown_started", operation: signal });
  server.close(async () => {
    await db.disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
