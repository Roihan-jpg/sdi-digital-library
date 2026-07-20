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

## Master data, member, katalog, dan import

Migration `202607200001_master_data_import.sql` menambahkan nomor kartu pelajar unik, validasi identitas siswa yang lebih lengkap, index operasional, dan audit master data/import. Terapkan migration sebelum mencoba modul baru:

```powershell
npm run db:reset
```

Halaman operasional tersedia di dashboard untuk `master_admin`/`librarian`: Master data, Member, Buku & eksemplar, serta Import data. `head_librarian` memperoleh akses baca master/member/inventaris. Katalog publik tersedia di `/katalog`.

Template import menerima `.xlsx` atau `.csv` maksimal 10 MB. Header member:

```text
member_code,nis,nisn,full_name,gender,class,study_group,student_card_number,library_card_number,is_active
```

Header buku:

```text
inventory_code,title,category,author,publisher,publication_year,isbn,shelf,condition,replacement_cost,status
```

Kategori, pengarang, penerbit, kelas/rombel, dan rak yang disebut file import harus sudah ada pada master data. Hasil gagal dapat diunduh sebagai CSV per import job.

Endpoint utama:

| Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/catalog` dan `GET /api/catalog/:id` | Publik | Pencarian, pagination, detail stok katalog |
| `/api/master-data/:kind` | Staf | CRUD delapan jenis master data |
| `/api/members` | Staf | CRUD, filter, pagination member |
| `/api/catalog/titles` dan `/api/catalog/copies` | Master/petugas | CRUD judul dan eksemplar |
| `POST /api/catalog/labels/print` | Master/petugas | Label barcode/QR batch siap cetak |
| `/api/imports` | Master/petugas | Template, upload, riwayat, dan CSV error |

Nilai barcode dan QR selalu sama persis dengan `inventory_code`; UUID database tidak pernah dijadikan payload label.

Autentikasi, role, master data, member, katalog fisik, label, dan import dasar sudah aktif. Modul transaksi sirkulasi, reservasi, dan koleksi digital merupakan tahap berikutnya.
