import { createApp } from './app.js';
import { config } from './config.js';
import { disconnectPrisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[deis-api] listening on http://localhost:${config.port} (${config.env})`);
});

async function shutdown(signal) {
  console.log(`[deis-api] ${signal} received, shutting down`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));