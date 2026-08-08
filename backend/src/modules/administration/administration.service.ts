import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import { createAdminSupabaseClient } from '../../infrastructure/supabase/supabase-admin.client.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/supabase-user.client.js';
import type {
  AdministrationServicePort,
  AuditFilters,
  AuditLogDetail,
  AuditLogSummary,
  LibrarySettings,
  LibrarySettingsUpdate,
  SystemEventFilters,
  SystemEventRecord,
} from './administration.types.js';
import type { AuthContext } from '../auth/auth.types.js';

const settingsSelect = 'max_active_loans,loan_period_days,max_renewals,renewal_days,overdue_fine_per_day,reservation_hold_hours,currency_code,timezone_name,school_name,school_address,school_phone,school_email,school_logo_path';

export class AdministrationService implements AdministrationServicePort {
  private readonly admin: SupabaseClient;

  constructor(private readonly config: AppConfig) {
    this.admin = createAdminSupabaseClient(config);
  }

  async getSettings(): Promise<LibrarySettings> {
    const { data, error } = await this.admin.from('library_settings').select(settingsSelect).eq('id', 1).single();
    if (error || !data) throw new AppError(503, 'SETTINGS_UNAVAILABLE', 'Konfigurasi belum dapat dimuat.');
    return mapSettings(data as Record<string, unknown>);
  }

  async updateSettings(context: AuthContext, input: LibrarySettingsUpdate): Promise<LibrarySettings> {
    const updates = toSettingsRow(input);
    const { data, error } = await createUserSupabaseClient(this.config, context.accessToken)
      .from('library_settings')
      .update({ ...updates, updated_by: context.user.id })
      .eq('id', 1)
      .select(settingsSelect)
      .single();
    if (error || !data) throw new AppError(422, 'SETTINGS_UPDATE_FAILED', 'Konfigurasi belum dapat disimpan.');
    return mapSettings(data as Record<string, unknown>);
  }

  async listAuditLogs(filters: AuditFilters) {
    const from = (filters.page - 1) * filters.limit;
    let query = this.admin.from('audit_logs')
      .select('id,table_name,record_id,action,user_id,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (filters.tableName) query = query.eq('table_name', filters.tableName);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.recordId) query = query.eq('record_id', filters.recordId);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);
    const { data, error, count } = await query.range(from, from + filters.limit - 1);
    if (error) throw new AppError(503, 'AUDIT_LIST_FAILED', 'Audit belum dapat dimuat.');
    return { items: (data ?? []).map(mapAuditSummary), total: count ?? 0, page: filters.page, limit: filters.limit };
  }

  async getAuditLog(id: number): Promise<AuditLogDetail> {
    const { data, error } = await this.admin.from('audit_logs')
      .select('id,table_name,record_id,action,user_id,created_at,old_data,new_data')
      .eq('id', id)
      .single();
    if (error || !data) throw new AppError(404, 'AUDIT_NOT_FOUND', 'Audit tidak ditemukan.');
    const summary = mapAuditSummary(data);
    return { ...summary, oldData: data.old_data, newData: data.new_data };
  }

  async getSystemStatus() {
    const checkedAt = new Date().toISOString();
    const [database, auth, storage] = await Promise.all([
      this.admin.from('library_settings').select('id').eq('id', 1).maybeSingle(),
      this.admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      this.admin.storage.listBuckets(),
    ]);
    const checks = [
      check('database', !database.error, 'Database Supabase'),
      check('auth', !auth.error, 'Supabase Auth Admin API'),
      check('storage', !storage.error, 'Supabase Storage'),
    ];
    return {
      overall: checks.every((item) => item.status === 'healthy') ? 'healthy' as const : 'degraded' as const,
      checkedAt,
      checks,
      configuration: {
        environment: this.config.NODE_ENV,
        allowedOriginCount: this.config.APP_ORIGIN.length,
        rateLimitWindowMs: this.config.RATE_LIMIT_WINDOW_MS,
        rateLimitMax: this.config.RATE_LIMIT_MAX,
        requestTimeoutMs: this.config.REQUEST_TIMEOUT_MS,
        headersTimeoutMs: this.config.HEADERS_TIMEOUT_MS,
        keepAliveTimeoutMs: this.config.KEEP_ALIVE_TIMEOUT_MS,
        jsonBodyLimit: this.config.JSON_BODY_LIMIT,
        serviceRoleConfigured: Boolean(this.config.SUPABASE_SERVICE_ROLE_KEY),
      },
    };
  }

  async listSystemEvents(filters: SystemEventFilters) {
    const from = (filters.page - 1) * filters.limit;
    let query = this.admin.from('system_events')
      .select('id,level,source,event_code,message,request_id,actor_user_id,context,occurred_at', { count: 'exact' })
      .order('occurred_at', { ascending: false });
    if (filters.level) query = query.eq('level', filters.level);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.from) query = query.gte('occurred_at', filters.from);
    if (filters.to) query = query.lte('occurred_at', filters.to);
    const { data, error, count } = await query.range(from, from + filters.limit - 1);
    if (error) throw new AppError(503, 'SYSTEM_EVENT_LIST_FAILED', 'Event sistem belum dapat dimuat.');
    return { items: data ?? [], total: count ?? 0, page: filters.page, limit: filters.limit };
  }

  async recordSystemEvent(event: SystemEventRecord): Promise<void> {
    const { error } = await this.admin.from('system_events').insert({
      level: event.level,
      source: event.source,
      event_code: event.eventCode,
      message: event.message.slice(0, 500),
      request_id: event.requestId ?? null,
      actor_user_id: event.actorUserId ?? null,
      context: sanitizeContext(event.context ?? {}),
    });
    if (error) throw new AppError(503, 'SYSTEM_EVENT_WRITE_FAILED', 'Event sistem belum dapat dicatat.');
  }
}

function mapSettings(row: Record<string, unknown>): LibrarySettings {
  return {
    maxActiveLoans: Number(row['max_active_loans']), loanPeriodDays: Number(row['loan_period_days']),
    maxRenewals: Number(row['max_renewals']), renewalDays: Number(row['renewal_days']),
    overdueFinePerDay: Number(row['overdue_fine_per_day']), reservationHoldHours: Number(row['reservation_hold_hours']),
    currencyCode: String(row['currency_code']).trim(), timezoneName: String(row['timezone_name']),
    schoolName: String(row['school_name']), schoolAddress: nullable(row['school_address']),
    schoolPhone: nullable(row['school_phone']), schoolEmail: nullable(row['school_email']),
    schoolLogoPath: nullable(row['school_logo_path']),
  };
}

function toSettingsRow(input: LibrarySettingsUpdate): Record<string, unknown> {
  const map: Record<keyof LibrarySettings, string> = {
    maxActiveLoans: 'max_active_loans', loanPeriodDays: 'loan_period_days', maxRenewals: 'max_renewals',
    renewalDays: 'renewal_days', overdueFinePerDay: 'overdue_fine_per_day', reservationHoldHours: 'reservation_hold_hours',
    currencyCode: 'currency_code', timezoneName: 'timezone_name', schoolName: 'school_name',
    schoolAddress: 'school_address', schoolPhone: 'school_phone', schoolEmail: 'school_email', schoolLogoPath: 'school_logo_path',
  };
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [map[key as keyof LibrarySettings], value]));
}

function mapAuditSummary(row: Record<string, unknown>): AuditLogSummary {
  return { id: String(row['id']), tableName: String(row['table_name']), recordId: nullable(row['record_id']), action: String(row['action']), userId: nullable(row['user_id']), createdAt: String(row['created_at']) };
}

function nullable(value: unknown): string | null { return value === null || value === undefined ? null : String(value); }
function check(key: string, healthy: boolean, label: string) { return { key, status: healthy ? 'healthy' as const : 'unavailable' as const, message: healthy ? `${label} dapat diakses.` : `${label} tidak dapat diakses.` }; }
function sanitizeContext(context: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(context)) {
    if (/(?:password|token|secret|key|url|email|phone|nis|card)/i.test(key)) continue;
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      output[key] = typeof value === 'string' ? value.slice(0, 200) : value as number | boolean | null;
    }
  }
  return output;
}
