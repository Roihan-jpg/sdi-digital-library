import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import type { AppRole, AuthServicePort } from './auth.types.js';

export function authenticate(authService: AuthServicePort): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authorization = req.header('authorization');
      const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
      if (!match?.[1]) {
        throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Silakan masuk untuk melanjutkan.');
      }

      req.auth = await authService.authenticate(match[1]);
      const passwordEndpointAllowed =
        req.baseUrl.endsWith('/auth') && ['/me', '/logout', '/password'].includes(req.path);
      if (req.auth.profile.mustChangePassword && !passwordEndpointAllowed) {
        throw new AppError(
          403,
          'PASSWORD_CHANGE_REQUIRED',
          'Ganti kata sandi sementara sebelum menggunakan fitur lain.',
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authorize(...allowedRoles: readonly AppRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Silakan masuk untuk melanjutkan.'));
      return;
    }

    if (!allowedRoles.includes(req.auth.profile.role)) {
      next(new AppError(403, 'ACCESS_DENIED', 'Anda tidak memiliki izin untuk aksi ini.'));
      return;
    }

    next();
  };
}
