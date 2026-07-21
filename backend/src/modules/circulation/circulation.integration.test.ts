import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '../../config/env.js';
import type { AuthContext } from '../auth/auth.types.js';
import { checkoutSchema, finePaymentSchema, groupVisitSchema, returnSchema } from './circulation.schema.js';
import { CirculationService, operationError } from './circulation.service.js';

const config = {
  NODE_ENV: 'test', PORT: 3000, APP_ORIGIN: ['http://localhost:4200'], API_BASE_PATH: '/api',
  SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'a'.repeat(24),
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(24), LOG_LEVEL: 'silent', JSON_BODY_LIMIT: '1mb',
} satisfies AppConfig;
const context = {
  accessToken: 'token', user: { id: '00000000-0000-4000-8000-000000000001', email: 'staff@example.test' },
  profile: { id: '00000000-0000-4000-8000-000000000001', role: 'librarian', fullName: 'Petugas', avatarPath: null, isActive: true },
  member: null,
} satisfies AuthContext;

test('checkout forwards scanner payload to transactional RPC and returns database receipt', async () => {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push(args ? { name, args } : { name });
      if (name === 'create_loan_by_codes') return { data: '00000000-0000-4000-8000-000000000010', error: null };
      return { data: { loan_number: 'LOAN-TEST', items: [{ inventory_code: 'INV-001' }] }, error: null };
    },
  } as unknown as SupabaseClient;
  const service = new CirculationService(config, () => client, client);
  const receipt = await service.checkout(context, {
    cardNumber: 'CARD-001', inventoryCodes: ['INV-001'], notes: 'Tes',
  }) as { loan_number: string };

  assert.equal(receipt.loan_number, 'LOAN-TEST');
  assert.deepEqual(calls[0], {
    name: 'create_loan_by_codes',
    args: { p_card_number: 'CARD-001', p_inventory_codes: ['INV-001'], p_notes: 'Tes', p_reservation_id: null },
  });
  assert.equal(calls[1]?.name, 'get_loan_receipt');
});

test('a competing duplicate checkout is mapped to HTTP 409 without leaking database errors', async () => {
  let checkoutAttempt = 0;
  const client = {
    rpc: async (name: string) => {
      if (name === 'get_loan_receipt') return { data: { loan_number: 'LOAN-1' }, error: null };
      checkoutAttempt += 1;
      if (checkoutAttempt === 1) return { data: 'loan-id', error: null };
      return { data: null, error: { code: '23505', message: 'duplicate key violates loan_items_one_active_copy_idx' } };
    },
  } as unknown as SupabaseClient;
  const service = new CirculationService(config, () => client, client);
  await service.checkout(context, { cardNumber: 'CARD-001', inventoryCodes: ['INV-001'] });
  await assert.rejects(
    () => service.checkout(context, { cardNumber: 'CARD-001', inventoryCodes: ['INV-001'] }),
    (error: unknown) => typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 409,
  );
});

test('critical operational request schemas reject unsafe or incomplete input', () => {
  assert.equal(checkoutSchema.safeParse({ cardNumber: 'A', inventoryCodes: ['1', '2', '3', '4'] }).success, false);
  assert.equal(returnSchema.safeParse({ inventoryCode: 'INV', condition: 'fair' }).success, false);
  assert.equal(finePaymentSchema.safeParse({ amount: 0, method: 'cash' }).success, false);
  assert.equal(groupVisitSchema.safeParse({ classId: crypto.randomUUID(), teacherName: '', participantCount: 0 }).success, false);
});

test('permission errors are mapped to a stable Indonesian API error', () => {
  const error = operationError({ code: '42501', message: 'raw private database detail' }, 'CHECKOUT_REJECTED');
  assert.equal(error.statusCode, 403);
  assert.doesNotMatch(error.message, /raw private/i);
});
