import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadEnvironment } from './env.js';

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  PORT: '3100',
  APP_ORIGIN: 'http://localhost:4200,https://library.example.sch.id',
  API_BASE_PATH: '/api',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-with-at-least-twenty-characters',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key-with-at-least-twenty-characters',
  LOG_LEVEL: 'silent',
  JSON_BODY_LIMIT: '1mb',
};

describe('environment configuration', () => {
  it('normalizes numeric and comma-separated values', () => {
    const config = loadEnvironment(validEnvironment);

    assert.equal(config.PORT, 3100);
    assert.deepEqual(config.APP_ORIGIN, [
      'http://localhost:4200',
      'https://library.example.sch.id',
    ]);
  });

  it('rejects missing server secrets without exposing their values', () => {
    const invalidEnvironment = { ...validEnvironment };
    delete invalidEnvironment.SUPABASE_SERVICE_ROLE_KEY;

    assert.throws(
      () => loadEnvironment(invalidEnvironment),
      /Konfigurasi environment tidak valid: SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});
