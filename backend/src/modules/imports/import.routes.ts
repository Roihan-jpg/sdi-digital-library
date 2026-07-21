import { extname } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../../common/errors/app-error.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import { ImportService, type ImportKind } from './import.service.js';

const allowedMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const valid = ['.xlsx', '.csv'].includes(extension) && allowedMimeTypes.has(file.mimetype);
    if (valid) {
      callback(null, true);
      return;
    }
    callback(
      new AppError(400, 'IMPORT_FILE_INVALID', 'Gunakan file .xlsx atau .csv maksimal 10 MB.'),
    );
  },
});

const kindSchema = z.enum(['members', 'books']);
const idSchema = z.uuid();

export function createImportRouter(authService: AuthServicePort, service: ImportService) {
  const router = Router();
  router.use(authenticate(authService), authorize('master_admin', 'librarian'));
  router.get('/', async (_req, res) => res.json({ data: await service.list() }));
  router.get('/templates/:kind', async (req, res) => {
    const kind = kindSchema.parse(req.params['kind']);
    res.attachment(`template-${kind}.xlsx`).send(await service.template(kind));
  });
  router.post('/:kind', upload.single('file'), async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'IMPORT_FILE_REQUIRED', 'Pilih file yang akan diimport.');
    }
    validateImportUpload(req.file);
    res.status(201).json({
      data: await service.run(
        req.auth!,
        kindSchema.parse(req.params['kind']) as ImportKind,
        req.file,
      ),
    });
  });
  router.get('/:id/errors', async (req, res) =>
    res.json({ data: await service.errors(idSchema.parse(req.params['id'])) }),
  );
  router.get('/:id/errors.csv', async (req, res) => {
    res
      .attachment('import-errors.csv')
      .type('csv')
      .send(await service.errorCsv(idSchema.parse(req.params['id'])));
  });
  return router;
}

export function validateImportUpload(file: Express.Multer.File): void {
  const extension = extname(file.originalname).toLowerCase();
  const valid =
    extension === '.xlsx' ? isZip(file.buffer) : extension === '.csv' && isUtf8Text(file.buffer);
  if (!valid) {
    throw new AppError(
      400,
      'IMPORT_FILE_INVALID',
      'Isi file tidak sesuai dengan format XLSX atau CSV yang dipilih.',
    );
  }
}

function isZip(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    [0x03, 0x05, 0x07].includes(buffer[2] ?? -1) &&
    [0x04, 0x06, 0x08].includes(buffer[3] ?? -1)
  );
}

function isUtf8Text(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}
