import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const requestIdPattern = /^[a-zA-Z0-9._-]{1,100}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();

  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

