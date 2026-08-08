import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import {
  auditFiltersSchema,
  auditIdSchema,
  librarySettingsUpdateSchema,
  systemEventFiltersSchema,
} from './administration.schema.js';
import type { AdministrationServicePort } from './administration.types.js';

export type { AdministrationServicePort } from './administration.types.js';

export function createSettingsRouter(auth: AuthServicePort, service: AdministrationServicePort): Router {
  const router = Router();
  router.use(authenticate(auth), authorize('master_admin'));
  router.get('/library', async (_req, res) => res.json({ data: await service.getSettings() }));
  router.patch('/library', async (req, res) => {
    const parsed = librarySettingsUpdateSchema.parse(req.body);
    const update = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    ) as Parameters<AdministrationServicePort['updateSettings']>[1];
    res.json({ data: await service.updateSettings(req.auth!, update) });
  });
  return router;
}

export function createAuditLogRouter(auth: AuthServicePort, service: AdministrationServicePort): Router {
  const router = Router();
  router.use(authenticate(auth), authorize('master_admin'));
  router.get('/', async (req, res) => {
    const result = await service.listAuditLogs(auditFiltersSchema.parse(req.query));
    res.json({ data: result.items, pagination: { page: result.page, limit: result.limit, total: result.total } });
  });
  router.get('/:id', async (req, res) => {
    const item = await service.getAuditLog(auditIdSchema.parse(req.params['id']));
    res.json({ data: { ...item, oldData: redactAuditData(item.oldData), newData: redactAuditData(item.newData) } });
  });
  return router;
}

export function createSystemRouter(auth: AuthServicePort, service: AdministrationServicePort): Router {
  const router = Router();
  router.use(authenticate(auth), authorize('master_admin'));
  router.get('/status', async (_req, res) => res.json({ data: await service.getSystemStatus() }));
  return router;
}

export function createSystemEventRouter(auth: AuthServicePort, service: AdministrationServicePort): Router {
  const router = Router();
  router.use(authenticate(auth), authorize('master_admin'));
  router.get('/', async (req, res) => {
    const result = await service.listSystemEvents(systemEventFiltersSchema.parse(req.query));
    res.json({ data: result.items, pagination: { page: result.page, limit: result.limit, total: result.total } });
  });
  return router;
}

const removedKeys = /(?:password|token|secret|service_role|private_key|signed_url|file_path|avatar_path)/i;
const maskedKeys = /^(?:email|phone|nis|nisn|card_number|student_card_number|library_card_number)$/i;

export function redactAuditData(value: unknown, key = ''): unknown {
  if (removedKeys.test(key)) return '[DIHAPUS]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactAuditData(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactAuditData(entryValue, entryKey),
      ]),
    );
  }
  if (maskedKeys.test(key) && typeof value === 'string') return maskValue(key, value);
  return value;
}

function maskValue(key: string, value: string): string {
  if (/email/i.test(key)) {
    const [local = '', domain] = value.split('@');
    if (!domain) return '*'.repeat(Math.max(1, value.length - 4)) + value.slice(-4);
    const first = local.slice(0, 1);
    const last = local.length > 1 ? local.slice(-1) : '';
    return `${first}***${last}@${domain}`;
  }
  return '*'.repeat(Math.max(1, value.length - 4)) + value.slice(-4);
}
