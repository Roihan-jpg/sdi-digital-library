import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError } from '../errors/app-error.js';

export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', `Endpoint ${req.method} ${req.path} tidak ditemukan.`));
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const malformedJson =
      error instanceof SyntaxError &&
      'status' in error &&
      (error as SyntaxError & { status?: number }).status === 400;

    const appError =
      error instanceof AppError
        ? error
        : malformedJson
          ? new AppError(400, 'INVALID_JSON', 'Body JSON tidak valid.')
          : new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server.');

    const log = appError.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log({ err: error, requestId: req.id, method: req.method, path: req.path }, appError.message);

    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.id,
      },
    });
  };
}

