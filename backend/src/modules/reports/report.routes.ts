import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import type { AuthServicePort } from '../auth/auth.types.js';
import type { AuthContext } from '../auth/auth.types.js';
import {
  dashboardFilterSchema,
  exportQuerySchema,
  reportFilterSchema,
  reportKindSchema,
  schoolIdentitySchema,
} from './report.schema.js';
import type { ReportFilters, ReportKind, SchoolIdentityInput } from './report.schema.js';
import type { ReportResult, SchoolIdentity } from './report.types.js';
import { AppError } from '../../common/errors/app-error.js';

const librarianReportKinds = new Set<ReportKind>([
  'overdue',
  'fines',
  'damaged-lost',
  'inventory',
  'visits',
]);

export interface ReportServicePort {
  dashboard(from: string, to: string): Promise<unknown>;
  schoolIdentity(): Promise<SchoolIdentity>;
  updateSchoolIdentity(context: AuthContext, input: SchoolIdentityInput): Promise<SchoolIdentity>;
  report(kind: ReportKind, filters: ReportFilters): Promise<ReportResult>;
  export(kind: ReportKind, filters: ReportFilters, format: 'pdf' | 'xlsx'): Promise<{ buffer: Buffer; fileName: string; mimeType: string }>;
}

export function createReportRouter(authService: AuthServicePort, service: ReportServicePort) {
  const router = Router();
  router.use(
    authenticate(authService),
    authorize('master_admin', 'head_librarian', 'librarian'),
  );
  router.get('/dashboard', async (req, res) => {
    const query = dashboardFilterSchema.parse(req.query);
    res.json({ data: await service.dashboard(query.from, query.to) });
  });
  router.get('/settings/school', authorize('master_admin'), async (_req, res) => {
    res.json({ data: await service.schoolIdentity() });
  });
  router.patch('/settings/school', authorize('master_admin'), async (req, res) => {
    res.json({
      data: await service.updateSchoolIdentity(req.auth!, schoolIdentitySchema.parse(req.body)),
    });
  });
  router.get('/:kind/export', async (req, res) => {
    const kind = reportKindSchema.parse(req.params['kind']);
    assertReportAccess(req.auth!, kind);
    const query = exportQuerySchema.parse(req.query);
    const output = await service.export(kind, query, query.format);
    res.attachment(output.fileName).type(output.mimeType).send(output.buffer);
  });
  router.get('/:kind', async (req, res) => {
    const kind = reportKindSchema.parse(req.params['kind']);
    assertReportAccess(req.auth!, kind);
    res.json({ data: await service.report(kind, reportFilterSchema.parse(req.query)) });
  });
  return router;
}

function assertReportAccess(context: AuthContext, kind: ReportKind): void {
  if (context.profile.role === 'librarian' && !librarianReportKinds.has(kind)) {
    throw new AppError(
      403,
      'REPORT_ACCESS_DENIED',
      'Laporan ini hanya tersedia untuk kepala perpustakaan dan master admin.',
    );
  }
}
