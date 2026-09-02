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
import {
  createEntitlementService,
  createPrismaEntitlementRepository,
} from "./modules/entitlements/entitlement-service.js";
import type { PlanLimits } from "./modules/entitlements/entitlement-rules.js";
import { createElevenLabsProvider } from "./modules/realtime/elevenlabs-provider.js";
import { createPrismaRealtimeTranscriptRepository } from "./modules/realtime/prisma-realtime-transcript-repository.js";
import { createRealtimeVoiceService } from "./modules/realtime/realtime-service.js";
import { createRealtimeTranscriptService } from "./modules/realtime/realtime-transcript-service.js";

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

const aiService = createAiService({
  provider: createOpenRouterProvider({
    apiKey: apiEnv.OPENROUTER_API_KEY,
    logger,
  }),
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

const planLimits: PlanLimits = {
  FREE: apiEnv.FREE_PLAN_WEEKLY_SIMULATION_LIMIT,
  PLUS: apiEnv.PLUS_PLAN_WEEKLY_SIMULATION_LIMIT ?? null,
  PRO: apiEnv.PRO_PLAN_WEEKLY_SIMULATION_LIMIT ?? null,
};

const entitlementRepository = createPrismaEntitlementRepository(prisma);
const entitlementService = createEntitlementService(
  entitlementRepository,
  planLimits,
);

const scenarioService = createScenarioService(
  createPrismaScenarioRepository(prisma),
  {
    aiService,
    entitlementService,
  },
);

const attemptRepository = createPrismaAttemptRepository(prisma, planLimits);

// Realtime voice bootstrap: enabled only when the server-only ElevenLabs
// settings are configured. Absent configuration leaves text/STT/TTS flows
// untouched and the realtime endpoints unregistered.
const elevenLabsAgentId = apiEnv.ELEVENLABS_AGENT_ID;
const elevenLabsProvider =
  apiEnv.ELEVENLABS_API_KEY && elevenLabsAgentId
    ? createElevenLabsProvider({
        apiKey: apiEnv.ELEVENLABS_API_KEY,
        agentId: elevenLabsAgentId,
      })
    : undefined;

const attemptService = createAttemptService(
  attemptRepository,
  aiService,
  undefined,
  undefined,
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

const voiceService = createVoiceService(
  createPrismaVoiceRepository(prisma),
  aiService,
);

const ttsService = createTtsService(
  createPrismaTtsRepository(prisma),
  aiService,
);

// Realtime session bootstrap (voice service): requires the tool secret in
// addition to the shared provider above. The transcript importer and pull
// sync are created next to the provider; the public webhook route below
// stays gated on the webhook secret.
const elevenLabsToolSecret = apiEnv.ELEVENLABS_TOOL_SECRET;
const realtimeVoiceService =
  elevenLabsAgentId && elevenLabsProvider && elevenLabsToolSecret
    ? createRealtimeVoiceService({
        repository: attemptRepository,
        elevenLabsProvider,
        contextTokenSecret: elevenLabsToolSecret,
        agentId: elevenLabsAgentId,
      })
    : undefined;
const realtimeTranscriptService =
  elevenLabsAgentId && apiEnv.ELEVENLABS_WEBHOOK_SECRET
    ? createRealtimeTranscriptService(
        createPrismaRealtimeTranscriptRepository(prisma),
      )
    : undefined;

const app = createApp({
  attemptService,
  authenticationMiddleware: createClerkAuthenticationMiddleware({
    publishableKey: apiEnv.CLERK_PUBLISHABLE_KEY,
    secretKey: apiEnv.CLERK_SECRET_KEY,
  }),
  entitlementService,
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
  ...(elevenLabsAgentId &&
  apiEnv.ELEVENLABS_WEBHOOK_SECRET &&
  realtimeTranscriptService
    ? {
        elevenLabsAgentId,
        elevenLabsWebhookSecret: apiEnv.ELEVENLABS_WEBHOOK_SECRET,
        realtimeTranscriptService,
      }
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
