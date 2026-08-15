import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import pino from 'pino';
import { createApp } from '../../app.js';
import { AppError } from '../../common/errors/app-error.js';
import type { AppConfig } from '../../config/env.js';
import type {
  AppProfile,
  AppRole,
  AuthContext,
  AuthServicePort,
  CreateAccountInput,
  ProfileServicePort,
  UpdateAccountInput,
  UpdateOwnProfileInput,
} from './auth.types.js';

const masterId = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
const targetId = '33333333-3333-4333-8333-333333333333';

const config: AppConfig = {
  NODE_ENV: 'test',
  PORT: 3000,
  APP_ORIGIN: ['http://localhost:4200'],
  API_BASE_PATH: '/api',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-with-at-least-twenty-characters',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key-with-at-least-twenty-characters',
  SUPABASE_JWT_SECRET: 'jwt-secret-with-at-least-thirty-two-characters',
  LOG_LEVEL: 'silent',
  JSON_BODY_LIMIT: '1mb',
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 120,
  TRUST_PROXY_HOPS: 0,
  REQUEST_TIMEOUT_MS: 30_000,
  HEADERS_TIMEOUT_MS: 15_000,
  KEEP_ALIVE_TIMEOUT_MS: 5_000,
};

class FakeAuthService implements AuthServicePort {
  loggedOutToken: string | null = null;
  changedPassword: string | null = null;

  async authenticate(accessToken: string): Promise<AuthContext> {
    if (accessToken === 'master-token') return context(masterId, 'master_admin', accessToken);
    if (accessToken === 'member-token') return context(memberId, 'member', accessToken);
    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Sesi tidak valid atau sudah berakhir.');
  }

  async logout(accessToken: string): Promise<void> {
    this.loggedOutToken = accessToken;
  }

  async changePassword(_context: AuthContext, password: string): Promise<void> {
    this.changedPassword = password;
  }

  async loginLocal(identifier: string, password: string) {
    if (identifier !== 'petugas.uji' || password !== 'Petugas2026') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau kata sandi tidak benar.');
    }
    return {
      accessToken: 'local-session-token',
      expiresAt: '2026-08-12T12:00:00.000Z',
      context: context(targetId, 'librarian', 'local-session-token'),
    };
  }
}

class FakeProfileService implements ProfileServicePort {
  roleUpdate: { userId: string; role: AppRole } | null = null;
  createdAccount: { username: string; fullName: string; role: AppRole } | null = null;
  updatedAccount: { userId: string; input: UpdateAccountInput } | null = null;
  deletedAccount: string | null = null;

  async listProfiles(
    authContext: AuthContext,
    page: number,
    limit: number,
  ): Promise<{ items: AppProfile[]; total: number; page: number; limit: number }> {
    return { items: [authContext.profile], total: 1, page, limit };
  }

  async getOwnContext(authContext: AuthContext): Promise<AuthContext> {
    return authContext;
  }

  async updateOwnProfile(
    authContext: AuthContext,
    input: UpdateOwnProfileInput,
  ): Promise<AppProfile> {
    return { ...authContext.profile, fullName: input.fullName ?? null };
  }

  async setRole(_context: AuthContext, userId: string, role: AppRole): Promise<void> {
    this.roleUpdate = { userId, role };
  }

  async setActive(
    _context: AuthContext,
    userId: string,
    isActive: boolean,
  ): Promise<AppProfile> {
    return profile(userId, 'guest', isActive);
  }

  async linkMember(_context: AuthContext, _userId: string, _memberId: string): Promise<void> {}

  async createAccount(
    _context: AuthContext,
    input: CreateAccountInput,
  ): Promise<AppProfile> {
    this.createdAccount = {
      username: input.username,
      fullName: input.fullName,
      role: input.role,
    };
    return profile(targetId, input.role, true);
  }

  async updateAccount(
    _context: AuthContext,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<AppProfile> {
    this.updatedAccount = { userId, input };
    return profile(userId, input.role ?? 'guest', true);
  }

  async deleteAccount(_context: AuthContext, userId: string): Promise<void> {
    this.deletedAccount = userId;
  }
}

describe('auth and profile routes', () => {
  let server: Server;
  let baseUrl: string;
  const authService = new FakeAuthService();
  const profileService = new FakeProfileService();

  before(async () => {
    server = createServer(
      createApp(config, pino({ level: 'silent' }), { authService, profileService }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert(address && typeof address === 'object');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('rejects requests without an access token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 401);
  });

  it('signs in a local account without creating a Supabase Auth session', async () => {
    const response = await fetch(`${baseUrl}/api/auth/local-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'petugas.uji', password: 'Petugas2026' }),
    });
    const body = (await response.json()) as { data: { accessToken: string; context: AuthContext } };

    assert.equal(response.status, 200);
    assert.equal(body.data.accessToken, 'local-session-token');
    assert.equal(body.data.context.profile.role, 'librarian');
  });

  it('returns the authenticated user and database-backed role', async () => {
    const response = await request('/api/auth/me', 'member-token');
    const body = (await response.json()) as { data: { profile: { role: AppRole } } };

    assert.equal(response.status, 200);
    assert.equal(body.data.profile.role, 'member');
  });

  it('prevents a member from changing roles', async () => {
    const response = await request(`/api/profiles/${targetId}/role`, 'member-token', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'master_admin' }),
    });

    assert.equal(response.status, 403);
    assert.equal(profileService.roleUpdate, null);
  });

  it('restricts the profile directory to master admin', async () => {
    const denied = await request('/api/profiles', 'member-token');
    const allowed = await request('/api/profiles?page=1&limit=10', 'master-token');

    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
  });

  it('allows a master admin to call the protected role RPC flow', async () => {
    const response = await request(`/api/profiles/${targetId}/role`, 'master-token', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'librarian' }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(profileService.roleUpdate, { userId: targetId, role: 'librarian' });
  });

  it('allows a master admin to edit a local account', async () => {
    const response = await request(`/api/profiles/${targetId}`, 'master-token', {
      method: 'PATCH',
      body: JSON.stringify({
        username: 'pengguna.baru',
        fullName: 'Pengguna Baru',
        role: 'librarian',
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(profileService.updatedAccount, {
      userId: targetId,
      input: { username: 'pengguna.baru', fullName: 'Pengguna Baru', role: 'librarian' },
    });
  });

  it('allows a master admin to delete a local account', async () => {
    const response = await request(`/api/profiles/${targetId}`, 'master-token', {
      method: 'DELETE',
    });

    assert.equal(response.status, 204);
    assert.equal(profileService.deletedAccount, targetId);
  });

  it('ends the authenticated session through the logout endpoint', async () => {
    const response = await request('/api/auth/logout', 'member-token', { method: 'POST' });

    assert.equal(response.status, 204);
    assert.equal(authService.loggedOutToken, 'member-token');
  });

  it('allows master admin to create a local account with an initial password', async () => {
    const response = await request('/api/profiles', 'master-token', {
      method: 'POST',
      body: JSON.stringify({
        username: 'kepala.baru',
        fullName: 'Kepala Baru',
        role: 'head_librarian',
        password: 'KepalaBaru2026',
      }),
    });
    const body = (await response.json()) as { data: AppProfile & { password?: string } };

    assert.equal(response.status, 201);
    assert.equal(body.data.role, 'head_librarian');
    assert.equal(body.data.password, undefined);
    assert.deepEqual(profileService.createdAccount, {
      username: 'kepala.baru',
      fullName: 'Kepala Baru',
      role: 'head_librarian',
    });
  });

  function request(path: string, token: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    });
  }
});

function context(userId: string, role: AppRole, accessToken: string): AuthContext {
  return {
    accessToken,
    user: { id: userId, email: `${role}@example.sch.id` },
    profile: profile(userId, role, true),
    member: null,
  };
}

function profile(id: string, role: AppRole, isActive: boolean): AppProfile {
  return { id, role, fullName: role, avatarPath: null, isActive };
}
