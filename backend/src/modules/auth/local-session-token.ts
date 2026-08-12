import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../config/env.js';

interface LocalTokenPayload {
  aud: 'authenticated';
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  role: 'authenticated';
  sub: string;
}

export function createLocalSessionToken(
  config: Pick<AppConfig, 'SUPABASE_JWT_SECRET' | 'SUPABASE_URL'>,
  profileId: string,
  sessionId: string,
  expiresAt: Date,
): string {
  const now = Math.floor(Date.now() / 1_000);
  const payload: LocalTokenPayload = {
    aud: 'authenticated',
    exp: Math.floor(expiresAt.getTime() / 1_000),
    iat: now,
    iss: `${config.SUPABASE_URL}/auth/v1`,
    jti: sessionId,
    role: 'authenticated',
    sub: profileId,
  };
  return sign(payload, config.SUPABASE_JWT_SECRET);
}

export function verifyLocalSessionToken(
  config: Pick<AppConfig, 'SUPABASE_JWT_SECRET' | 'SUPABASE_URL'>,
  token: string,
): LocalTokenPayload | null {
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra || header !== base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))) return null;
  const expected = signRaw(`${header}.${payload}`, config.SUPABASE_JWT_SECRET);
  const actualBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LocalTokenPayload;
    if (
      decoded.aud !== 'authenticated' ||
      decoded.role !== 'authenticated' ||
      decoded.iss !== `${config.SUPABASE_URL}/auth/v1` ||
      !decoded.sub ||
      !decoded.jti ||
      decoded.exp <= Math.floor(Date.now() / 1_000)
    ) return null;
    return decoded;
  } catch {
    return null;
  }
}

function sign(payload: LocalTokenPayload, secret: string): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.${signRaw(`${header}.${body}`, secret)}`;
}

function signRaw(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function base64Url(value: string): string { return Buffer.from(value).toString('base64url'); }
