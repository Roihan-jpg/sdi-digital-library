import type { AuthContext } from '../auth/auth.types.js';

export interface LibrarySettings {
  maxActiveLoans: number;
  loanPeriodDays: number;
  maxRenewals: number;
  renewalDays: number;
  overdueFinePerDay: number;
  reservationHoldHours: number;
  currencyCode: string;
  timezoneName: string;
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolLogoPath: string | null;
}

export type LibrarySettingsUpdate = Partial<LibrarySettings>;

export interface ListFilters {
  page: number;
  limit: number;
}

export interface AuditFilters extends ListFilters {
  tableName?: string | undefined;
  action?: string | undefined;
  userId?: string | undefined;
  recordId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface AuditLogSummary {
  id: string | number;
  tableName: string;
  recordId: string | null;
  action: string;
  userId: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogSummary {
  oldData: unknown;
  newData: unknown;
}

export interface SystemEventFilters extends ListFilters {
  level?: 'warning' | 'error' | undefined;
  source?: 'backend' | 'auth' | 'database' | 'storage' | 'maintenance' | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface SystemEventRecord {
  level: 'warning' | 'error';
  source: 'backend' | 'auth' | 'database' | 'storage' | 'maintenance';
  eventCode: string;
  message: string;
  requestId?: string | undefined;
  actorUserId?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

export interface AdministrationServicePort {
  getSettings(): Promise<LibrarySettings>;
  updateSettings(context: AuthContext, input: LibrarySettingsUpdate): Promise<LibrarySettings>;
  listAuditLogs(filters: AuditFilters): Promise<{ items: AuditLogSummary[]; total: number; page: number; limit: number }>;
  getAuditLog(id: number): Promise<AuditLogDetail>;
  getSystemStatus(): Promise<{ overall: 'healthy' | 'degraded'; checkedAt: string; checks: Array<{ key: string; status: 'healthy' | 'unavailable'; message: string }>; configuration: Record<string, string | number | boolean> }>;
  listSystemEvents(filters: SystemEventFilters): Promise<{ items: unknown[]; total: number; page: number; limit: number }>;
  recordSystemEvent(event: SystemEventRecord): Promise<void>;
}
