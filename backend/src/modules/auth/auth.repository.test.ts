import assert from 'node:assert/strict';
import test from 'node:test';
import { authProviderError } from './auth.repository.js';

test('auth provider invalid-token responses remain a safe 401', () => {
  const cause = { status: 401, message: 'provider detail' };
  const error = authProviderError(cause);

  assert.equal(error.statusCode, 401);
  assert.equal(error.code, 'INVALID_ACCESS_TOKEN');
  assert.equal(error.message, 'Sesi tidak valid atau sudah berakhir.');
  assert.equal(error.cause, undefined);
});

test('auth provider outages become 503 and retain their cause only on the server', () => {
  const cause = { status: 503, message: 'upstream unavailable' };
  const error = authProviderError(cause);

  assert.equal(error.statusCode, 503);
  assert.equal(error.code, 'AUTH_PROVIDER_UNAVAILABLE');
  assert.equal(error.message, 'Layanan autentikasi belum tersedia. Coba kembali.');
  assert.equal(error.cause, cause);
});
