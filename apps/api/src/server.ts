import { createApp } from "./app.js";
import { parseApiEnv } from "./config/env.js";
import { createPrismaClient } from "./infrastructure/database/prisma.js";
import {
  createClerkAuthenticationMiddleware,
  resolveClerkUserId,
} from "./modules/auth/clerk-auth.js";
import { createLocalUserProvisioner } from "./modules/users/provision-local-user.js";

const apiEnv = parseApiEnv(process.env);
const prisma = createPrismaClient(apiEnv.DATABASE_URL);
const userProvisioner = createLocalUserProvisioner({
  upsert: (args) => prisma.user.upsert(args),
});

const app = createApp({
  authenticationMiddleware: createClerkAuthenticationMiddleware({
    publishableKey: apiEnv.CLERK_PUBLISHABLE_KEY,
    secretKey: apiEnv.CLERK_SECRET_KEY,
  }),
  resolveAuthProviderUserId: resolveClerkUserId,
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
