import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import { memberIdSchema, memberInputSchema, memberListSchema } from './member.schema.js';
import { MemberService } from './member.service.js';

export function createMemberRouter(authService: AuthServicePort, service: MemberService): Router {
  const router = Router(); router.use(authenticate(authService), authorize('master_admin', 'head_librarian', 'librarian'));
  router.get('/', async (req, res) => { const query = memberListSchema.parse(req.query); const result = await service.list(req.auth!, query); res.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } }); });
  router.get('/:id/history', async (req, res) => res.json({ data: await service.history(memberIdSchema.parse(req.params['id'])) }));
  router.get('/:id', async (req, res) => res.json({ data: await service.get(req.auth!, memberIdSchema.parse(req.params['id'])) }));
  router.post('/', authorize('master_admin', 'librarian'), async (req, res) => res.status(201).json({ data: await service.create(req.auth!, memberInputSchema.parse(req.body)) }));
  router.put('/:id', authorize('master_admin', 'librarian'), async (req, res) => res.json({ data: await service.update(req.auth!, memberIdSchema.parse(req.params['id']), memberInputSchema.parse(req.body)) }));
  router.delete('/:id', authorize('master_admin'), async (req, res) => { await service.remove(req.auth!, memberIdSchema.parse(req.params['id'])); res.status(204).send(); });
  return router;
}
