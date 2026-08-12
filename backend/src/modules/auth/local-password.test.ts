import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashLocalPassword, verifyLocalPassword } from './local-password.js';

describe('local password hashing', () => {
  it('verifies the original password and rejects another password', async () => {
    const hash = await hashLocalPassword('KataSandi2026');

    assert.equal(await verifyLocalPassword('KataSandi2026', hash), true);
    assert.equal(await verifyLocalPassword('KataSandiLain2026', hash), false);
  });
});
