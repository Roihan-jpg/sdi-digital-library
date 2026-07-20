# SDI Digital Library

Monorepo prototype perpustakaan sekolah dasar dengan Angular, Express TypeScript, dan Supabase. Fondasi saat ini mencakup autentikasi Supabase, profile database, role-based access control, shell UI, dan API Express.

## Prasyarat

- Node.js 24 LTS atau versi yang kompatibel dengan Angular 22
- npm 11+
- Docker Desktop jika menjalankan Supabase lokal
- Supabase CLI (tersedia sebagai dev dependency root)

## Instalasi

Dependency dikelola oleh tiga package terpisah agar perintah `--prefix` tetap sederhana.

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

Salin environment backend, kemudian isi dengan nilai project development. Jangan commit file `.env`.

```powershell
Copy-Item backend/.env.example backend/.env
```

Root `.env.example` hanya dipakai untuk kebutuhan Supabase CLI/operasional. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh berada di backend.

## Environment

Backend membaca `backend/.env` dan memvalidasinya saat startup:

| Variabel | Keterangan |
|---|---|
| `NODE_ENV` | `development`, `test`, atau `production` |
| `PORT` | Port API, default `3000` |
| `APP_ORIGIN` | Origin Angular yang diizinkan; pisahkan beberapa origin dengan koma |
| `API_BASE_PATH` | Prefix API, default `/api` |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | Anon/publishable key untuk konteks user |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret backend untuk operasi administratif terkontrol |
| `LOG_LEVEL` | Level structured log Pino |
| `JSON_BODY_LIMIT` | Batas body JSON Express, default `1mb` |

Konfigurasi frontend berada di:

- `frontend/src/environments/environment.ts` untuk development;
- `frontend/src/environments/environment.production.ts` untuk production build.

Frontend hanya boleh memuat `apiBaseUrl`, `supabaseUrl`, dan `supabasePublishableKey`. Jangan pernah menambahkan service role key, database password, atau JWT secret ke bundle Angular.

## Menjalankan aplikasi

Jalankan frontend dan backend bersama:

```powershell
npm run dev
```

Atau jalankan terpisah:

```powershell
npm run dev:frontend
npm run dev:backend
```

Angular berjalan di `http://localhost:4200` dan meneruskan request `/api` ke backend di `http://localhost:3000`. Health check tersedia di `GET http://localhost:3000/api/health`.

## Autentikasi dan profile

Angular login langsung ke Supabase Auth menggunakan publishable key. Access token kemudian dikirim ke Express. Backend memvalidasi token melalui Supabase Auth dan selalu mengambil role aktif dari tabel `profiles`; role dari request frontend tidak dipercaya.

| Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/auth/me` | Semua akun aktif | User, profile, role, dan member tertaut |
| `POST /api/auth/logout` | Semua akun aktif | Invalidasi sesi aktif |
| `GET /api/profiles/me` | Semua akun aktif | Profile pengguna saat ini |
| `PATCH /api/profiles/me` | Semua akun aktif | Ubah nama/avatar sendiri; tidak menerima role/status |
| `GET /api/profiles` | `master_admin` | Daftar profile dengan pagination |
| `PATCH /api/profiles/:id/role` | `master_admin` | Ubah role melalui RPC database |
| `PATCH /api/profiles/:id/status` | `master_admin` | Aktifkan/nonaktifkan akun |
| `POST /api/profiles/:id/link-member` | `master_admin`, `librarian` | Hubungkan akun Auth dengan member |

Navigasi dan dashboard diarahkan berdasarkan role `master_admin`, `head_librarian`, `librarian`, `member`, atau `guest`. Otorisasi sebenarnya tetap ditegakkan di backend dan RLS, bukan melalui menu Angular.

## Supabase lokal

```powershell
npm run db:start
npm run db:reset
```

Migration awal membuat schema, RLS, RPC sirkulasi, bucket, dan data referensi. Untuk project remote baru, link project dan periksa perubahan sebelum push:

```powershell
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Setelah membuat akun Auth pertama, bootstrap master admin melalui SQL Editor:

```sql
select public.bootstrap_master_admin('email-admin@sekolah.sch.id');
```

User Auth baru otomatis memperoleh profile role `guest`. Fungsi bootstrap tidak dapat dipanggil melalui public API dan hanya dijalankan dari SQL Editor dengan hak administratif.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Perintah root meneruskan pemeriksaan ke frontend dan backend. Build Angular menghasilkan output SSR di `frontend/dist/frontend`, sedangkan backend dikompilasi ke `backend/dist`.

## Struktur utama

```text
frontend/   Angular standalone, feature-first
backend/    Express TypeScript REST API
supabase/   konfigurasi dan SQL migrations
docs/       konsep, alur, struktur, dan prompt tahap pengerjaan
```

Autentikasi dan role sudah aktif. Modul transaksi, master data, reservasi, dan koleksi digital masih merupakan tahap berikutnya.
