import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import { createLogger } from './config/logger.js';

const config = loadEnvironment();
const logger = createLogger(config);
const server = createServer(createApp(config, logger));
let isShuttingDown = false;

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT, apiBasePath: config.API_BASE_PATH }, 'API siap menerima request');
});

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown dimulai');
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Server gagal ditutup dengan bersih');
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    logger.warn('Batas waktu shutdown tercapai; koneksi tersisa ditutup');
    server.closeAllConnections();
  }, 10_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled promise rejection');
  process.exit(1);
});

