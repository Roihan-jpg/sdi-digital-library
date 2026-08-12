import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLocalSessionToken, verifyLocalSessionToken } from './local-session-token.js';

const config = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_JWT_SECRET: 'jwt-secret-with-at-least-thirty-two-characters',
};

describe('local session token', () => {
  it('binds a valid session token to its local profile ID', () => {
    const token = createLocalSessionToken(
      config,
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      new Date(Date.now() + 60_000),
    );

    assert.equal(verifyLocalSessionToken(config, token)?.sub, '11111111-1111-4111-8111-111111111111');
  });

  it('rejects a token whose signature has been modified', () => {
    const token = createLocalSessionToken(
      config,
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      new Date(Date.now() + 60_000),
    );

    assert.equal(verifyLocalSessionToken(config, `${token.slice(0, -1)}x`), null);
  });
});
