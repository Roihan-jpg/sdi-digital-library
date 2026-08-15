import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AppRole } from '../../../core/auth/auth.models';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  data: T;
}
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { page: number; limit: number; total: number };
}

export interface ManagedProfile {
  id: string;
  email: string | null;
  username: string | null;
  authSource: 'supabase' | 'local';
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  invitedAt: string | null;
  member: { id: string; memberCode: string; fullName: string } | null;
}

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

export interface AuditLog {
  id: string | number;
  tableName: string;
  recordId: string | null;
  action: string;
  userId: string | null;
  createdAt: string;
  oldData?: unknown;
  newData?: unknown;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded';
  checkedAt: string;
  checks: Array<{ key: string; status: 'healthy' | 'unavailable'; message: string }>;
  configuration: Record<string, string | number | boolean>;
}

export interface SystemEvent {
  id: number;
  level: 'warning' | 'error';
  source: string;
  event_code: string;
  message: string;
  request_id: string | null;
  actor_user_id: string | null;
  context: Record<string, unknown>;
  occurred_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdministrationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listUsers(filters: { search?: string; role?: AppRole; isActive?: boolean } = {}) {
    let params = new HttpParams().set('page', 1).set('limit', 100);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive);
    return this.http.get<PaginatedResponse<ManagedProfile>>(`${this.base}/profiles`, { params });
  }
  createUser(input: Record<string, unknown>) {
    return this.http.post<ApiResponse<ManagedProfile>>(`${this.base}/profiles`, input);
  }
  setRole(id: string, role: AppRole) {
    return this.http.patch<void>(`${this.base}/profiles/${id}/role`, { role });
  }
  setStatus(id: string, isActive: boolean) {
    return this.http.patch<ApiResponse<ManagedProfile>>(`${this.base}/profiles/${id}/status`, {
      isActive,
    });
  }
  linkMember(id: string, memberId: string) {
    return this.http.post<void>(`${this.base}/profiles/${id}/link-member`, { memberId });
  }
  updatePassword(id: string, password: string) {
    return this.http.patch<void>(`${this.base}/profiles/${id}/password`, { password });
  }
  updateUser(id: string, input: { username?: string; fullName?: string; role?: AppRole }) {
    return this.http.patch<ApiResponse<ManagedProfile>>(`${this.base}/profiles/${id}`, input);
  }
  deleteUser(id: string) {
    return this.http.delete<void>(`${this.base}/profiles/${id}`);
  }
  getSettings() {
    return this.http.get<ApiResponse<LibrarySettings>>(`${this.base}/settings/library`);
  }
  updateSettings(input: LibrarySettings) {
    return this.http.patch<ApiResponse<LibrarySettings>>(`${this.base}/settings/library`, input);
  }
  listAuditLogs() {
    return this.http.get<PaginatedResponse<AuditLog>>(`${this.base}/audit-logs?page=1&limit=100`);
  }
  getAuditLog(id: string | number) {
    return this.http.get<ApiResponse<AuditLog>>(`${this.base}/audit-logs/${id}`);
  }
  getSystemStatus() {
    return this.http.get<ApiResponse<SystemStatus>>(`${this.base}/system/status`);
  }
  listSystemEvents() {
    return this.http.get<PaginatedResponse<SystemEvent>>(
      `${this.base}/system-events?page=1&limit=100`,
    );
  }
}
