import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

// Serverless-friendly tuning appended to DATABASE_URL unless already set:
// - connection_limit: bound the pool so many short-lived function instances do
//   not exhaust the database's connection budget.
// - pool_timeout: fail fast when no connection is free instead of hanging ~10s.
// - connect_timeout: fail fast when the database cannot be reached.
const SERVERLESS_PARAMS = { connection_limit: '5', pool_timeout: '5', connect_timeout: '10' };

function serverlessUrl(url) {
  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(SERVERLESS_PARAMS)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const prisma = new PrismaClient({
  datasources: { db: { url: serverlessUrl(config.databaseUrl) } },
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
