import "dotenv/config";

import { defineConfig } from "prisma/config";

const migrationDatabaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://prisma:prisma@localhost:5432/kalemny";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
