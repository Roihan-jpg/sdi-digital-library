import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { AppConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler.js';
import { requestId } from './common/middleware/request-id.js';
import { createHealthRouter } from './routes/health.routes.js';

export function createApp(config: AppConfig, logger: Logger): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(
    pinoHttp<Request, Response>({
      logger,
      customProps: (req) => ({ requestId: req.id }),
      customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: config.APP_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(express.json({ limit: config.JSON_BODY_LIMIT }));

  app.use(`${config.API_BASE_PATH}/health`, createHealthRouter());
  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return app;
}
