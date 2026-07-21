import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { AppConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler.js';
import { requestId } from './common/middleware/request-id.js';
import { createHealthRouter } from './routes/health.routes.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter, createProfileRouter } from './modules/auth/auth.routes.js';
import { AuthService, ProfileService } from './modules/auth/auth.service.js';
import type { AuthServicePort, ProfileServicePort } from './modules/auth/auth.types.js';
import { createMasterDataRouter } from './modules/master-data/master-data.routes.js';
import { MasterDataService } from './modules/master-data/master-data.service.js';
import { createMemberRouter } from './modules/members/member.routes.js';
import { MemberService } from './modules/members/member.service.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { CatalogService } from './modules/catalog/catalog.service.js';
import { createImportRouter } from './modules/imports/import.routes.js';
import { ImportService } from './modules/imports/import.service.js';
import {
  createCirculationRouter,
  createReservationRouter,
  createVisitRouter,
} from './modules/circulation/circulation.routes.js';
import { CirculationService } from './modules/circulation/circulation.service.js';
import { createDigitalLibraryRouter } from './modules/digital-library/digital-library.routes.js';
import { DigitalLibraryService } from './modules/digital-library/digital-library.service.js';

export interface AppDependencies {
  authService: AuthServicePort;
  profileService: ProfileServicePort;
}

export function createApp(
  config: AppConfig,
  logger: Logger,
  dependencyOverrides: Partial<AppDependencies> = {},
): Express {
  const app = express();
  const repository = new AuthRepository(config);
  const authService = dependencyOverrides.authService ?? new AuthService(repository);
  const profileService = dependencyOverrides.profileService ?? new ProfileService(repository);
  const circulationService = new CirculationService(config);

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
  app.use(`${config.API_BASE_PATH}/auth`, createAuthRouter(authService));
  app.use(`${config.API_BASE_PATH}/profiles`, createProfileRouter(authService, profileService));
  app.use(`${config.API_BASE_PATH}/master-data`, createMasterDataRouter(authService, new MasterDataService(config)));
  app.use(`${config.API_BASE_PATH}/members`, createMemberRouter(authService, new MemberService(config)));
  app.use(`${config.API_BASE_PATH}/catalog`, createCatalogRouter(authService, new CatalogService(config)));
  app.use(`${config.API_BASE_PATH}/imports`, createImportRouter(authService, new ImportService(config)));
  app.use(`${config.API_BASE_PATH}/circulation`, createCirculationRouter(authService, circulationService));
  app.use(`${config.API_BASE_PATH}/reservations`, createReservationRouter(authService, circulationService));
  app.use(`${config.API_BASE_PATH}/visits`, createVisitRouter(authService, circulationService));
  app.use(
    `${config.API_BASE_PATH}/digital-library`,
    createDigitalLibraryRouter(authService, new DigitalLibraryService(config)),
  );
  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return app;
}
