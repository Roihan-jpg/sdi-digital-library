# Deployment SDI Digital Library

Panduan ini memakai satu VPS Linux, Nginx, PM2, Angular SSR, Express, dan Supabase Cloud. Ganti `library.example.sch.id` serta path `/var/www/sdi-digital-library` sebelum go-live.

## Environment production

Simpan backend secret di `backend/.env` dengan permission `0600`; jangan menaruhnya di Git, Nginx, Angular, atau log.

| Variabel | Wajib | Nilai/tujuan |
|---|---:|---|
| `NODE_ENV` | ya | `production` |
| `PORT` | ya | `3000` untuk API |
| `APP_ORIGIN` | ya | URL HTTPS aplikasi, dapat dipisahkan koma |
| `API_BASE_PATH` | ya | `/api` |
| `SUPABASE_URL` | ya | URL project production |
| `SUPABASE_ANON_KEY` | ya | publishable/anon key untuk konteks user |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | secret backend saja |
| `LOG_LEVEL` | ya | `info` atau `warn` |
| `JSON_BODY_LIMIT` | ya | contoh `1mb` |
| `RATE_LIMIT_WINDOW_MS` | ya | contoh `60000` |
| `RATE_LIMIT_MAX` | ya | contoh `120`, sesuaikan hasil load test |
| `TRUST_PROXY_HOPS` | ya | `1` jika tepat satu Nginx di depan API |
| `REQUEST_TIMEOUT_MS` | ya | contoh `30000` |
| `HEADERS_TIMEOUT_MS` | ya | contoh `15000` |
| `KEEP_ALIVE_TIMEOUT_MS` | ya | contoh `5000` |

Frontend hanya boleh berisi `apiBaseUrl`, `supabaseUrl`, dan publishable key pada `frontend/src/environments/environment.production.ts`. Build production memakai `/api` pada origin yang sama.

## Urutan deployment

1. Buat project Supabase production. Atur Site URL/redirect URL HTTPS, nonaktifkan signup publik, aktifkan MFA untuk master admin bila paket mendukung, SSL enforcement, dan network restriction sesuai kebutuhan. Salin JWT secret project ke `backend/.env` sebagai `SUPABASE_JWT_SECRET`; jangan pernah memasukkannya ke Angular.
2. Hubungkan CLI, periksa migration yang akan diterapkan, lalu push:

   ```bash
   npx supabase link --project-ref PROJECT_REF
   npx supabase db push --dry-run
   npx supabase db push
   ```

3. Jalankan Security Advisor dan Performance Advisor di Dashboard. Pastikan tidak ada policy/grant baru yang tidak ditinjau.
4. Buat akun Auth master admin pertama, lalu jalankan sekali dari SQL Editor administratif:

   ```sql
   select public.bootstrap_master_admin('admin@contoh.sch.id');
   ```

   User Auth baru berikutnya juga otomatis menjadi `master_admin`. Migration akun lokal menghapus seluruh user Auth non-master-admin yang lama. Data profile, member, audit, dan transaksi dipertahankan, tetapi master admin harus menetapkan kata sandi baru untuk tiap akun lokal sebelum pengguna dapat masuk.

5. Clone/copy source ke `/var/www/sdi-digital-library`, install Node.js LTS, npm, PM2, Nginx, PostgreSQL client, dan Certbot. Buat `backend/.env` berizin `0600`.
6. Sesuaikan `frontend/src/environments/environment.production.ts`, kemudian install dan build:

   ```bash
   npm ci
   npm --prefix backend ci
   npm --prefix frontend ci
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

7. Buat direktori `logs`, salin `deploy/nginx/sdi-digital-library.conf` ke `/etc/nginx/sites-available/`, ganti domain, aktifkan site, dan validasi `nginx -t`.
8. Terbitkan sertifikat dengan Certbot. Setelah sertifikat tersedia, reload Nginx.
9. Jalankan proses dan simpan startup PM2:

   ```bash
   pm2 start deploy/ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

10. Salin konfigurasi logrotate dan cron setelah menyesuaikan user/path. Pastikan job maintenance dapat membaca `backend/.env` tetapi output log tidak memuat secret.
11. Uji `GET https://DOMAIN/api/health`, login semua role, upload, sirkulasi, signed URL, dan export. Jalankan checklist di `docs/go-live-checklist.md`.

## Upload dan reverse proxy

Nginx menerima maksimum 101 MB agar upload digital 100 MB tidak terpotong oleh overhead multipart. Bucket database tetap membatasi cover 5 MB, digital 100 MB, import 10 MB, dan export 50 MB. Ubah batas aplikasi, bucket, dan Nginx bersamaan.

Form **Koleksi digital** membuat sesi singkat melalui API, lalu browser mengunggah file utama langsung ke endpoint Storage Supabase (`<project-ref>.storage.supabase.co`) menggunakan token bertenggat dan path yang dibatasi. Pastikan perangkat petugas dapat menjangkau domain tersebut lewat HTTPS; jangan memproksikan byte file itu kembali melalui Cloudflare Tunnel/Nginx aplikasi. API hanya menerima metadata sesi dan finalisasi. Endpoint multipart lama tetap dipertahankan sementara untuk kompatibilitas, sehingga batas Nginx di atas masih diperlukan sampai endpoint tersebut dipensiunkan.

## Backup

`scripts/backup-database.sh` menghasilkan custom PostgreSQL dump, roles dump, dan checksum. Jalankan harian ke disk terenkripsi, lalu salin ke lokasi off-site dengan retensi minimal 30 harian dan 12 bulanan. Uji restore secara berkala.

Database backup tidak menyertakan objek Supabase Storage. Salin bucket `covers`, `digital-library`, `imports`, dan `exports` secara terpisah melalui Storage/S3 API ke penyimpanan off-site. Jangan menjadikan bucket private public ketika melakukan backup.

## Restore dan rollback

1. Hentikan traffic tulis atau aktifkan maintenance page.
2. Simpan backup database dan Storage terbaru sebelum rollback.
3. Untuk rollback aplikasi, deploy commit terakhir yang lulus build dan restart PM2.
4. Migration yang sudah diterapkan tidak dihapus/diedit. Buat migration koreksi forward. Restore penuh hanya untuk insiden kehilangan/korupsi data dan harus diuji di staging terlebih dahulu.
5. Restore database custom dump ke project kosong/staging, lalu pulihkan objek Storage dengan path yang sama.
6. Jalankan health check, database integration test yang aman untuk staging, dan smoke UAT sebelum membuka traffic.

## Health dan observabilitas

- Monitor `/api/health`, status PM2, error rate HTTP, disk, memory, latency, Supabase usage, dan kegagalan cron.
- Log API memakai request ID. Jangan mencatat token, password, service role, atau signed URL.
- Log aplikasi dirotasi oleh `deploy/logrotate/sdi-digital-library`; Nginx memakai rotasi distro.
- Alert jika backup/checksum gagal, maintenance job gagal, atau health check gagal berturut-turut.
