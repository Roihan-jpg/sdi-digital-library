import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import pino from 'pino';
import { createApp } from './app.js';
import type { AppConfig } from './config/env.js';

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

describe('HTTP foundation', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    server = createServer(createApp(config, pino({ level: 'silent' })));
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

  it('returns health status and a request ID', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { 'x-request-id': 'test-request-id' },
    });
    const body = (await response.json()) as { status: string };

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'test-request-id');
    assert.equal(body.status, 'ok');
  });

  it('returns a safe Indonesian 404 response', async () => {
    const response = await fetch(`${baseUrl}/api/tidak-ada`);
    const body = (await response.json()) as { error: { code: string; requestId: string } };

    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(body.error.requestId);
  });

  it('allows only configured origins without enabling cookie credentials', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: 'http://localhost:4200' },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:4200');
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  });

  it('rate limits repeated API requests from one client', async () => {
    const responses = await Promise.all(
      Array.from({ length: 130 }, () => fetch(`${baseUrl}/api/health`)),
    );

    assert.ok(responses.some((response) => response.status === 429));
  });
});
