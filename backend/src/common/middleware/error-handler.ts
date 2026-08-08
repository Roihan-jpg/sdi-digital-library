import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../errors/app-error.js';

interface SystemEventRecorder {
  recordSystemEvent(event: {
    level: 'warning' | 'error';
    source: 'backend';
    eventCode: string;
    message: string;
    requestId?: string;
    actorUserId?: string;
    context: Record<string, unknown>;
  }): Promise<void>;
}

export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', `Endpoint ${req.method} ${req.path} tidak ditemukan.`));
  };
}

export function errorHandler(logger: Logger, recorder?: SystemEventRecorder): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const malformedJson =
      error instanceof SyntaxError &&
      'status' in error &&
      (error as SyntaxError & { status?: number }).status === 400;

    const appError =
      error instanceof AppError
        ? error
        : error instanceof ZodError
          ? new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.')
          : error instanceof MulterError
            ? new AppError(400, 'UPLOAD_LIMIT_EXCEEDED', 'Jumlah atau ukuran file melebihi batas.')
        : malformedJson
          ? new AppError(400, 'INVALID_JSON', 'Body JSON tidak valid.')
          : new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server.');

    const log = appError.statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    log({ err: error, requestId: req.id, method: req.method, path: req.path }, appError.message);

    if (recorder && appError.statusCode >= 500) {
      void recorder.recordSystemEvent({
        level: 'error',
        source: 'backend',
        eventCode: appError.code,
        message: appError.message,
        ...(req.id ? { requestId: String(req.id) } : {}),
        ...(req.auth?.user.id ? { actorUserId: req.auth.user.id } : {}),
        context: { method: req.method, path: req.path, statusCode: appError.statusCode },
      }).catch((recordError: unknown) => {
        logger.warn({ err: recordError, requestId: req.id }, 'Gagal mencatat event sistem.');
      });
    }

    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.id,
      },
    });
  };
}
