/**
 * Destructive UAT smoke test for a disposable local/staging database.
 * It creates records with the `SMOKE-` prefix and must never target production.
 */
const apiUrl = required('SMOKE_API_URL').replace(/\/$/, '');
const supabaseUrl = required('SMOKE_SUPABASE_URL').replace(/\/$/, '');
const supabaseAnonKey = required('SMOKE_SUPABASE_ANON_KEY');
const target = (process.env.SMOKE_TARGET ?? '').toLowerCase();

if (!['local', 'staging'].includes(target)) {
  throw new Error('SMOKE_TARGET harus local atau staging. Production sengaja ditolak.');
}
if (process.env.SMOKE_CONFIRM !== 'CREATE_DISPOSABLE_TEST_DATA') {
  throw new Error('Isi SMOKE_CONFIRM=CREATE_DISPOSABLE_TEST_DATA setelah memastikan target disposable.');
}

const credentials = Object.fromEntries(
  ['master_admin', 'head_librarian', 'librarian', 'member', 'guest'].map((role) => [
    role,
    {
      email: required(`SMOKE_${role.toUpperCase()}_EMAIL`),
      password: required(`SMOKE_${role.toUpperCase()}_PASSWORD`),
    },
  ]),
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Environment variable ${name} wajib diisi.`);
  return value;
}

async function login(role) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, 'content-type': 'application/json' },
    body: JSON.stringify(credentials[role]),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`Login ${role} gagal (${response.status}).`);
  return body.access_token;
}

async function request(path, { token, method = 'GET', body, headers = {}, expected = [200] } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('json') ? await response.json() : await response.arrayBuffer();
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} menghasilkan ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function step(label) {
  process.stdout.write(`✓ ${label}\n`);
}

await request('/api/health');
await request('/api/catalog?limit=1');
step('health check dan katalog publik');

const tokens = {};
for (const role of Object.keys(credentials)) {
  tokens[role] = await login(role);
  const me = await request('/api/auth/me', { token: tokens[role] });
  if (me.data.profile.role !== role) {
    throw new Error(`Role ${role} terbaca sebagai ${me.data.profile.role}.`);
  }
}
step('login dan role kelima akun');

const template = await request('/api/imports/templates/members', { token: tokens.librarian });
const importForm = new FormData();
importForm.append('file', new Blob([template]), 'smoke-members.xlsx');
await request('/api/imports/members', {
  token: tokens.librarian,
  method: 'POST',
  body: importForm,
  expected: [201],
});
step('import member memakai template resmi');

const runId = Date.now();
const title = await request('/api/catalog/titles', {
  token: tokens.librarian,
  method: 'POST',
  body: {
    catalogCode: `SMOKE-${runId}`,
    title: `Buku Smoke ${runId}`,
    language: 'id',
    isReferenceOnly: false,
    isActive: true,
    isPublished: true,
    authorIds: [],
  },
  expected: [201],
});

const copies = [];
for (let number = 1; number <= 4; number += 1) {
  const copy = await request('/api/catalog/copies', {
    token: tokens.librarian,
    method: 'POST',
    body: {
      bookTitleId: title.data.id,
      inventoryCode: `SMOKE-${runId}-${number}`,
      copyNumber: number,
      condition: 'good',
      status: 'available',
      isActive: true,
    },
    expected: [201],
  });
  copies.push(copy.data);
}
await request('/api/catalog/labels/print', {
  token: tokens.librarian,
  method: 'POST',
  body: { copyIds: copies.map((copy) => copy.id), format: 'both' },
});
step('tambah judul, empat eksemplar, dan generate label barcode/QR');

await request('/api/visits/scan', {
  token: tokens.librarian,
  method: 'POST',
  body: { code: 'DEMO-CARD-001' },
  expected: [201],
});
step('scan kunjungan individual');

await request('/api/circulation/checkout', {
  token: tokens.librarian,
  method: 'POST',
  headers: { 'idempotency-key': crypto.randomUUID() },
  body: { cardNumber: 'DEMO-CARD-001', inventoryCodes: copies.slice(0, 3).map((copy) => copy.inventory_code) },
  expected: [201],
});
await request('/api/circulation/checkout', {
  token: tokens.librarian,
  method: 'POST',
  headers: { 'idempotency-key': crypto.randomUUID() },
  body: { cardNumber: 'DEMO-CARD-001', inventoryCodes: [copies[3].inventory_code] },
  expected: [422],
});
step('pinjam tiga buku dan tolak buku keempat');

await request('/api/reservations', {
  token: tokens.member,
  method: 'POST',
  body: { bookTitleId: title.data.id, notes: `SMOKE ${runId}` },
  expected: [201],
});
step('reservasi oleh member');

for (const [index, condition] of ['good', 'damaged', 'lost'].entries()) {
  await request('/api/circulation/return', {
    token: tokens.librarian,
    method: 'POST',
    body: { inventoryCode: copies[index].inventory_code, condition, notes: `SMOKE ${condition}` },
  });
}
step('pengembalian normal, rusak, dan hilang');

if (process.env.SMOKE_OVERDUE_INVENTORY_CODE) {
  await request('/api/circulation/return', {
    token: tokens.librarian,
    method: 'POST',
    body: { inventoryCode: process.env.SMOKE_OVERDUE_INVENTORY_CODE, condition: 'good' },
  });
  const fines = await request('/api/circulation/fines?status=unpaid', { token: tokens.librarian });
  const fine = fines.data.find((item) => Number(item.amount) > Number(item.paid_amount));
  if (!fine) throw new Error('Skenario overdue tidak menghasilkan denda unpaid.');
  await request(`/api/circulation/fines/${fine.id}/payments`, {
    token: tokens.librarian,
    method: 'POST',
    body: { amount: Number(fine.amount) - Number(fine.paid_amount), method: 'cash', notes: 'SMOKE' },
    expected: [201],
  });
  step('pengembalian terlambat dan pembayaran denda');
} else {
  step('SKIP overdue/payment: isi SMOKE_OVERDUE_INVENTORY_CODE dari fixture jatuh tempo');
}

if (process.env.SMOKE_DIGITAL_SLUG) {
  const detail = await request(`/api/digital-library/${process.env.SMOKE_DIGITAL_SLUG}`);
  await request(`/api/digital-library/${detail.data.id}/access`, {
    token: tokens.member,
    method: 'POST',
    body: { action: 'view' },
  });
  step('akses koleksi digital privat melalui backend');
} else {
  step('SKIP digital: isi SMOKE_DIGITAL_SLUG dari fixture published');
}

await request('/api/reports/inventory/export?format=xlsx', { token: tokens.head_librarian });
step('export laporan sebagai kepala perpustakaan');
process.stdout.write('\nSmoke UAT selesai. Tinjau record berawalan SMOKE- di database disposable.\n');
