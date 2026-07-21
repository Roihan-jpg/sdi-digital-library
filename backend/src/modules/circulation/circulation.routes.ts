import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import {
  checkoutSchema, finePaymentSchema, groupVisitSchema, idempotencyKeySchema, idSchema, listSchema,
  renewSchema, reservationActionSchema, reservationCreateSchema, reservationRejectSchema,
  returnSchema, scanSchema,
} from './circulation.schema.js';
import { CirculationService } from './circulation.service.js';

const staff = ['master_admin', 'librarian'] as const;

export function createCirculationRouter(authService: AuthServicePort, service: CirculationService): Router {
  const router = Router();
  router.use(authenticate(authService));
  router.post('/lookup/member', authorize(...staff), async (req, res) => {
    const { code } = scanSchema.parse(req.body);
    res.json({ data: await service.lookupMember(req.auth!, code) });
  });
  router.post('/lookup/copy', authorize(...staff), async (req, res) => {
    const { code } = scanSchema.parse(req.body);
    res.json({ data: await service.lookupCopy(req.auth!, code) });
  });
  router.post('/checkout', authorize(...staff), async (req, res) => {
    const idempotencyKey = idempotencyKeySchema.parse(req.header('idempotency-key'));
    res.status(201).json({
      data: await service.checkout(req.auth!, checkoutSchema.parse(req.body), idempotencyKey),
    });
  });
  router.post('/return', authorize(...staff), async (req, res) => {
    res.json({ data: await service.returnBook(req.auth!, returnSchema.parse(req.body)) });
  });
  router.post('/renew', authorize(...staff), async (req, res) => {
    const input = renewSchema.parse(req.body);
    res.json({ data: await service.renew(req.auth!, input.loanItemId, input.reason) });
  });
  router.get('/loans', authorize('master_admin', 'head_librarian', 'librarian', 'member'), async (req, res) => {
    const query = listSchema.parse(req.query);
    const result = await service.listLoans(req.auth!, query);
    res.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } });
  });
  router.get('/receipts/loans/:id', authorize('master_admin', 'librarian', 'member'), async (req, res) => {
    res.json({ data: await service.loanReceipt(req.auth!, idSchema.parse(req.params['id'])) });
  });
  router.get('/fines', authorize('master_admin', 'head_librarian', 'librarian', 'member'), async (req, res) => {
    const query = listSchema.parse(req.query);
    const result = await service.listFines(req.auth!, query);
    res.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } });
  });
  router.post('/fines/:id/payments', authorize(...staff), async (req, res) => {
    res.status(201).json({ data: await service.payFine(req.auth!, idSchema.parse(req.params['id']), finePaymentSchema.parse(req.body)) });
  });
  router.get('/receipts/payments/:id', authorize('master_admin', 'librarian', 'member'), async (req, res) => {
    res.json({ data: await service.paymentReceipt(req.auth!, idSchema.parse(req.params['id'])) });
  });
  router.post('/maintenance', authorize(...staff), async (req, res) => {
    res.json({ data: await service.maintenance(req.auth!) });
  });
  return router;
}

export function createReservationRouter(authService: AuthServicePort, service: CirculationService): Router {
  const router = Router();
  router.use(authenticate(authService));
  router.get('/', authorize('master_admin', 'head_librarian', 'librarian', 'member'), async (req, res) => {
    const query = listSchema.parse(req.query);
    const result = await service.listReservations(req.auth!, query);
    res.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } });
  });
  router.post('/', authorize('member'), async (req, res) => {
    const input = reservationCreateSchema.parse(req.body);
    res.status(201).json({ data: await service.createReservation(req.auth!, input.bookTitleId, input.notes) });
  });
  router.post('/:id/approve', authorize(...staff), async (req, res) => {
    const input = reservationActionSchema.parse(req.body);
    res.json({ data: await service.approveReservation(req.auth!, idSchema.parse(req.params['id']), input.inventoryCode) });
  });
  router.post('/:id/convert-to-loan', authorize(...staff), async (req, res) => {
    const input = reservationActionSchema.parse(req.body);
    const idempotencyKey = idempotencyKeySchema.parse(req.header('idempotency-key'));
    res.status(201).json({ data: await service.convertReservation(req.auth!, idSchema.parse(req.params['id']), input.inventoryCode, idempotencyKey) });
  });
  router.post('/:id/reject', authorize(...staff), async (req, res) => {
    const input = reservationRejectSchema.parse(req.body);
    await service.rejectReservation(req.auth!, idSchema.parse(req.params['id']), input.reason);
    res.status(204).send();
  });
  router.post('/:id/cancel', authorize('master_admin', 'librarian', 'member'), async (req, res) => {
    await service.cancelReservation(req.auth!, idSchema.parse(req.params['id']));
    res.status(204).send();
  });
  return router;
}

export function createVisitRouter(authService: AuthServicePort, service: CirculationService): Router {
  const router = Router();
  router.use(authenticate(authService), authorize('master_admin', 'head_librarian', 'librarian'));
  router.get('/', async (req, res) => res.json({ data: await service.listVisits(req.auth!, listSchema.parse(req.query)) }));
  router.post('/scan', authorize(...staff), async (req, res) => {
    const input = scanSchema.extend({ notes: reservationCreateSchema.shape.notes }).parse(req.body);
    res.status(201).json({ data: await service.recordMemberVisit(req.auth!, input.code, input.notes) });
  });
  router.post('/group', authorize(...staff), async (req, res) => {
    res.status(201).json({ data: await service.recordGroupVisit(req.auth!, groupVisitSchema.parse(req.body)) });
  });
  return router;
}
