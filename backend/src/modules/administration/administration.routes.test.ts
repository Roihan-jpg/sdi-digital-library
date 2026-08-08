import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, it } from 'node:test';
import express from 'express';
import { AppError } from '../../common/errors/app-error.js';
import { errorHandler } from '../../common/middleware/error-handler.js';
import type { AuthContext, AuthServicePort } from '../auth/auth.types.js';
import {
  createAuditLogRouter,
  createSettingsRouter,
  redactAuditData,
  type AdministrationServicePort,
} from './administration.routes.js';

const id = '10000000-0000-4000-8000-000000000001';
const settings = {
  maxActiveLoans: 3,
  loanPeriodDays: 7,
  maxRenewals: 1,
  renewalDays: 1,
  overdueFinePerDay: 2000,
  reservationHoldHours: 24,
  currencyCode: 'IDR',
  timezoneName: 'Asia/Jakarta',
  schoolName: 'SDI',
  schoolAddress: null,
  schoolPhone: null,
  schoolEmail: null,
  schoolLogoPath: null,
};

const auth: AuthServicePort = {
  async authenticate(token) {
    if (token !== 'master_admin' && token !== 'librarian') {
      throw new AppError(401, 'INVALID', 'Sesi tidak valid.');
    }
    return context(token);
  },
  async logout() {},
};

const service: AdministrationServicePort = {
  async getSettings() { return settings; },
  async updateSettings() { return settings; },
  async listAuditLogs(filters) {
    return {
      items: [{ id: 1, tableName: 'profiles', recordId: id, action: 'UPDATE', userId: id, createdAt: '2026-08-08T00:00:00Z' }],
      total: 1,
      page: filters.page,
      limit: filters.limit,
    };
  },
  async getAuditLog() {
    return {
      id: 1,
      tableName: 'members',
      recordId: id,
      action: 'UPDATE',
      userId: id,
      createdAt: '2026-08-08T00:00:00Z',
      oldData: null,
      newData: { nisn: '1234567890', password: 'rahasia', file_path: 'private/book.pdf' },
    };
  },
  async getSystemStatus() { return { overall: 'healthy', checkedAt: '2026-08-08T00:00:00Z', checks: [], configuration: {} }; },
  async listSystemEvents(filters) { return { items: [], total: 0, page: filters.page, limit: filters.limit }; },
  async recordSystemEvent() {},
};

let server: Server | undefined;
afterEach(() => server?.close());

describe('administration routes', () => {
  it('keeps library settings exclusive to master admin', async () => {
    const url = base();
    const denied = await fetch(`${url}/settings/library`, { headers: authorization('librarian') });
    const allowed = await fetch(`${url}/settings/library`, { headers: authorization('master_admin') });

    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
  });

  it('returns audit list metadata without raw change payloads', async () => {
    const response = await fetch(`${base()}/audit-logs?page=1&limit=20`, {
      headers: authorization('master_admin'),
    });
    const body = (await response.json()) as { data: Array<Record<string, unknown>> };

    assert.equal(response.status, 200);
    assert.equal('oldData' in body.data[0]!, false);
    assert.equal('newData' in body.data[0]!, false);
  });

  it('redacts credentials, private paths, and student identifiers in audit details', () => {
    assert.deepEqual(
      redactAuditData({
        password: 'rahasia',
        file_path: 'private/book.pdf',
        email: 'siswa@example.sch.id',
        nisn: '1234567890',
        safe: 'tersedia',
      }),
      {
        password: '[DIHAPUS]',
        file_path: '[DIHAPUS]',
        email: 's***a@example.sch.id',
        nisn: '******7890',
        safe: 'tersedia',
      },
    );
  });
});

function base(): string {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', createSettingsRouter(auth, service));
  app.use('/api/audit-logs', createAuditLogRouter(auth, service));
  app.use(errorHandler({ warn() {}, error() {} } as never));
  server = app.listen(0);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

function context(role: 'master_admin' | 'librarian'): AuthContext {
  return {
    accessToken: role,
    user: { id, email: `${role}@example.sch.id` },
    profile: { id, role, fullName: role, avatarPath: null, isActive: true },
    member: null,
  };
}

function authorization(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}
