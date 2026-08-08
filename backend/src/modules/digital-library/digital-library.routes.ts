import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../../common/errors/app-error.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import {
  digitalActionSchema,
  digitalCatalogQuerySchema,
  digitalCollectionInputSchema,
  idSchema,
  slugSchema,
} from './digital-library.schema.js';
import type { AuthContext } from '../auth/auth.types.js';
import type { DigitalAction, DigitalCatalogQuery, DigitalCollectionInput } from './digital-library.schema.js';

export interface DigitalLibraryServicePort {
  listPublic(query: DigitalCatalogQuery): Promise<{ items: unknown[]; total: number }>;
  getPublic(slug: string): Promise<unknown>;
  listManagement(): Promise<unknown[]>;
  create(context: AuthContext, input: DigitalCollectionInput, file: Express.Multer.File, cover?: Express.Multer.File): Promise<unknown>;
  update(context: AuthContext, id: string, input: DigitalCollectionInput, file?: Express.Multer.File, cover?: Express.Multer.File): Promise<unknown>;
  remove(context: AuthContext, id: string): Promise<void>;
  access(context: AuthContext, id: string, action: DigitalAction): Promise<unknown>;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 2, fields: 20 },
});

export function createDigitalLibraryRouter(
  authService: AuthServicePort,
  service: DigitalLibraryServicePort,
) {
  const router = Router();
  router.get('/', async (req, res) => {
    const query = digitalCatalogQuerySchema.parse(req.query);
    const result = await service.listPublic(query);
    res.json({
      data: result.items,
      pagination: { page: query.page, limit: query.limit, total: result.total },
    });
  });
  router.get(
    '/management',
    authenticate(authService),
    authorize('head_librarian', 'librarian'),
    async (_req, res) => res.json({ data: await service.listManagement() }),
  );
  router.post(
    '/',
    authenticate(authService),
    authorize('librarian'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
    async (req, res) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = files?.['file']?.[0];
      if (!file) throw new AppError(400, 'DIGITAL_FILE_REQUIRED', 'File utama wajib dipilih.');
      res.status(201).json({
        data: await service.create(
          req.auth!,
          digitalCollectionInputSchema.parse(req.body),
          file,
          files?.['cover']?.[0],
        ),
      });
    },
  );
  router.put(
    '/:id',
    authenticate(authService),
    authorize('librarian'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
    async (req, res) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      res.json({
        data: await service.update(
          req.auth!,
          idSchema.parse(req.params['id']),
          digitalCollectionInputSchema.parse(req.body),
          files?.['file']?.[0],
          files?.['cover']?.[0],
        ),
      });
    },
  );
  router.delete(
    '/:id',
    authenticate(authService),
    authorize('librarian'),
    async (req, res) => {
      await service.remove(req.auth!, idSchema.parse(req.params['id']));
      res.status(204).send();
    },
  );
  router.post('/:id/access', authenticate(authService), async (req, res) => {
    res.json({
      data: await service.access(
        req.auth!,
        idSchema.parse(req.params['id']),
        digitalActionSchema.parse(req.body).action,
      ),
    });
  });
  router.get('/:slug', async (req, res) => {
    res.json({ data: await service.getPublic(slugSchema.parse(req.params['slug'])) });
  });
  return router;
}
