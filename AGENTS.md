# AGENTS.md

## Purpose

Panduan ini berlaku untuk seluruh repository **SDI Digital Library**. Gunakan sebagai guardrail arsitektur dan aturan bisnis, bukan instruksi kaku file-per-file.

Selalu periksa kondisi repository sebelum mengubah kode. Pertahankan kode yang sudah bekerja, hindari overengineering, dan sesuaikan implementasi dengan struktur aktual project.

`AGENTS.md` yang berada di subfolder boleh menambahkan atau mengganti aturan khusus untuk folder tersebut.

Akses .agents\skills\supabase dan .agents\skills\supabase-postgres-best-practices\ jika membutuhkan pengetahuan tentang yang berhubungan dengan supabase

---

## Project Context

SDI Digital Library adalah website perpustakaan sekolah dasar dengan kondisi lapangan:

- 592 siswa;
- 41 guru;
- 2 petugas perpustakaan;
- sistem lama menggunakan teknologi usang;
- data lama menumpuk dan tidak terkelola;
- siswa sudah memiliki NIS, NISN, kartu pelajar, dan kartu anggota perpustakaan;
- aplikasi harus dapat diakses melalui jaringan sekolah dan internet publik;
- hasil akhirnya adalah prototype magang yang siap digunakan dan siap deploy;
- prioritas MVP adalah peminjaman dan pengembalian.

Koleksi yang dikelola:

- buku fisik;
- e-book/PDF;
- modul pembelajaran;
- video pembelajaran;
- audio pembelajaran.

---

## Fixed Stack

Jangan mengganti stack utama tanpa instruksi eksplisit dari user.

### Frontend

- Angular
- TypeScript
- SCSS
- feature-first structure

### Backend

- Node.js
- Express.js
- TypeScript
- REST API
- modular vertical slices

### Platform

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- SQL migrations
- database RPC/functions untuk operasi transaksional

### Repository

```text
frontend/
backend/
supabase/
docs/
scripts/
```

Jangan menambahkan ORM berat, microservices, framework frontend lain, atau framework backend lain hanya demi abstraksi.

---

## Read Before Coding

Sebelum mengerjakan fitur, baca:

1. `README.md`
2. `docs/00-project-concept.md`
3. `docs/01-flowchart-schema.md`
4. `docs/02-project-structure.md`
5. `docs/03-execution-prompts.md`
6. seluruh file di `supabase/migrations/`
7. source code dan test yang berkaitan
8. root serta package-level `package.json`

Kode aktual dan migration yang sudah diterapkan merupakan sumber kebenaran utama.

Jika dokumentasi dan kode berbeda:

1. tentukan apakah kode lebih baru, belum lengkap, atau keliru;
2. jangan menimpa kode yang valid secara buta;
3. lakukan perubahan terkecil yang tetap menyelesaikan alur secara utuh;
4. perbarui dokumentasi jika perilaku memang berubah.

---

## Roles

Role aplikasi:

- `master_admin`
- `head_librarian`
- `librarian`
- `member`
- `guest`

Aturan:

- user biasa tidak boleh menaikkan role sendiri;
- `master_admin` mengelola konfigurasi dan role;
- `head_librarian` fokus monitoring dan laporan;
- `librarian` menjalankan operasional perpustakaan;
- `member` dapat melihat katalog, reservasi, riwayat, dan koleksi digital;
- `guest` hanya mengakses katalog publik dan koleksi yang diizinkan;
- guest tidak dapat meminjam atau mereservasi buku fisik.

---

## Member Rules

Member dapat berupa siswa atau non-siswa.

Jika `is_student = true`, dukung dan validasi:

- NIS;
- NISN;
- kelas;
- rombongan belajar;
- nomor kartu pelajar;
- nomor kartu perpustakaan.

Nomor penting berikut harus dilindungi dari duplikasi:

- NIS;
- NISN;
- nomor kartu pelajar;
- nomor kartu perpustakaan;
- kode member.

Gunakan unique constraint jika sesuai, bukan hanya validasi frontend.

---

## Book and Inventory Rules

Satu judul buku dapat memiliki banyak eksemplar.

Setiap eksemplar mempunyai `inventory_code` unik yang diinput petugas.

Isi barcode atau QR Code harus sama persis dengan `inventory_code`.

Jangan mengganti payload barcode/QR dengan:

- UUID database;
- angka auto increment;
- token acak;
- identifier internal lain.

Satu eksemplar tidak boleh mempunyai lebih dari satu pinjaman aktif.

Status eksemplar harus konsisten, misalnya:

- available;
- reserved;
- borrowed;
- damaged;
- lost;
- maintenance.

Perubahan status kritis harus dilakukan dalam transaksi database.

---

## Loan Rules

Aturan siswa:

- maksimal buku aktif: **3 eksemplar**;
- masa pinjam: **7 hari**;
- perpanjangan: maksimal **1 kali**;
- durasi tambahan: **1 hari**;
- denda terlambat: **Rp2.000 per hari per eksemplar**.

Peminjaman harus ditolak jika:

- member tidak aktif;
- batas tiga buku telah tercapai;
- eksemplar tidak tersedia;
- eksemplar sudah dipinjam;
- identitas member atau buku tidak valid.

Aturan kritis wajib divalidasi di backend dan database, bukan hanya Angular.

Frontend boleh melakukan validasi awal untuk UX, tetapi backend/database tetap sumber kebenaran.

---

## Reservation Rules

Member dapat memesan buku secara online.

Alur dasar:

1. member membuat reservasi;
2. status awal `pending`;
3. member datang ke perpustakaan;
4. petugas memindai kartu;
5. petugas memeriksa kembali kelayakan member dan ketersediaan;
6. petugas approve;
7. reservasi dikonversi menjadi loan.

Status yang perlu didukung:

- pending;
- approved;
- rejected;
- cancelled;
- expired;
- completed.

Penolakan harus dapat menyimpan alasan.

Reservasi pending tidak sama dengan transaksi peminjaman aktif.

---

## Return, Damage, Loss, and Fine Rules

Saat pengembalian:

- cari loan item aktif melalui `inventory_code`;
- hitung keterlambatan di server/database;
- hitung denda di server/database;
- catat kondisi buku;
- ubah status eksemplar secara atomik;
- simpan petugas yang memproses.

Kondisi hasil pengembalian:

- available;
- damaged;
- lost.

Biaya rusak atau hilang mengikuti kategori biaya penggantian buku.

Pembayaran denda mendukung:

- unpaid;
- partial;
- paid.

Jangan menghapus histori transaksi untuk memperbaiki kesalahan data. Gunakan record koreksi, pembayaran, audit, atau aksi administratif yang eksplisit.

---

## Visit Rules

Kunjungan individu dilakukan dengan scan kartu anggota.

Siswa tanpa kartu tidak diterima secara individual.

Pengecualian:

- kunjungan rombongan belajar;
- didampingi guru;
- dicatat sebagai group visit.

Dukung:

- scan kartu;
- input manual sebagai fallback;
- kelas;
- rombel;
- guru pendamping;
- jumlah siswa;
- waktu kunjungan;
- petugas pencatat.

---

## Digital Library Rules

Media yang didukung:

- PDF/e-book;
- modul;
- video;
- audio.

Aturan akses:

- metadata published dapat tampil di katalog publik;
- membaca penuh, memutar, atau mengunduh membutuhkan login;
- file utama disimpan secara private;
- gunakan signed URL atau mekanisme Storage yang aman;
- download hanya jika `is_downloadable` aktif;
- unpublished content tidak boleh diakses user biasa.

Jangan:

- menaruh service role key di Angular;
- menjadikan bucket file utama public demi kemudahan;
- memanipulasi `storage.objects` langsung untuk upload/delete normal.

---

## Frontend Responsibilities

Angular bertanggung jawab untuk:

- tampilan;
- routing;
- form;
- client-side UX validation;
- loading, empty, success, dan error state;
- menu sesuai role;
- interaksi scanner;
- pemanggilan backend API.

Angular bukan otoritas tunggal untuk:

- role;
- batas pinjaman;
- status stok;
- perhitungan denda;
- approval reservasi;
- pembayaran;
- akses file privat.

Gunakan struktur feature-first:

```text
features/<feature>/
├── pages/
├── components/
├── data-access/
├── models/
└── <feature>.routes.ts
```

Aturan frontend:

- HTTP call ditempatkan di `data-access`;
- page component jangan berisi seluruh logika bisnis;
- `core` untuk singleton, auth, guard, interceptor;
- `shared` untuk komponen generik;
- gunakan reactive forms;
- lazy-load route fitur bila masuk akal;
- hindari `any`;
- tampilkan pesan error yang dapat dipahami dalam Bahasa Indonesia;
- jangan menyembunyikan error penting hanya dalam toast generik;
- sediakan fallback input manual;
- cegah double submit;
- pertahankan keyboard navigation dan focus state;
- setelah scan sukses, kembalikan fokus ke input scan utama.

UI operasional harus cepat digunakan pada dua komputer perpustakaan. Prioritaskan tabel, search, filter, status, dan kecepatan scanner dibanding animasi.

---

## Backend Responsibilities

Express bertanggung jawab untuk:

- autentikasi;
- otorisasi role;
- validasi request;
- orchestration bisnis;
- database/RPC;
- file authorization;
- import;
- export;
- audit-worthy action;
- structured logging;
- error mapping.

Controller harus tipis.

Logika bisnis ditempatkan pada service/domain.

Akses data ditempatkan pada repository atau data-access module.

Struktur default jika belum ada konvensi:

```text
modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.routes.ts
├── <feature>.schema.ts
├── <feature>.types.ts
└── __tests__/
```

Backend harus:

- memvalidasi environment saat startup;
- memvalidasi params, query, dan body;
- menggunakan centralized error handler;
- tidak membocorkan stack trace;
- tidak menampilkan raw Supabase error ke user;
- menggunakan pagination;
- whitelist kolom sorting;
- menggunakan request ID;
- tidak mencatat token, password, atau private signed URL;
- mencegah scanner double-submit bila memungkinkan;
- memakai RPC/transaction untuk operasi circulation.

Gunakan status HTTP secara konsisten:

- `200` read/update berhasil;
- `201` create berhasil;
- `204` delete berhasil tanpa response body;
- `400` request malformed;
- `401` belum login;
- `403` tidak memiliki izin;
- `404` data tidak ditemukan;
- `409` konflik status/data;
- `422` gagal aturan bisnis;
- `500` error tidak terduga.

---

## Database Responsibilities

Supabase/PostgreSQL bertanggung jawab untuk:

- constraint;
- unique keys;
- foreign keys;
- integritas transaksi;
- row locking;
- RLS;
- audit data;
- report views;
- state transition penting.

Gunakan RPC/database functions untuk operasi multi-step:

- checkout;
- reservation-to-loan;
- return;
- extension;
- fine payment;
- copy status transition;
- individual visit jika perlu konsistensi tambahan.

Jangan menggandakan aturan utama pada banyak fungsi SQL yang saling bertentangan.

---

## Supabase Migration Rules

1. Migration yang sudah diterapkan dianggap immutable.
2. Buat migration baru untuk perubahan berikutnya.
3. Gunakan nama file bertimestamp.
4. Migration harus deterministic.
5. Tambahkan index berdasarkan query nyata.
6. Aktifkan RLS pada tabel yang diakses client/user.
7. Gunakan least-privilege policy.
8. Service role hanya ada di backend.
9. Rahasia tidak boleh masuk Git.
10. Regenerate TypeScript database types setelah schema berubah.
11. Test RLS untuk anon dan role terkait.
12. Public catalog harus mengembalikan DTO terpilih, bukan row internal mentah.

Setiap perubahan schema harus disertai:

- migration;
- update/generated types atau rencana update;
- test terkait;
- catatan backfill bila diperlukan.

---

## Import Rules

Sediakan template Excel/CSV yang kompatibel.

### Member/Student

Kolom minimum:

```text
nis
nisn
full_name
gender
class
study_group
student_card_number
library_card_number
is_active
```

### Book

Kolom minimum:

```text
inventory_code
title
category
author
publisher
publication_year
isbn
shelf
condition
replacement_cost
status
```

Import wajib:

- validasi header;
- validasi tiap baris;
- normalisasi format aman;
- deteksi duplikasi;
- mencatat nomor baris error;
- menyimpan import job;
- menampilkan jumlah berhasil/gagal;
- menyediakan error output yang jelas;
- tidak merusak data valid jika sebagian baris gagal.

Jangan membuang baris invalid secara diam-diam.

---

## Reporting Rules

Laporan yang perlu didukung:

- buku paling sering dipinjam;
- siswa paling aktif;
- keterlambatan;
- denda dan pembayaran;
- buku rusak;
- buku hilang;
- stok;
- inventaris;
- statistik kunjungan;
- transaksi;
- pendukung akreditasi.

Laporan harus dapat ditampilkan di web dan, pada modul final:

- ekspor PDF;
- ekspor Excel.

Dashboard dan laporan harus berasal dari data transaksi, bukan total manual yang dapat diedit.

---

## Security Requirements

Minimum keamanan:

- HTTPS saat deploy;
- Supabase Auth session yang aman;
- RBAC;
- RLS;
- input validation;
- validasi MIME dan extension;
- upload size limit;
- private file authorization;
- rate limiting;
- Helmet;
- CORS terbatas;
- audit log;
- secret tidak masuk source;
- tidak ada credential asli dalam contoh;
- role dan total dari frontend tidak boleh dipercaya.

Aksi yang layak diaudit:

- perubahan user/role;
- perubahan buku/eksemplar;
- import;
- checkout;
- return;
- extension;
- reservasi approve/reject;
- keputusan rusak/hilang;
- pembayaran denda;
- perubahan setting penting.

---

## Testing Expectations

Jangan menyatakan fitur selesai tanpa verifikasi.

### Database

- migration dapat diterapkan;
- constraint diuji;
- RLS diuji;
- RPC kritis diuji untuk success dan rejection.

### Backend

- request validation;
- authorization;
- business rule;
- integration test circulation;
- duplicate/double-submit protection bila relevan.

### Frontend

- form validation penting;
- auth/role guard;
- data-access;
- komponen inti;
- build berhasil.

Skenario kritis:

1. member nonaktif tidak dapat meminjam;
2. buku aktif keempat ditolak;
3. copy tidak tersedia ditolak;
4. copy yang sama tidak dapat dipinjam dua kali;
5. checkout menghasilkan due date tujuh hari;
6. perpanjangan kedua ditolak;
7. denda terlambat dihitung benar;
8. pembayaran sebagian menyisakan saldo;
9. konversi reservasi memeriksa ulang stok;
10. guest tidak dapat meminjam;
11. file unpublished/private tidak bocor;
12. user biasa tidak dapat menaikkan role.

Gunakan script yang benar-benar ada di `package.json`.

Perintah umum yang mungkin tersedia:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Jangan mengarang nama command. Periksa package scripts terlebih dahulu.

---

## Development Workflow

Untuk setiap task:

1. baca file terkait;
2. periksa `git status`;
3. pilih vertical slice terkecil yang tetap lengkap;
4. pertahankan perubahan user yang tidak terkait;
5. implementasikan kode nyata, bukan scaffolding kosong;
6. tambahkan atau update test;
7. jalankan focused verification;
8. jalankan build/typecheck yang relevan;
9. update dokumentasi bila setup atau behavior berubah;
10. rangkum hasil faktual dan risiko tersisa.

Jangan meminta konfirmasi jika permintaan sudah jelas dan keputusan aman dapat diambil secara wajar.

Jika credential atau layanan eksternal belum tersedia:

- selesaikan seluruh kode lokal yang memungkinkan;
- gunakan placeholder hanya untuk secret;
- dokumentasikan manual step;
- jangan mengklaim remote execution/deployment berhasil.

---

## Priority Order

Prioritas default:

1. foundation dan environment safety;
2. auth dan role;
3. member dan inventory;
4. checkout dan return;
5. fine dan extension;
6. reservation;
7. visit;
8. import;
9. digital collection;
10. report/export;
11. website integration;
12. deployment hardening.

Jangan menghabiskan waktu besar pada animasi ketika circulation belum selesai.

---

## Definition of Done

Fitur dianggap selesai jika:

- bekerja end-to-end untuk role tujuan;
- validasi berada pada layer yang benar;
- authorization ditegakkan server-side;
- state database konsisten;
- loading dan error state ditangani;
- test relevan lulus;
- TypeScript compile;
- aplikasi terdampak berhasil build;
- tidak ada secret tercommit;
- dokumentasi diperbarui bila perlu;
- tidak ada placeholder atau dead code yang jelas.

Untuk fitur circulation, form UI yang selesai belum cukup. Harus ada perubahan state database yang benar dan dapat diverifikasi.

---

## Git Rules

- periksa `git status` sebelum dan sesudah perubahan;
- jangan menimpa perubahan user yang tidak terkait;
- hindari formatting massal yang tidak diperlukan;
- jangan commit `.env`, credential, build output, atau dependency folder;
- jangan gunakan destructive Git command tanpa instruksi;
- jangan rewrite published history;
- gunakan migration baru untuk schema evolution;
- gunakan commit message yang deskriptif.

Contoh:

```text
feat: implement member checkout workflow
fix: prevent duplicate active loan items
docs: document deployment steps
test: cover reservation conversion
chore: configure monorepo scripts
```

---

## Prohibited Shortcuts

Jangan:

- menyimpan service role key di Angular;
- mempercayai role dari client;
- menghitung aturan kritis hanya di browser;
- membuat RLS terlalu permisif;
- menjadikan private bucket public;
- mengganti inventory code dengan generated ID;
- hard-code credential sekolah;
- menghapus histori transaksi untuk memperbaiki data;
- mengabaikan import error;
- membuat banyak abstraksi atau file kosong spekulatif;
- mengganti stack yang sudah ditetapkan;
- mengklaim test/build/deploy berhasil tanpa menjalankannya;
- mempersempit scope hanya agar implementasi lebih mudah tanpa menjelaskan keterbatasannya.

---

## Completion Report

Setelah task besar selesai, laporkan:

1. fitur yang dibuat;
2. file penting yang berubah;
3. perubahan database;
4. command yang dijalankan;
5. hasil test/build;
6. asumsi;
7. risiko atau manual step tersisa.

Laporan harus faktual. Kegagalan atau pekerjaan belum selesai harus disebutkan dengan jelas.

---

## Practical Principle

Bangun berdasarkan alur perpustakaan nyata:

- pencarian member cepat;
- scan stabil;
- ketersediaan buku jelas;
- checkout aman;
- return dan denda akurat;
- error mudah dipahami;
- transaksi dapat ditelusuri.

Implementasi terbaik bukan yang memiliki layer paling banyak. Implementasi terbaik adalah desain terkecil yang tetap maintainable, menjaga aturan bisnis, dan dapat digunakan dengan percaya diri oleh dua petugas perpustakaan.
