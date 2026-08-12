import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashLocalPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, keyLength)) as Buffer;
  return `scrypt$v1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyLocalPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false;

  try {
    const expected = Buffer.from(parts[3]!, 'base64url');
    if (expected.length !== keyLength) return false;
    const actual = (await scryptAsync(password, Buffer.from(parts[2]!, 'base64url'), keyLength)) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
