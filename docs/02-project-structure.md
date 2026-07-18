# Struktur Folder SDI Digital Library

Struktur berikut menggunakan satu repository dengan frontend Angular, backend Express TypeScript, migrasi Supabase, dokumentasi, dan script operasional. Struktur ini cukup modular untuk produksi, tetapi tidak dibuat terlalu abstrak agar pengerjaan satu minggu tetap realistis.

```text
sdi-digital-library/
├── frontend/
├── backend/
├── supabase/
├── docs/
├── scripts/
├── .github/
├── .editorconfig
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── .env.example
```

---

## 1. Struktur Root

```text
sdi-digital-library/
├── frontend/                      # Angular
├── backend/                       # Express + TypeScript
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 202607180001_initial_schema.sql
│   ├── seed.sql
│   └── tests/
│       ├── schema_test.sql
│       └── rls_test.sql
├── docs/
│   ├── 00-project-concept.md
│   ├── 01-flowchart-schema.md
│   ├── 02-project-structure.md
│   ├── 03-execution-prompts.md
│   ├── api-contract.md
│   ├── deployment.md
│   └── user-guide.md
├── scripts/
│   ├── generate-supabase-types.mjs
│   ├── create-import-templates.mjs
│   └── smoke-test.mjs
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Root `package.json`

Root digunakan sebagai pemanggil script frontend, backend, dan Supabase. Contoh:

```json
{
  "name": "sdi-digital-library",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "npm --prefix frontend start",
    "dev:backend": "npm --prefix backend run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "npm --prefix frontend run build",
    "build:backend": "npm --prefix backend run build",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "npm --prefix frontend test -- --watch=false",
    "test:backend": "npm --prefix backend test",
    "db:start": "npx supabase start",
    "db:reset": "npx supabase db reset",
    "db:push": "npx supabase db push",
    "db:types": "npx supabase gen types typescript --local > backend/src/generated/database.types.ts"
  }
}
```

Paket `concurrently` dipasang sebagai dev dependency di root. Dengan struktur ini, perintah `npm run dev:backend` selalu tersedia dari root dan tidak bergantung pada tebakan nama script.

---

## 2. Struktur Frontend Angular

Gunakan pendekatan **feature-first**. File yang berkaitan dengan satu fitur ditempatkan bersama agar Codex tidak perlu melompat ke banyak folder untuk menyelesaikan satu modul.

```text
frontend/
├── public/
│   ├── icons/
│   └── images/
├── src/
│   ├── app/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.component.ts
│   │   │
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.store.ts
│   │   │   │   └── session.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── error.interceptor.ts
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── download.service.ts
│   │   │   ├── tokens/
│   │   │   │   └── environment.token.ts
│   │   │   └── models/
│   │   │       ├── auth-user.model.ts
│   │   │       └── app-role.model.ts
│   │   │
│   │   ├── layouts/
│   │   │   ├── public-layout/
│   │   │   ├── dashboard-layout/
│   │   │   └── member-layout/
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── data-table/
│   │   │   │   ├── page-header/
│   │   │   │   ├── empty-state/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   ├── status-badge/
│   │   │   │   ├── barcode-scanner-input/
│   │   │   │   └── file-upload/
│   │   │   ├── directives/
│   │   │   ├── pipes/
│   │   │   ├── validators/
│   │   │   ├── models/
│   │   │   └── utils/
│   │   │
│   │   └── features/
│   │       ├── auth/
│   │       │   ├── pages/
│   │       │   ├── components/
│   │       │   └── auth.routes.ts
│   │       │
│   │       ├── dashboard/
│   │       │   ├── pages/
│   │       │   ├── components/
│   │       │   ├── data-access/
│   │       │   └── dashboard.routes.ts
│   │       │
│   │       ├── catalog/
│   │       │   ├── pages/
│   │       │   ├── components/
│   │       │   ├── data-access/
│   │       │   ├── models/
│   │       │   └── catalog.routes.ts
│   │       │
│   │       ├── members/
│   │       │   ├── pages/
│   │       │   ├── components/
│   │       │   ├── data-access/
│   │       │   ├── models/
│   │       │   └── members.routes.ts
│   │       │
│   │       ├── circulation/
│   │       │   ├── pages/
│   │       │   │   ├── checkout-page/
│   │       │   │   ├── return-page/
│   │       │   │   ├── active-loans-page/
│   │       │   │   └── fines-page/
│   │       │   ├── components/
│   │       │   ├── data-access/
│   │       │   ├── models/
│   │       │   └── circulation.routes.ts
│   │       │
│   │       ├── reservations/
│   │       ├── visits/
│   │       ├── digital-library/
│   │       ├── reports/
│   │       ├── imports/
│   │       ├── users/
│   │       └── settings/
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.production.ts
│   ├── styles/
│   │   ├── _variables.scss
│   │   ├── _mixins.scss
│   │   ├── _utilities.scss
│   │   └── _theme.scss
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
├── tsconfig.json
└── proxy.conf.json
```

### Aturan Frontend

1. `core/` hanya berisi singleton, autentikasi, interceptor, guard, dan layanan lintas aplikasi.
2. `shared/` hanya berisi komponen generik tanpa logika bisnis spesifik.
3. Semua logika bisnis ditempatkan di `features/<nama-fitur>`.
4. Komponen halaman tidak memanggil HTTP secara langsung; panggilan API berada di `data-access`.
5. Route fitur dimuat secara lazy.
6. Model response API tidak dicampur dengan model form jika bentuknya berbeda.
7. Scanner barcode diperlakukan seperti input keyboard cepat, sehingga tetap dapat berjalan tanpa library kamera.
8. Kamera QR dapat ditambahkan sebagai opsi, bukan sebagai satu-satunya metode input.

### Contoh Isi Fitur Circulation

```text
features/circulation/
├── pages/
│   ├── checkout-page/
│   │   ├── checkout-page.component.ts
│   │   ├── checkout-page.component.html
│   │   └── checkout-page.component.scss
│   ├── return-page/
│   ├── active-loans-page/
│   └── fines-page/
├── components/
│   ├── member-summary/
│   ├── scanned-book-list/
│   ├── loan-receipt/
│   └── fine-payment-dialog/
├── data-access/
│   ├── circulation.api.ts
│   ├── circulation.facade.ts
│   └── circulation.mapper.ts
├── models/
│   ├── checkout.model.ts
│   ├── loan.model.ts
│   ├── return-result.model.ts
│   └── fine.model.ts
└── circulation.routes.ts
```

---

## 3. Struktur Backend Express TypeScript

Backend menggunakan **modular vertical slices**. Setiap modul memiliki controller, service, repository, DTO/schema, dan route sendiri.

```text
backend/
├── src/
│   ├── server.ts
│   ├── app.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── constants.ts
│   │
│   ├── generated/
│   │   └── database.types.ts
│   │
│   ├── common/
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   ├── error-codes.ts
│   │   │   └── error-handler.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── request-id.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── validate.ts
│   │   ├── http/
│   │   │   ├── api-response.ts
│   │   │   └── pagination.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── money.ts
│   │       ├── slug.ts
│   │       └── csv.ts
│   │
│   ├── infrastructure/
│   │   ├── supabase/
│   │   │   ├── supabase-admin.client.ts
│   │   │   ├── supabase-user.client.ts
│   │   │   └── supabase-auth.service.ts
│   │   ├── storage/
│   │   │   └── storage.service.ts
│   │   ├── excel/
│   │   │   ├── excel-reader.ts
│   │   │   └── excel-writer.ts
│   │   ├── pdf/
│   │   │   └── pdf-report.service.ts
│   │   ├── barcode/
│   │   │   ├── barcode.service.ts
│   │   │   └── qr-code.service.ts
│   │   └── scheduler/
│   │       └── maintenance.scheduler.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── profiles/
│   │   ├── members/
│   │   ├── school-data/
│   │   ├── catalog/
│   │   ├── book-copies/
│   │   ├── circulation/
│   │   ├── reservations/
│   │   ├── visits/
│   │   ├── digital-library/
│   │   ├── fines/
│   │   ├── imports/
│   │   ├── reports/
│   │   ├── users/
│   │   └── settings/
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   └── health.routes.ts
│   │
│   └── jobs/
│       ├── expire-reservations.job.ts
│       └── mark-overdue-loans.job.ts
│
├── test/
│   ├── integration/
│   ├── unit/
│   ├── fixtures/
│   └── helpers/
├── uploads/
│   └── .gitkeep
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Struktur Satu Modul Backend

```text
modules/circulation/
├── circulation.controller.ts
├── circulation.service.ts
├── circulation.repository.ts
├── circulation.routes.ts
├── circulation.schema.ts
├── circulation.types.ts
└── circulation.mapper.ts
```

### Tanggung Jawab Layer

| File | Tanggung jawab |
|---|---|
| Controller | Membaca request dan membentuk response |
| Service | Menjalankan aturan bisnis dan orkestrasi |
| Repository | Mengakses Supabase/PostgreSQL |
| Schema | Validasi input dengan library schema validation |
| Mapper | Mengubah bentuk data database ke response |
| Routes | Mendefinisikan endpoint dan middleware |

Jangan membuat `BaseRepository`, `BaseService`, atau abstraction generik terlalu dini. Dua atau tiga baris duplikasi lebih murah daripada abstraction yang belum terbukti berguna.

---

## 4. Struktur Modul Backend yang Disarankan

### `modules/catalog`

```text
catalog/
├── catalog.controller.ts
├── catalog.service.ts
├── catalog.repository.ts
├── catalog.routes.ts
├── catalog.schema.ts
├── catalog.types.ts
└── catalog.mapper.ts
```

Endpoint utama:

```text
GET    /api/catalog
GET    /api/catalog/:id
POST   /api/catalog
PATCH  /api/catalog/:id
DELETE /api/catalog/:id
GET    /api/catalog/:id/copies
```

### `modules/book-copies`

```text
GET    /api/book-copies/:id
POST   /api/book-copies
PATCH  /api/book-copies/:id
POST   /api/book-copies/:id/barcode
POST   /api/book-copies/labels
```

### `modules/members`

```text
GET    /api/members
GET    /api/members/:id
GET    /api/members/by-card/:cardNumber
POST   /api/members
PATCH  /api/members/:id
POST   /api/members/:id/link-account
```

### `modules/circulation`

```text
POST   /api/circulation/checkout
POST   /api/circulation/return
POST   /api/circulation/renew
GET    /api/circulation/active
GET    /api/circulation/history
GET    /api/circulation/receipt/:loanId
```

### `modules/reservations`

```text
POST   /api/reservations
GET    /api/reservations/me
GET    /api/reservations
POST   /api/reservations/:id/convert-to-loan
POST   /api/reservations/:id/reject
POST   /api/reservations/:id/cancel
```

### `modules/visits`

```text
POST   /api/visits/scan
POST   /api/visits/group
GET    /api/visits
GET    /api/visits/statistics
```

### `modules/imports`

```text
GET    /api/imports/templates/members
GET    /api/imports/templates/books
POST   /api/imports/members
POST   /api/imports/books
GET    /api/imports/:jobId
GET    /api/imports/:jobId/errors
```

### `modules/digital-library`

```text
GET    /api/digital
GET    /api/digital/:id
POST   /api/digital
PATCH  /api/digital/:id
POST   /api/digital/:id/signed-url
POST   /api/digital/:id/access-log
```

### `modules/reports`

```text
GET    /api/reports/popular-books
GET    /api/reports/active-members
GET    /api/reports/overdue
GET    /api/reports/inventory
GET    /api/reports/visits
GET    /api/reports/accreditation
POST   /api/reports/export
```

---

## 5. Pemisahan Supabase Client di Backend

Gunakan dua jenis client:

```text
supabase-user.client.ts
```

- Dibuat menggunakan access token pengguna.
- Digunakan untuk operasi yang harus mematuhi RLS.
- Cocok untuk transaksi berdasarkan role pengguna.
- RPC peminjaman, pengembalian, reservasi, dan kunjungan sebaiknya menggunakan konteks pengguna.

```text
supabase-admin.client.ts
```

- Menggunakan service role key.
- Hanya tersedia di backend.
- Digunakan untuk administrasi Auth, import massal, pekerjaan terjadwal, dan signed URL.
- Tidak pernah dikirim ke frontend.
- Setiap penggunaan harus disertai validasi role di backend dan audit yang jelas.

---

## 6. Environment Variables

### Root `.env.example`

```dotenv
SUPABASE_PROJECT_REF=
SUPABASE_DB_PASSWORD=
```

### Backend `.env.example`

```dotenv
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:4200
API_BASE_PATH=/api

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

LOG_LEVEL=info
MAX_UPLOAD_MB=500
EXPORT_TTL_MINUTES=15
```

### Frontend `environment.ts`

Frontend hanya boleh memiliki:

```text
API base URL
Supabase URL
Supabase anon key
```

Service role key, database password, dan JWT secret tidak boleh masuk ke bundle Angular.

---

## 7. Struktur Test

### Frontend

```text
frontend/src/app/features/<feature>/
├── *.spec.ts
```

Prioritas test:

- Guard role.
- Form validasi.
- Perhitungan tampilan denda.
- State scan buku.
- Error handling API.

### Backend

```text
backend/test/
├── unit/
│   ├── circulation.service.spec.ts
│   ├── imports.service.spec.ts
│   └── reports.service.spec.ts
├── integration/
│   ├── auth.integration.spec.ts
│   ├── circulation.integration.spec.ts
│   ├── reservations.integration.spec.ts
│   └── rls.integration.spec.ts
└── fixtures/
```

Skenario minimum circulation:

1. Member aktif meminjam satu buku.
2. Pinjaman keempat ditolak.
3. Buku yang sudah dipinjam tidak dapat dipinjam lagi.
4. Pengembalian tepat waktu tanpa denda.
5. Pengembalian terlambat menghasilkan denda.
6. Buku rusak menghasilkan biaya kategori.
7. Perpanjangan kedua ditolak.
8. Reservasi dikonversi menjadi peminjaman.

---

## 8. Aturan Dependency

### Frontend

Boleh menggunakan:

- Angular Router.
- Angular Forms.
- HTTP Client.
- Library komponen UI yang dipilih secara konsisten.
- Library chart untuk dashboard.
- Library QR camera sebagai fitur opsional.

### Backend

Kebutuhan umum:

- Express.
- TypeScript.
- Supabase JavaScript client.
- Validator schema.
- Security middleware.
- Logger.
- Parser Excel.
- Generator Excel.
- Generator PDF.
- Generator barcode dan QR.
- Test runner.

Jangan memasang ORM jika akses data telah menggunakan Supabase client dan RPC PostgreSQL. ORM hanya ditambahkan jika ada kebutuhan yang benar-benar tidak terlayani.

---

## 9. Aturan Penamaan

| Objek | Format |
|---|---|
| Folder | kebab-case |
| File TypeScript | kebab-case |
| Class/interface/type | PascalCase |
| Function/variable | camelCase |
| Database table/column | snake_case |
| Endpoint | kebab-case |
| Environment variable | UPPER_SNAKE_CASE |
| Angular selector | `sdi-...` |

---

## 10. Urutan Pembuatan Folder

1. Buat root repository.
2. Scaffold Angular di `frontend`.
3. Buat Express TypeScript di `backend`.
4. Jalankan `supabase init` di root.
5. Tambahkan migrasi SQL.
6. Buat folder `docs` dan `scripts`.
7. Buat root scripts untuk menjalankan frontend dan backend.
8. Setelah fondasi stabil, baru buat folder fitur sesuai urutan implementasi.

Jangan membuat semua file kosong sejak awal. Buat modul saat tahapnya mulai dikerjakan agar repository tetap mudah dibaca.
