# SDI Digital Library

Monorepo prototype perpustakaan sekolah dasar dengan Angular, Express TypeScript, dan Supabase. Tahap fondasi menyediakan shell UI, routing publik/dashboard, middleware HTTP, serta API Express yang aman untuk dikembangkan ke modul bisnis berikutnya.

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

Frontend hanya boleh memuat `apiBaseUrl`, `supabaseUrl`, dan `supabaseAnonKey`. Ganti placeholder production melalui konfigurasi deployment yang aman; jangan pernah menambahkan service role key, database password, atau JWT secret ke bundle Angular.

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

Fondasi ini belum mengaktifkan login Supabase atau fitur transaksi. Halaman login/dashboard yang tersedia adalah titik integrasi untuk tahap autentikasi, bukan implementasi bisnis semu.
