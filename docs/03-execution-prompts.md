# Langkah Eksekusi dan Layering Prompt Codex

Dokumen ini membagi pengerjaan menjadi tujuh tahap besar. Satu tahap memakai satu prompt utama agar token tidak habis untuk percakapan kecil yang sebenarnya dapat diselesaikan dalam satu konteks kerja.

## Prinsip Pemakaian

1. Jalankan prompt secara berurutan.
2. Berikan Codex akses ke repository dan dokumen proyek.
3. Jangan lanjut ke tahap berikutnya sebelum build dan test tahap aktif berhasil.
4. Biarkan Codex memeriksa repository dan mengambil keputusan teknis yang wajar.
5. Jangan memaksa Codex mengikuti struktur secara buta jika kondisi repository nyata berbeda.
6. Commit setiap tahap agar mudah melakukan rollback.
7. Saat terjadi error, lanjutkan percakapan pada sesi tahap yang sama dengan log lengkap. Jangan membuat prompt baru untuk setiap error kecil.

---

# A. Persiapan Manual

## 1. Buat Repository

Struktur awal:

```text
sdi-digital-library/
├── frontend/
├── backend/
├── supabase/
└── docs/
```

Perintah contoh PowerShell:

```powershell
mkdir "sdi-digital-library"
cd "sdi-digital-library"
git init
npm init -y
npm install -D concurrently supabase
```

## 2. Scaffold Angular

```powershell
npx @angular/cli@latest new frontend `
  --routing `
  --style=scss `
  --strict `
  --skip-git
```

Gunakan opsi standalone jika CLI menanyakannya.

## 3. Scaffold Backend

```powershell
mkdir backend
cd backend
npm init -y

npm install express cors helmet dotenv zod @supabase/supabase-js
npm install -D typescript tsx @types/node @types/express @types/cors

npx tsc --init
cd ..
```

Codex boleh menambah dependency lain ketika modul yang membutuhkannya dikerjakan.

## 4. Inisialisasi Supabase

```powershell
npx supabase init
```

Letakkan query lengkap pada:

```text
supabase/migrations/202607180001_initial_schema.sql
```

Ada dua cara menjalankannya.

### Cara A — SQL Editor

1. Buat project Supabase.
2. Buka SQL Editor.
3. Tempel seluruh isi query.
4. Jalankan satu kali.
5. Buat user pertama melalui Authentication.
6. Jalankan bootstrap admin:

```sql
select public.bootstrap_master_admin('email-admin@sekolah.sch.id');
```

### Cara B — Supabase CLI

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

## 5. Buat Environment

Buat:

```text
backend/.env
frontend/src/environments/environment.ts
frontend/src/environments/environment.production.ts
```

Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke frontend.

## 6. Tambahkan Root Scripts

Pastikan root `package.json` memiliki minimal:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "npm --prefix frontend start",
    "dev:backend": "npm --prefix backend run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "npm --prefix frontend run build",
    "build:backend": "npm --prefix backend run build"
  }
}
```

---

# B. Prompt 1 — Audit Repository dan Fondasi Aplikasi

```text
Anda bekerja pada repository SDI Digital Library untuk perpustakaan sekolah dasar.

Stack utama:
- frontend Angular + TypeScript;
- backend Express + TypeScript;
- Supabase untuk PostgreSQL, Auth, dan Storage.

Sebelum mengubah kode, baca seluruh dokumen di folder docs, inspect struktur repository, package.json, konfigurasi TypeScript, environment example, dan migrasi Supabase. Jangan mengasumsikan repository kosong jika sudah ada kode.

Tugas tahap ini:
1. Rapikan fondasi monorepo tanpa melakukan overengineering.
2. Pastikan root scripts dapat menjalankan frontend dan backend bersama maupun terpisah.
3. Siapkan backend Express yang memiliki config environment tervalidasi, structured logging, CORS, Helmet, JSON parser, request ID, error handler terpusat, health endpoint, dan graceful shutdown.
4. Siapkan fondasi Angular berupa routing, public layout, dashboard layout, core auth area, HTTP interceptor, error handling, shared UI minimum, dan halaman placeholder yang masuk akal.
5. Buat .env.example yang aman untuk root/backend dan dokumentasikan variabel frontend.
6. Tambahkan lint, typecheck, build, dan test script yang realistis sesuai tool yang dipakai repository.
7. Perbaiki masalah konfigurasi yang ditemukan, tetapi jangan membangun fitur bisnis besar pada tahap ini.
8. Jalankan install, typecheck, test yang tersedia, serta build frontend dan backend.
9. Perbarui README dengan cara setup dan cara menjalankan project.

Ambil keputusan teknis yang wajar berdasarkan kondisi repository. Jangan membuat abstraction generik yang belum diperlukan. Jangan mengganti stack. Jangan menaruh service role key di frontend.

Hasil akhir tahap ini harus dapat dijalankan dengan:
- npm run dev:frontend
- npm run dev:backend
- npm run build

Setelah selesai, rangkum file penting yang dibuat/diubah, keputusan teknis, perintah verifikasi, hasil build/test, dan risiko yang masih tersisa.
```

### Checkpoint

```powershell
git add .
git commit -m "chore: establish frontend and backend foundation"
```

---

# C. Prompt 2 — Supabase, Auth, Profil, dan Role

```text
Lanjutkan SDI Digital Library dari fondasi yang sudah ada. Baca migrasi Supabase dan jangan menduplikasi tabel atau aturan yang sudah tersedia.

Implementasikan integrasi Supabase secara utuh untuk autentikasi dan otorisasi:
1. Buat pemisahan Supabase client backend untuk konteks user JWT dan konteks service role. Service role hanya boleh berada di backend.
2. Implementasikan middleware authenticate dan authorize untuk role master_admin, head_librarian, librarian, member, dan guest.
3. Validasi access token Supabase secara aman dan lampirkan identitas user serta profile ke request.
4. Buat endpoint auth/profile yang dibutuhkan aplikasi, termasuk current user, current profile, logout/session handling yang relevan, manajemen role oleh master admin, serta link akun Auth ke data member.
5. Implementasikan Angular auth service/store, login page, session restore, auth interceptor, auth guard, role guard, dan redirect dashboard berdasarkan role.
6. Buat navigasi berbeda sesuai hak akses:
   - master_admin: seluruh konfigurasi dan user;
   - head_librarian: monitoring dan laporan;
   - librarian: operasional;
   - member: katalog, reservasi, riwayat, digital library;
   - guest: katalog dan koleksi yang diizinkan.
7. Pastikan user biasa tidak dapat menaikkan role atau mengaktifkan dirinya sendiri.
8. Tambahkan test minimum untuk middleware, guard, role routing, dan akses endpoint.
9. Jalankan typecheck, test, serta build.

Gunakan schema dan RLS yang sudah ada sebagai sumber kebenaran. Bila migrasi mempunyai celah nyata, buat migration baru yang kecil dan terjelaskan; jangan mengedit sejarah migrasi secara sembarangan setelah sudah diterapkan. Hindari membuat sistem permission abstrak yang jauh lebih rumit daripada lima role ini.

Akhiri dengan ringkasan endpoint, matriks akses, file yang berubah, hasil test/build, dan langkah membuat master admin pertama.
```

### Checkpoint

```powershell
git add .
git commit -m "feat: implement authentication and role based access"
```

---

# D. Prompt 3 — Master Data, Member, Katalog, Import, dan Barcode

```text
Implementasikan modul data utama SDI Digital Library dengan pola yang konsisten terhadap fondasi repository.

Cakupan tahap:
1. CRUD tahun ajaran, kelas, rombongan belajar, kategori, pengarang, penerbit, rak, dan kategori biaya penggantian.
2. CRUD member dengan dukungan siswa/non-siswa. Saat is_student aktif, tampilkan dan validasi NIS, NISN, kelas, rombongan belajar, nomor kartu pelajar, dan kartu perpustakaan.
3. CRUD judul buku dan banyak eksemplar per judul.
4. inventory_code diinput petugas dan menjadi isi barcode maupun QR; sistem tidak boleh mengganti nilai tersebut dengan ID internal.
5. Fitur pencarian, filter, pagination, detail stok, status eksemplar, kondisi, lokasi rak, dan histori dasar.
6. Generate barcode/QR satuan dan batch dalam format yang dapat dicetak.
7. Import Excel/CSV untuk member dan buku:
   - sediakan template unduhan;
   - validasi header dan setiap baris;
   - deteksi duplikasi NIS, NISN, kartu, kode member, dan inventory_code;
   - simpan import job serta error per baris;
   - tampilkan ringkasan dan file error;
   - gunakan transaksi atau batch yang aman agar kegagalan sebagian tidak merusak data lain.
8. Buat UI Angular yang operasional dan cepat dipakai oleh dua petugas, termasuk form, tabel, bulk action yang memang berguna, serta feedback loading/error.
9. Tambahkan test untuk validasi member, duplikasi, import, dan barcode payload.
10. Jalankan typecheck, test, dan build.

Gunakan struktur feature-first di frontend dan modular vertical slice di backend, tetapi adaptasikan terhadap kode yang sudah ada. Jangan membuat file kosong massal. Jangan menambahkan ORM jika Supabase client/RPC sudah memadai. Prioritaskan alur kerja nyata petugas dibanding animasi atau kosmetik berlebihan.

Akhiri dengan daftar endpoint, format template import, contoh satu payload member dan buku, hasil test/build, dan kekurangan yang harus ditangani pada tahap berikutnya.
```

### Checkpoint

```powershell
git add .
git commit -m "feat: add library master data catalog and imports"
```

---

# E. Prompt 4 — Peminjaman, Reservasi, Kunjungan, Pengembalian, dan Denda

```text
Bangun inti operasional SDI Digital Library. Ini adalah tahap paling penting dan harus berfungsi end-to-end.

Gunakan RPC/database functions dari migrasi Supabase untuk operasi yang memerlukan konsistensi transaksi. Jangan menghitung aturan kritis hanya di frontend.

Implementasikan:
1. Scan kartu member dan lookup cepat.
2. Scan inventory_code seperti input scanner keyboard; sediakan input manual sebagai fallback.
3. Peminjaman langsung oleh petugas:
   - maksimal 3 buku aktif;
   - masa pinjam 7 hari;
   - buku harus tersedia;
   - member harus aktif;
   - satu eksemplar tidak boleh dipinjam ganda;
   - tampilkan receipt.
4. Reservasi oleh member dengan status pending, daftar reservasi petugas, penolakan beserta alasan, pembatalan, kedaluwarsa, dan konversi menjadi loan ketika siswa datang.
5. Pengembalian berdasarkan inventory_code, perhitungan terlambat Rp2.000 per hari, pemilihan kondisi baik/rusak/hilang, dan biaya penggantian berdasarkan kategori buku.
6. Perpanjangan maksimal satu kali dengan tambahan satu hari dan penolakan jika ada reservasi aktif dari member lain.
7. Pembayaran denda penuh atau sebagian, sisa tagihan, status unpaid/partial/paid, dan bukti pembayaran.
8. Kunjungan individu melalui scan kartu serta kunjungan rombongan dengan kelas, rombel, guru pendamping, dan jumlah siswa.
9. Job terjadwal atau command aman untuk menandai overdue dan mengakhiri reservasi kedaluwarsa.
10. UI petugas yang mengutamakan kecepatan keyboard/scanner, fokus input otomatis, konfirmasi yang tidak mengganggu, dan pesan kesalahan yang jelas.
11. Portal member untuk reservasi, pinjaman aktif, jatuh tempo, riwayat, dan denda.
12. Integration test untuk race condition dasar dan seluruh aturan bisnis utama.
13. Jalankan test, typecheck, dan build.

Jangan menggandakan aturan bisnis yang sudah dijamin database. Frontend boleh memberi validasi awal untuk UX, tetapi backend/database tetap sumber kebenaran. Tangani kegagalan transaksi dan tampilkan pesan yang dapat dipahami petugas.

Selesai tahap ini berarti MVP peminjaman sudah benar-benar dapat didemokan dari login, scan, checkout, return, denda, sampai histori.
```

### Checkpoint

```powershell
git add .
git commit -m "feat: implement end to end library circulation"
```

---

# F. Prompt 5 — Digital Library dan Integrasi Website Sekolah

```text
Implementasikan modul koleksi digital dan katalog publik SDI Digital Library.

Cakupan:
1. CRUD metadata e-book/PDF, modul, video, dan audio.
2. Upload cover ke bucket public yang sesuai dan file utama ke bucket private digital-library.
3. Validasi MIME type, ukuran file, nama objek, serta hak akses upload/delete.
4. Hanya koleksi berstatus published yang dapat diakses pengguna biasa.
5. Pengunjung tanpa login boleh melihat halaman katalog dan metadata publik, tetapi akses file penuh/download meminta login.
6. User login dengan role member atau guest dapat membaca PDF, memutar video/audio, dan mengunduh jika is_downloadable aktif.
7. Gunakan signed URL atau mekanisme private storage yang aman; jangan mengekspos service role atau membuat bucket file utama menjadi public.
8. Catat view, play, dan download tanpa membuat request log yang berlebihan.
9. Buat katalog publik responsif dengan pencarian, kategori, media type, detail buku, informasi ketersediaan umum, koleksi terbaru, dan buku populer.
10. Sediakan pola integrasi ke website sekolah berupa URL halaman, endpoint publik terbatas, dan komponen/widget sederhana bila struktur project memungkinkan.
11. Tambahkan loading state, empty state, error state, dan fallback saat media tidak dapat diputar.
12. Tambahkan test akses file unpublished, akses tanpa login, role guest/member, dan upload petugas.
13. Jalankan typecheck, test, dan build.

Pertahankan akses file melalui Storage API. Jangan memodifikasi tabel storage.objects secara langsung. Pilih viewer/player yang sederhana dan stabil; jangan membangun DRM karena bukan scope proyek.
```

### Checkpoint

```powershell
git add .
git commit -m "feat: add digital library and public catalog"
```

---

# G. Prompt 6 — Dashboard, Laporan, PDF, Excel, dan Akreditasi

```text
Lengkapi dashboard dan laporan SDI Digital Library berdasarkan data nyata dari schema yang sudah tersedia.

Implementasikan:
1. Dashboard berbeda untuk master admin, kepala perpustakaan, dan petugas.
2. KPI: jumlah judul, eksemplar, tersedia, dipinjam, reservasi pending, keterlambatan, rusak, hilang, kunjungan hari ini, serta denda belum lunas.
3. Grafik peminjaman dan kunjungan berdasarkan rentang waktu.
4. Laporan:
   - buku paling sering dipinjam;
   - siswa paling aktif;
   - keterlambatan;
   - denda dan pembayaran;
   - buku rusak/hilang;
   - stok dan inventaris;
   - kunjungan individu/rombongan;
   - aktivitas koleksi digital;
   - ringkasan pendukung akreditasi.
5. Filter tanggal, kelas, rombel, kategori, status, dan pencarian yang relevan.
6. Export PDF dan Excel dari backend. File sementara dapat masuk bucket exports dengan signed URL yang cepat kedaluwarsa.
7. Hasil export harus memuat identitas sekolah yang dapat dikonfigurasi, judul laporan, periode, waktu cetak, filter, tabel, ringkasan, dan nomor halaman jika memungkinkan.
8. Query laporan harus efisien untuk volume sekolah ini dan menggunakan index/view yang ada. Perbaiki query N+1.
9. Kepala perpustakaan hanya membaca/mengekspor; petugas tidak boleh memperoleh konfigurasi master admin.
10. Tambahkan test query/report, validasi filter, otorisasi, dan export.
11. Jalankan typecheck, test, dan build.

Jangan membuat angka dummy pada dashboard produksi. Empty data harus tampil sebagai nol atau empty state yang benar. Bila format laporan akreditasi resmi belum diberikan, buat laporan pendukung generik yang dapat dipetakan kemudian dan dokumentasikan asumsi tersebut.
```

### Checkpoint

```powershell
git add .
git commit -m "feat: add dashboards reports and exports"
```

---

# H. Prompt 7 — Hardening, Uji Terima, Deployment, dan Dokumentasi

```text
Lakukan tahap final SDI Digital Library sampai siap deploy. Jangan menambah fitur baru besar kecuali diperlukan untuk menutup cacat kritis.

Kerjakan:
1. Audit keamanan frontend, backend, Supabase RLS, Storage policies, environment, upload, rate limit, CORS, session, role escalation, dan kebocoran service role.
2. Audit transaksi peminjaman untuk double checkout, retry request, race condition, dan idempotency yang masuk akal.
3. Jalankan database lint/test yang tersedia, backend unit/integration test, frontend test, typecheck, lint, dan production build.
4. Buat seed/demo data yang jelas bukan data sekolah nyata dan tidak masuk production secara otomatis.
5. Buat smoke test end-to-end untuk:
   - login setiap role;
   - import member;
   - tambah judul dan eksemplar;
   - generate barcode;
   - scan kunjungan;
   - pinjam tiga buku;
   - penolakan buku keempat;
   - reservasi;
   - pengembalian tepat waktu dan terlambat;
   - rusak/hilang;
   - pembayaran denda;
   - akses koleksi digital;
   - export laporan.
6. Perbaiki bug yang ditemukan dan dokumentasikan keterbatasan yang benar-benar tersisa.
7. Optimalkan UX petugas untuk dua komputer perpustakaan, termasuk keyboard navigation, scanner focus, loading, retry, dan error recovery.
8. Siapkan konfigurasi production:
   - Angular production build;
   - Express process management;
   - reverse proxy Nginx;
   - HTTPS;
   - environment production;
   - health check;
   - log rotation;
   - backup;
   - job overdue/reservation;
   - batas upload.
9. Buat docs/deployment.md, docs/user-guide.md, docs/admin-guide.md, dan checklist go-live.
10. Perbarui README dengan setup lokal, migrasi database, bootstrap admin, test, build, deploy, backup, dan rollback.
11. Jangan mengklaim berhasil jika test/build gagal. Tampilkan error yang belum terselesaikan secara jujur.

Hasil akhir harus menyertakan:
- status setiap test/build;
- daftar bug yang diperbaiki;
- daftar environment variable production;
- langkah deployment berurutan;
- checklist uji terima;
- rekomendasi backup dan rollback;
- commit akhir yang siap dipush.
```

### Checkpoint

```powershell
git add .
git commit -m "chore: harden test and prepare production deployment"
```

---

# I. Strategi Satu Malam dan Satu Minggu

## Target Satu Malam

Jalankan:

1. Prompt 1.
2. Prompt 2.
3. Bagian inti Prompt 3: member, judul, eksemplar, barcode.
4. Prompt 4: fokus checkout dan return.

Hasil yang harus sudah dapat didemokan:

- Login petugas.
- Tambah/import member.
- Tambah judul dan eksemplar.
- Scan kartu.
- Scan buku.
- Pinjam maksimal tiga buku.
- Kembalikan buku.
- Hitung denda.

Jangan mengejar digital library, laporan lengkap, atau kosmetik dashboard sebelum alur ini stabil.

## Target Satu Minggu

| Hari | Fokus |
|---|---|
| 1 | Prompt 1 dan Prompt 2 |
| 2 | Prompt 3 |
| 3–4 | Prompt 4 |
| 5 | Prompt 5 |
| 6 | Prompt 6 |
| 7 | Prompt 7 dan go-live checklist |

---

# J. Cara Memberi Instruksi Perbaikan Tanpa Membuat Prompt Baru

Ketika tahap aktif gagal, gunakan pola berikut di sesi yang sama:

```text
Lanjutkan tahap yang sedang dikerjakan. Berikut error aktual dari perintah <perintah>:

<tempel log lengkap>

Analisis akar masalah berdasarkan repository saat ini. Perbaiki penyebabnya, bukan hanya menutupi error. Pertahankan keputusan dan scope tahap sebelumnya, jalankan kembali verifikasi terkait, lalu jelaskan perubahan dan hasilnya.
```

Untuk review hasil tahap:

```text
Review implementasi tahap ini terhadap requirement di docs dan migrasi Supabase. Cari fitur yang belum tersambung end-to-end, aturan bisnis yang hanya ada di UI, security gap, dead code, serta test yang memberi rasa aman palsu. Perbaiki temuan penting, lalu jalankan ulang test/typecheck/build.
```

Dua pola tersebut cukup untuk iterasi. Tidak perlu membuat prompt terpisah untuk controller, service, repository, setiap halaman, dan setiap endpoint.
