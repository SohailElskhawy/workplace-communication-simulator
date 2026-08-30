import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../../generated/prisma/client.js";

export interface DatabasePoolOptions {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface DatabaseConnection {
  prisma: PrismaClient;
  pool: pg.Pool;
  disconnect(): Promise<void>;
}

export function createDatabaseConnection(
  databaseUrl: string,
  options: DatabasePoolOptions = {},
): DatabaseConnection {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    pool,
    async disconnect() {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}

export function createPrismaClient(
  databaseUrl: string,
  options: DatabasePoolOptions = {},
): PrismaClient {
  return createDatabaseConnection(databaseUrl, options).prisma;
}

