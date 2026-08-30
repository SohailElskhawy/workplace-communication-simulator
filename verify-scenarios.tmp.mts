import "dotenv/config";

import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const prisma = new PrismaClient();
const rows = await prisma.scenario.findMany({
  orderBy: [{ key: "asc" }, { version: "asc" }],
  select: { key: true, version: true, isActive: true },
});
console.log(JSON.stringify(rows));
await prisma.$disconnect();
