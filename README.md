# SDI Digital Library

Monorepo prototype perpustakaan sekolah dasar dengan Angular, Express TypeScript, dan Supabase. Master admin memakai Supabase Auth; akun role lain memakai akun lokal yang tersimpan aman di database aplikasi.

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
| `SUPABASE_JWT_SECRET` | JWT secret project Supabase, hanya untuk backend menandatangani sesi akun lokal agar RLS/RPC tetap mengenali profile lokal |
| `LOG_LEVEL` | Level structured log Pino |
| `JSON_BODY_LIMIT` | Batas body JSON Express, default `1mb` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Jendela dan maksimum request per IP |
| `TRUST_PROXY_HOPS` | Jumlah reverse proxy tepercaya; production Nginx tunggal = `1` |
| `REQUEST_TIMEOUT_MS` | Timeout request server |
| `HEADERS_TIMEOUT_MS` | Timeout penerimaan header |
| `KEEP_ALIVE_TIMEOUT_MS` | Timeout koneksi keep-alive |

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

`master_admin` login melalui Supabase Auth dan dapat memiliki beberapa akun untuk kontinuitas operasional. `head_librarian`, `librarian`, `member`, dan `guest` login dengan username serta kata sandi akun lokal. Backend menyimpan password dengan hash `scrypt`, menerbitkan sesi JWT singkat yang tervalidasi terhadap tabel sesi, dan selalu mengambil role aktif dari tabel `profiles`; role dari request frontend tidak dipercaya. Saat profile ber-role `member` dibuat atau dipromosikan, database otomatis membuat data anggota sementara yang aktif agar akun dapat langsung reservasi. JWT secret tidak pernah dikirim ke Angular.

| Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/auth/me` | Semua akun aktif | User, profile, role, dan member tertaut |
| `POST /api/auth/local-login` | Publik | Login akun lokal dengan username dan kata sandi |
| `POST /api/auth/logout` | Semua akun aktif | Invalidasi sesi aktif |
| `PATCH /api/auth/password` | Semua akun aktif | Ganti kata sandi; wajib untuk akun dengan kata sandi sementara |
| `GET /api/profiles/me` | Semua akun aktif | Profile pengguna saat ini |
| `PATCH /api/profiles/me` | Semua akun aktif | Ubah nama/avatar sendiri; tidak menerima role/status |
| `GET /api/profiles` | `master_admin` | Daftar profile dengan pagination |
| `GET /api/profiles/member-link-candidates` | `master_admin`, `librarian` | Kandidat koreksi data legacy; tidak diperlukan dalam alur akun member normal |
| `POST /api/profiles` | `master_admin` | Buat akun lokal non-master-admin; role `member` otomatis memperoleh data anggota sementara |
| `PATCH /api/profiles/:id/role` | `master_admin` | Ubah role akun lokal; master admin tidak dapat dipindahkan dari Supabase Auth |
| `PATCH /api/profiles/:id/status` | `master_admin` | Aktifkan/nonaktifkan akun |
| `POST /api/profiles/:id/link-member` | `master_admin`, `librarian` | Koreksi administratif untuk data legacy, bukan langkah pembuatan akun member normal |
| `PATCH /api/profiles/:id/password` | `master_admin` | Atur ulang kata sandi akun lokal |

Navigasi dan dashboard diarahkan berdasarkan role `master_admin`, `head_librarian`, `librarian`, `member`, atau `guest`. Guest tetap berada di katalog publik dan tidak memiliki dashboard. Otorisasi sebenarnya tetap ditegakkan di backend dan RLS, bukan melalui menu Angular.

| Role | Menu dan kemampuan utama |
|---|---|
| `master_admin` | Monitoring, user/role, konfigurasi, audit, status sistem, seluruh laporan; tanpa aksi operasional |
| `head_librarian` | Monitoring, seluruh data operasional mode baca, seluruh laporan/export |
| `librarian` | Sirkulasi dan pengelolaan data operasional, laporan harian terbatas |
| `member` | Katalog, koleksi digital, pinjaman, reservasi, denda, dan riwayat sendiri |
| `guest` | Katalog publik/koleksi yang diizinkan; tidak dapat pinjam atau reservasi fisik |

## Supabase lokal

```powershell
npm run db:start
npm run db:reset
npm run db:test
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

Setiap user Auth baru otomatis memperoleh profile `master_admin`; gunakan Supabase Auth Admin API/Dashboard untuk membuat akun tambahan dan pastikan email terkonfirmasi sesuai kebijakan deployment. Fungsi bootstrap tetap tersedia untuk menghubungkan akun pertama ke profile `master_admin`, tidak dapat dipanggil melalui public API, dan hanya dijalankan dari SQL Editor dengan hak administratif. Sistem tetap menjaga agar minimal satu master admin aktif selalu tersedia.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run db:test` menjalankan seluruh assertion SQL di `supabase/tests` terhadap container database lokal. Data sintetis opsional tersedia di `supabase/demo/seed_demo.sql` dan tidak dijalankan otomatis.

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

Halaman operasional edit tersedia untuk `librarian`: sirkulasi, master data, member, buku/eksemplar, koleksi digital, dan import. `head_librarian` memperoleh tampilan baca aktivitas serta data operasional. `master_admin` tidak mewarisi akses operasional. Katalog publik tersedia di `/katalog`.

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

## Sirkulasi, reservasi, kunjungan, dan denda

Prompt 4 menyediakan meja layanan petugas di `/dashboard/circulation` dan portal anggota di `/dashboard/member`. Seluruh perubahan status kritis menggunakan RPC database dengan konteks JWT pengguna; Angular hanya melakukan validasi awal untuk UX.

Alur yang tersedia:

- lookup dan scan kartu member serta kode inventaris;
- checkout maksimal tiga eksemplar dengan jatuh tempo dari pengaturan database;
- return baik/rusak/hilang, denda terlambat, dan biaya penggantian;
- satu kali perpanjangan serta penolakan ketika judul direservasi anggota lain;
- reservasi member, approval/rejection/cancellation, dan konversi ke loan;
- pembayaran denda penuh/sebagian beserta sisa tagihan dan receipt;
- kunjungan individual dan rombongan;
- histori pinjaman, jatuh tempo, reservasi, dan denda pada portal member.

Endpoint utama:

| Endpoint | Akses | Fungsi |
|---|---|---|
| `/api/circulation/lookup/*` | Master/petugas | Lookup scanner member dan eksemplar |
| `POST /api/circulation/checkout` | Master/petugas | Checkout transaksional |
| `POST /api/circulation/return` | Master/petugas | Return dan penetapan denda |
| `POST /api/circulation/renew` | Master/petugas | Perpanjangan satu item |
| `/api/reservations` | Member/staf sesuai aksi | Buat, daftar, approve, reject, cancel, convert |
| `/api/circulation/fines` | Member/staf sesuai RLS | Daftar dan pembayaran denda |
| `/api/visits` | Staf | Kunjungan individual/rombongan |
| `POST /api/circulation/maintenance` | Master/petugas | Tandai overdue dan akhiri reservasi expired |

Untuk scheduler production, jalankan command idempoten berikut melalui cron/Task Scheduler menggunakan environment backend. Jangan mencatat isi secret pada log scheduler.

```powershell
npm run maintenance
```

Database remote memiliki migrasi `complete_library_operations_rpcs` dan `restrict_library_operations_rpcs_to_authenticated`. File lokal dengan timestamp remote yang sama harus ikut diterapkan pada database baru melalui `npm run db:reset` atau alur `supabase db push` yang terdokumentasi di atas.

Autentikasi, role, master data, member, katalog fisik, label, import, sirkulasi, koleksi digital, dashboard, laporan, dan export sudah tersedia. Panduan final:

- `docs/deployment.md`: deployment, environment, backup, restore, dan rollback;
- `docs/user-guide.md`: panduan pengunjung, member, dan petugas;
- `docs/admin-guide.md`: akun, data, Storage, laporan, dan operasional;
- `docs/go-live-checklist.md`: uji terima dan checklist rilis;
- `docs/security-audit.md`: temuan hardening serta risiko tersisa.

Untuk production, jalankan dry-run migration, seluruh quality gate, lalu ikuti deployment berurutan. Template PM2, Nginx, logrotate, dan cron berada di `deploy/`. Jangan menjalankan `npm run smoke:uat` pada production; script sengaja hanya menerima `SMOKE_TARGET=local` atau `staging`.
