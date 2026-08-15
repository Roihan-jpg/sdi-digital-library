import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../common/errors/app-error.js';
import type { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import type { AuthContext } from './auth.types.js';

const localContext: AuthContext = {
  accessToken: 'local-token',
  user: { id: 'profile-1', email: null },
  profile: {
    id: 'profile-1',
    role: 'librarian',
    fullName: 'Petugas',
    avatarPath: null,
    isActive: true,
  },
  member: null,
  authSource: 'local',
};

test('authenticate accepts a recognized local session before contacting Supabase Auth', async () => {
  let providerCalls = 0;
  const repository = {
    async authenticateLocal() {
      return localContext;
    },
    async verifyUser() {
      providerCalls += 1;
      throw new Error('must not be called');
    },
  } as unknown as AuthRepository;

  const result = await new AuthService(repository).authenticate('local-token');

  assert.equal(result, localContext);
  assert.equal(providerCalls, 0);
});

test('authenticate uses Supabase Auth only when the token is not a local token', async () => {
  const repository = {
    async authenticateLocal() {
      return null;
    },
    async verifyUser() {
      return { id: 'auth-1', email: 'admin@example.test' };
    },
    async getProfile() {
      return { ...localContext.profile, id: 'profile-2', role: 'master_admin' as const };
    },
    async getMember() {
      return null;
    },
  } as unknown as AuthRepository;

  const result = await new AuthService(repository).authenticate('supabase-token');

  assert.equal(result.authSource, 'supabase');
  assert.equal(result.authUserId, 'auth-1');
});

test('authenticate preserves a local session lookup outage as 503', async () => {
  let providerCalls = 0;
  const expected = new AppError(
    503,
    'SESSION_LOOKUP_FAILED',
    'Sesi belum dapat diverifikasi. Coba kembali.',
  );
  const repository = {
    async authenticateLocal() {
      throw expected;
    },
    async verifyUser() {
      providerCalls += 1;
      throw new Error('must not be called');
    },
  } as unknown as AuthRepository;

  await assert.rejects(new AuthService(repository).authenticate('local-token'), expected);
  assert.equal(providerCalls, 0);
});
