import { Router } from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { paginationSchema } from '../../common/http/pagination.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import { masterDataKinds, masterIdSchema, parseMasterData, type MasterDataKind } from './master-data.schema.js';
import { MasterDataService } from './master-data.service.js';

export function createMasterDataRouter(authService: AuthServicePort, service: MasterDataService): Router {
  const router = Router();
  router.use(authenticate(authService), authorize('master_admin', 'head_librarian', 'librarian'));
  router.get('/:kind', async (req, res) => {
    const kind = parseKind(req.params['kind']); const query = paginationSchema.parse(req.query);
    const result = await service.list(req.auth!, kind, query.page, query.limit, query.search);
    res.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } });
  });
  router.post('/:kind', authorize('master_admin', 'librarian'), async (req, res) => {
    const kind = parseKind(req.params['kind']); const data = await service.create(req.auth!, kind, parseMasterData(kind, req.body));
    res.status(201).json({ data });
  });
  router.patch('/:kind/:id', authorize('master_admin', 'librarian'), async (req, res) => {
    const kind = parseKind(req.params['kind']); const id = masterIdSchema.parse(req.params['id']);
    const data = await service.update(req.auth!, kind, id, parseMasterData(kind, req.body, true)); res.json({ data });
  });
  router.delete('/:kind/:id', authorize('master_admin', 'librarian'), async (req, res) => {
    const kind = parseKind(req.params['kind']); await service.remove(req.auth!, kind, masterIdSchema.parse(req.params['id'])); res.status(204).send();
  });
  return router;
}

function parseKind(value: string | string[] | undefined): MasterDataKind {
  if (typeof value !== 'string' || !masterDataKinds.includes(value as MasterDataKind)) throw new AppError(404, 'MASTER_DATA_KIND_INVALID', 'Jenis master data tidak ditemukan.');
  return value as MasterDataKind;
}
