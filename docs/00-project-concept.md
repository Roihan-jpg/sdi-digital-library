# Konsep Proyek SDI Digital Library

## 1. Identitas Proyek

**Nama Proyek:** SDI Digital Library  
**Jenis Sistem:** Website perpustakaan sekolah dan digital library  
**Target Pengguna:** Sekolah Dasar  
**Status Proyek:** Prototype magang yang dikembangkan sampai siap digunakan dan siap deploy  
**Stack Teknologi:**

- Frontend: Angular
- Backend: Express.js
- Bahasa Backend: TypeScript
- Database, Authentication, dan Storage: Supabase
- Deployment: Hosting/VPS dan akses jaringan sekolah maupun internet publik

---

## 2. Latar Belakang

Perpustakaan sekolah saat ini sudah memiliki sistem, tetapi teknologi yang digunakan sudah usang. Database lama juga telah menumpuk, tidak terkelola, dan tidak memungkinkan untuk langsung digunakan kembali sebagai fondasi sistem baru.

Sekolah memiliki:

- 592 siswa;
- 41 guru;
- 2 petugas perpustakaan;
- koleksi buku fisik dalam jumlah besar;
- koleksi e-book/PDF;
- modul pembelajaran;
- video dan audio pembelajaran;
- kartu pelajar;
- kartu anggota perpustakaan;
- data siswa berbasis NIS dan NISN;
- domain dan hosting/VPS aktif;
- koneksi internet sekolah yang stabil;
- 2 komputer operasional di perpustakaan.

Sistem baru dibutuhkan untuk menggantikan sistem lama, memperbaiki pengelolaan data, mempercepat layanan peminjaman, mendukung kunjungan berbasis kartu anggota, serta menyediakan layanan digital library yang dapat diintegrasikan dengan website sekolah.

---

## 3. Tujuan Proyek

1. Mengganti sistem perpustakaan lama dengan sistem modern berbasis web.
2. Memusatkan pengelolaan buku fisik dan koleksi digital.
3. Mempercepat proses peminjaman, pengembalian, perpanjangan, dan reservasi.
4. Mengelola barcode atau QR Code setiap eksemplar buku.
5. Mencatat kunjungan siswa menggunakan kartu anggota perpustakaan.
6. Menyediakan katalog publik yang dapat diintegrasikan dengan website sekolah.
7. Menyediakan laporan operasional dan laporan pendukung akreditasi.
8. Menyiapkan sistem yang dapat digunakan pada jaringan sekolah dan internet publik.
9. Menghasilkan aplikasi yang siap deploy dalam waktu pengembangan maksimal satu minggu.

---

## 4. Ruang Lingkup Sistem

### 4.1 Koleksi Fisik

Sistem mengelola:

- data judul buku;
- kategori buku;
- pengarang;
- penerbit;
- tahun terbit;
- ISBN;
- lokasi rak;
- kondisi buku;
- jumlah eksemplar;
- kode inventaris setiap eksemplar;
- barcode atau QR Code;
- status ketersediaan;
- status hilang atau rusak.

Satu judul buku dapat memiliki beberapa eksemplar. Setiap eksemplar memiliki kode inventaris unik yang dimasukkan oleh petugas. Barcode atau QR Code hanya merepresentasikan kode inventaris tersebut dan tidak menghasilkan kode baru secara otomatis.

### 4.2 Koleksi Digital

Sistem mengelola:

- e-book/PDF;
- modul pembelajaran;
- video pembelajaran;
- audio pembelajaran.

Koleksi digital:

- dapat dibaca atau diputar langsung melalui website;
- dapat diunduh;
- hanya dapat diakses penuh oleh pengguna yang sudah login;
- dikelompokkan berdasarkan kategori;
- tidak dibatasi berdasarkan kelas atau mata pelajaran.

### 4.3 Keanggotaan

Sistem mengelola:

- siswa;
- anggota non-siswa;
- guest;
- status keanggotaan;
- nomor kartu anggota;
- NIS;
- NISN;
- kelas;
- rombongan belajar;
- status aktif atau tidak aktif.

Pada form member terdapat field konfirmasi:

**Apakah member merupakan siswa?**

Jika jawabannya **ya**, sistem menampilkan field:

- NIS;
- NISN;
- kelas;
- rombongan belajar;
- nomor kartu pelajar;
- nomor kartu anggota perpustakaan.

### 4.4 Kunjungan Perpustakaan

Kunjungan dicatat melalui scan kartu anggota.

Aturan:

- siswa wajib membawa kartu anggota;
- siswa tanpa kartu tidak diperbolehkan masuk;
- pengecualian berlaku untuk rombongan belajar yang didampingi guru;
- kunjungan rombongan dapat dicatat oleh petugas sebagai kunjungan kelompok;
- sistem mencatat waktu masuk, identitas member, metode kunjungan, dan petugas pencatat.

### 4.5 Peminjaman

Peminjaman dilakukan oleh petugas perpustakaan.

Aturan utama:

- maksimal 3 buku aktif per siswa;
- lama peminjaman 7 hari;
- perpanjangan maksimal 1 kali;
- tambahan waktu perpanjangan 1 hari;
- denda keterlambatan Rp2.000 per hari per buku;
- buku hilang atau rusak dikenakan biaya sesuai kategori buku;
- peminjaman ditolak jika member tidak aktif;
- peminjaman ditolak jika jumlah buku aktif sudah mencapai batas;
- peminjaman ditolak jika eksemplar tidak tersedia.

### 4.6 Reservasi Buku

Siswa dapat memesan buku melalui website.

Alur reservasi:

1. Siswa login.
2. Siswa membuka katalog.
3. Siswa memilih buku yang tersedia.
4. Siswa mengirim reservasi.
5. Status reservasi menjadi `pending`.
6. Siswa datang ke perpustakaan.
7. Petugas memverifikasi kartu anggota.
8. Petugas menyetujui reservasi.
9. Reservasi dikonversi menjadi transaksi peminjaman.
10. Status reservasi menjadi `approved` atau `completed`.

Petugas dapat menolak reservasi jika:

- buku sudah tidak tersedia;
- member tidak aktif;
- member memiliki tunggakan;
- batas peminjaman telah tercapai;
- reservasi melewati batas waktu pengambilan.

### 4.7 Pengembalian

Pada proses pengembalian, sistem:

- membaca barcode atau QR Code buku;
- menemukan transaksi aktif;
- menghitung keterlambatan;
- menghitung denda otomatis;
- mencatat kondisi buku;
- mengubah status buku menjadi tersedia, rusak, atau hilang;
- menyimpan petugas yang memproses transaksi.

### 4.8 Perpanjangan

Perpanjangan hanya dapat dilakukan jika:

- transaksi masih aktif;
- buku belum pernah diperpanjang;
- buku tidak sedang dipesan member lain;
- member tidak memiliki pelanggaran aktif.

Tambahan masa peminjaman adalah 1 hari.

---

## 5. Role dan Hak Akses

### 5.1 Master Admin

Hak akses penuh terhadap seluruh sistem:

- konfigurasi sistem;
- manajemen akun;
- manajemen role;
- manajemen petugas;
- manajemen kepala perpustakaan;
- manajemen member;
- pengaturan aturan peminjaman;
- pengaturan denda;
- pengaturan kategori biaya kehilangan atau kerusakan;
- pengaturan integrasi website sekolah;
- backup dan monitoring;
- melihat seluruh laporan;
- mengelola audit log.

### 5.2 Kepala Perpustakaan

Hak akses:

- melihat dashboard;
- memantau transaksi;
- memantau keterlambatan;
- memantau kehilangan dan kerusakan;
- melihat statistik kunjungan;
- melihat laporan inventaris;
- melihat laporan akreditasi;
- ekspor laporan PDF dan Excel;
- melakukan validasi tertentu jika dibutuhkan.

Tidak memiliki akses penuh terhadap konfigurasi teknis sistem.

### 5.3 Petugas Perpustakaan

Hak akses operasional:

- CRUD buku;
- CRUD eksemplar;
- input kode inventaris;
- generate dan cetak barcode atau QR Code;
- CRUD member;
- impor data siswa dari Excel;
- scan kartu anggota;
- mencatat kunjungan;
- memproses peminjaman;
- memproses pengembalian;
- memproses perpanjangan;
- menyetujui atau menolak reservasi;
- mencatat buku rusak atau hilang;
- mencatat pembayaran denda;
- mengelola koleksi digital;
- mencetak bukti transaksi.

### 5.4 Member

Member dapat berupa siswa atau anggota non-siswa.

Hak akses:

- login;
- melihat katalog;
- melihat detail koleksi;
- melakukan pencarian;
- membuat reservasi;
- melihat status reservasi;
- melihat riwayat peminjaman;
- melihat tanggal jatuh tempo;
- melihat denda;
- membaca atau mengunduh koleksi digital;
- melihat status keanggotaan.

### 5.5 Guest

Guest adalah pengguna dari luar lingkup sekolah atau pengunjung website sekolah.

Hak akses:

- melihat halaman publik;
- melihat katalog;
- melihat detail buku;
- melihat informasi ketersediaan secara umum;
- melihat koleksi digital yang ditampilkan secara publik;
- diarahkan untuk login jika ingin membaca penuh atau mengunduh file.

Guest tidak dapat:

- melakukan peminjaman;
- melakukan reservasi;
- melihat riwayat transaksi;
- mengakses file digital penuh tanpa login.

---

## 6. Modul Utama Sistem

### 6.1 Modul Autentikasi

- login;
- logout;
- lupa password;
- reset password;
- aktivasi akun;
- kontrol akses berbasis role;
- pencatatan aktivitas login.

### 6.2 Modul Dashboard

Dashboard menampilkan:

- jumlah judul buku;
- jumlah eksemplar;
- jumlah buku tersedia;
- jumlah buku dipinjam;
- jumlah reservasi pending;
- jumlah keterlambatan;
- jumlah buku rusak;
- jumlah buku hilang;
- jumlah kunjungan hari ini;
- grafik peminjaman;
- grafik kunjungan;
- buku paling sering dipinjam;
- siswa paling aktif.

### 6.3 Modul Master Data

Master data meliputi:

- kategori koleksi;
- pengarang;
- penerbit;
- lokasi rak;
- kelas;
- rombongan belajar;
- tahun ajaran;
- jenis member;
- status koleksi;
- kategori kerusakan;
- kategori biaya penggantian;
- aturan peminjaman;
- pengaturan denda.

### 6.4 Modul Buku dan Eksemplar

- CRUD judul buku;
- CRUD eksemplar;
- pencarian dan filter;
- input kode inventaris;
- generate barcode;
- generate QR Code;
- cetak label;
- stok tersedia;
- stok dipinjam;
- stok rusak;
- stok hilang;
- histori perubahan data.

### 6.5 Modul Member

- CRUD member;
- konfirmasi siswa atau non-siswa;
- data kelas;
- data rombongan belajar;
- NIS;
- NISN;
- nomor kartu;
- status aktif;
- impor Excel;
- template Excel;
- validasi duplikasi;
- hasil impor berhasil atau gagal.

### 6.6 Modul Kunjungan

- scan kartu;
- input manual jika kartu gagal dibaca;
- kunjungan individu;
- kunjungan rombongan;
- riwayat kunjungan;
- statistik harian, mingguan, dan bulanan.

### 6.7 Modul Peminjaman

- scan kartu member;
- scan buku;
- validasi batas pinjaman;
- validasi status member;
- validasi ketersediaan;
- hitung jatuh tempo;
- cetak bukti peminjaman;
- riwayat transaksi.

### 6.8 Modul Pengembalian

- scan buku;
- hitung keterlambatan;
- hitung denda;
- catat kondisi;
- catat pembayaran;
- cetak bukti pengembalian.

### 6.9 Modul Reservasi

- reservasi oleh member;
- daftar reservasi pending;
- approval petugas;
- penolakan;
- pembatalan;
- konversi reservasi menjadi peminjaman;
- masa berlaku reservasi.

### 6.10 Modul Koleksi Digital

- upload file;
- upload thumbnail;
- kategori;
- metadata;
- viewer PDF;
- pemutar video;
- pemutar audio;
- kontrol akses login;
- pencatatan jumlah baca;
- pencatatan jumlah unduh.

### 6.11 Modul Laporan

Laporan utama:

- buku paling sering dipinjam;
- siswa paling aktif;
- daftar keterlambatan;
- daftar denda;
- buku rusak;
- buku hilang;
- stok buku;
- inventaris;
- statistik kunjungan;
- laporan transaksi;
- laporan koleksi digital;
- laporan pendukung akreditasi perpustakaan.

Format keluaran:

- tampilan web;
- PDF;
- Excel.

### 6.12 Modul Integrasi Website Sekolah

Integrasi dilakukan melalui:

- halaman katalog publik;
- widget koleksi terbaru;
- widget buku populer;
- tautan menuju digital library;
- API publik terbatas;
- opsi embed katalog pada website sekolah.

---

## 7. Alur Utama Sistem

### 7.1 Alur Peminjaman Langsung

1. Petugas login.
2. Petugas membuka modul peminjaman.
3. Kartu member dipindai.
4. Sistem memvalidasi status member.
5. Buku dipindai satu per satu.
6. Sistem memvalidasi maksimal 3 buku.
7. Sistem menetapkan tanggal jatuh tempo 7 hari.
8. Petugas mengonfirmasi transaksi.
9. Status eksemplar berubah menjadi dipinjam.
10. Bukti transaksi dapat dicetak.

### 7.2 Alur Reservasi Online

1. Member login.
2. Member mencari buku.
3. Member membuat reservasi.
4. Status reservasi `pending`.
5. Member datang ke perpustakaan.
6. Petugas scan kartu member.
7. Petugas membuka reservasi.
8. Petugas meng-approve.
9. Sistem membuat transaksi peminjaman.
10. Status buku berubah menjadi dipinjam.

### 7.3 Alur Pengembalian

1. Petugas scan buku.
2. Sistem menemukan transaksi.
3. Sistem menghitung keterlambatan.
4. Sistem menghitung denda.
5. Petugas mencatat kondisi buku.
6. Petugas mencatat pembayaran jika ada.
7. Sistem menyelesaikan transaksi.
8. Status buku diperbarui.

### 7.4 Alur Kunjungan

1. Siswa datang membawa kartu anggota.
2. Kartu dipindai.
3. Sistem memvalidasi keanggotaan.
4. Sistem mencatat waktu kunjungan.
5. Jika kartu tidak valid, petugas menerima peringatan.
6. Untuk rombongan belajar, petugas memilih mode kunjungan kelompok.

---

## 8. Konsep Data

Entitas utama yang diperlukan:

- users;
- roles;
- user_roles;
- members;
- students;
- classes;
- study_groups;
- membership_cards;
- visits;
- group_visits;
- book_titles;
- book_copies;
- categories;
- authors;
- publishers;
- shelves;
- loans;
- loan_items;
- loan_extensions;
- reservations;
- fines;
- fine_payments;
- damage_categories;
- replacement_cost_categories;
- digital_collections;
- digital_access_logs;
- import_jobs;
- import_errors;
- system_settings;
- audit_logs.

Prinsip data:

- satu judul memiliki banyak eksemplar;
- satu member dapat memiliki banyak transaksi;
- satu transaksi dapat memiliki maksimal tiga item aktif;
- satu eksemplar hanya boleh berada pada satu transaksi aktif;
- kode inventaris wajib unik;
- NIS, NISN, dan nomor kartu harus divalidasi terhadap duplikasi;
- setiap perubahan transaksi penting dicatat pada audit log.

---

## 9. Strategi Migrasi Data Lama

Karena database lama tidak terkelola, migrasi tidak dilakukan dengan menyalin seluruh database secara langsung.

Strategi yang digunakan:

1. Identifikasi data yang masih layak dipakai.
2. Ekspor data lama ke Excel atau CSV.
3. Bersihkan data duplikat.
4. Normalisasi format kolom.
5. Pisahkan data judul buku dan eksemplar.
6. Validasi kode inventaris.
7. Validasi data siswa.
8. Impor menggunakan template resmi sistem baru.
9. Simpan log hasil impor.
10. Perbaiki data gagal secara bertahap.

Data historis yang tidak dapat dipercaya dapat disimpan sebagai arsip terpisah dan tidak dimasukkan ke transaksi aktif.

---

## 10. Template Import Excel

Sistem menyediakan template Excel yang kompatibel dengan fitur impor.

### 10.1 Template Siswa

Kolom minimal:

- nis;
- nisn;
- nama_lengkap;
- jenis_kelamin;
- kelas;
- rombongan_belajar;
- nomor_kartu_pelajar;
- nomor_kartu_perpustakaan;
- status_aktif.

### 10.2 Template Buku

Kolom minimal:

- kode_inventaris;
- judul;
- kategori;
- pengarang;
- penerbit;
- tahun_terbit;
- isbn;
- lokasi_rak;
- kondisi;
- harga_penggantian;
- status.

### 10.3 Validasi Import

Sistem harus memeriksa:

- kolom wajib;
- format data;
- data duplikat;
- kode inventaris;
- NIS;
- NISN;
- nomor kartu;
- referensi kelas;
- referensi kategori;
- hasil baris berhasil;
- hasil baris gagal;
- pesan kesalahan per baris.

---

## 11. Arsitektur Sistem

### 11.1 Frontend

Angular digunakan untuk:

- dashboard;
- panel admin;
- panel petugas;
- portal member;
- katalog publik;
- digital reader;
- halaman laporan;
- halaman scan kartu dan buku.

Frontend berkomunikasi dengan backend melalui REST API.

### 11.2 Backend

Express.js dengan TypeScript digunakan untuk:

- autentikasi;
- otorisasi;
- logika bisnis;
- transaksi peminjaman;
- transaksi pengembalian;
- reservasi;
- perhitungan denda;
- impor Excel;
- ekspor laporan;
- akses storage;
- integrasi website sekolah.

### 11.3 Supabase

Supabase digunakan untuk:

- PostgreSQL database;
- authentication;
- file storage;
- Row Level Security;
- backup;
- audit berbasis database;
- penyimpanan e-book, thumbnail, video, dan audio.

### 11.4 Deployment

Komponen deployment:

- Angular production build;
- Express API pada VPS;
- Supabase sebagai layanan database dan storage;
- reverse proxy menggunakan Nginx;
- HTTPS;
- domain atau subdomain khusus digital library;
- integrasi tautan dengan website sekolah.

---

## 12. Keamanan Sistem

Keamanan minimum:

- HTTPS;
- password terenkripsi;
- JWT atau Supabase session;
- role-based access control;
- Row Level Security;
- validasi input;
- proteksi upload file;
- pembatasan jenis dan ukuran file;
- audit log;
- rate limiting;
- proteksi brute force;
- sanitasi filename;
- pemisahan file publik dan privat;
- backup database;
- log aktivitas petugas;
- session timeout;
- validasi transaksi pada backend.

Aksi penting yang harus dicatat:

- login;
- tambah atau ubah buku;
- hapus data;
- impor Excel;
- peminjaman;
- pengembalian;
- pembayaran denda;
- approval reservasi;
- perubahan role;
- perubahan aturan sistem.

---

## 13. Prioritas MVP

Fokus MVP adalah proses peminjaman.

Fitur wajib MVP:

1. Login dan role.
2. Data member.
3. Import siswa dari Excel.
4. Data judul buku.
5. Data eksemplar.
6. Kode inventaris.
7. Generate barcode atau QR Code.
8. Scan kartu member.
9. Scan buku.
10. Peminjaman.
11. Pengembalian.
12. Perhitungan jatuh tempo.
13. Perhitungan denda.
14. Dashboard sederhana.
15. Riwayat transaksi.

Fitur yang dapat ditunda setelah MVP:

- katalog publik lengkap;
- koleksi digital;
- video dan audio;
- reservasi online;
- laporan akreditasi;
- integrasi website sekolah;
- statistik lanjutan;
- ekspor lengkap;
- migrasi data historis.

---

## 14. Rencana Pengerjaan

### 14.1 Target Semalam: MVP Operasional

Target realistis untuk satu malam dengan bantuan AI:

- inisialisasi Angular;
- inisialisasi Express TypeScript;
- konfigurasi Supabase;
- autentikasi dasar;
- role dasar;
- tabel member;
- tabel buku;
- tabel eksemplar;
- tabel peminjaman;
- CRUD member;
- CRUD buku;
- transaksi peminjaman;
- transaksi pengembalian sederhana;
- validasi maksimal 3 buku;
- jatuh tempo 7 hari;
- denda Rp2.000 per hari;
- dashboard minimum.

Target semalam harus difokuskan pada alur operasional dan tidak mencakup penyempurnaan UI, migrasi besar, laporan lengkap, serta digital library penuh.

### 14.2 Target Satu Minggu: Siap Deploy

#### Hari 1

- setup proyek;
- database;
- autentikasi;
- role;
- master data;
- CRUD member;
- CRUD buku.

#### Hari 2

- eksemplar buku;
- kode inventaris;
- barcode atau QR Code;
- scan kartu;
- scan buku.

#### Hari 3

- peminjaman;
- pengembalian;
- perpanjangan;
- denda;
- buku rusak dan hilang.

#### Hari 4

- reservasi online;
- approval petugas;
- kunjungan individu;
- kunjungan rombongan.

#### Hari 5

- e-book;
- PDF viewer;
- video;
- audio;
- kategori koleksi digital.

#### Hari 6

- laporan;
- ekspor PDF;
- ekspor Excel;
- dashboard statistik;
- laporan akreditasi.

#### Hari 7

- testing;
- perbaikan bug;
- optimasi;
- konfigurasi deployment;
- dokumentasi;
- training singkat petugas;
- go-live.

---

## 15. Kriteria Keberhasilan

Sistem dinyatakan berhasil jika:

- petugas dapat login;
- siswa dapat diimpor dari Excel;
- buku dan eksemplar dapat dikelola;
- barcode atau QR Code dapat dibuat;
- kartu member dapat dipindai;
- buku dapat dipinjam;
- batas maksimal 3 buku berjalan;
- jatuh tempo 7 hari berjalan;
- perpanjangan 1 hari berjalan;
- denda Rp2.000 per hari dihitung otomatis;
- reservasi dapat dibuat dan di-approve;
- kunjungan dapat dicatat;
- koleksi digital dapat diakses;
- laporan dapat dilihat;
- laporan dapat diekspor;
- aplikasi dapat diakses dari jaringan sekolah dan internet;
- data penting memiliki audit log;
- sistem dapat dideploy pada domain sekolah.

---

## 16. Risiko dan Mitigasi

### 16.1 Data Lama Tidak Terstruktur

**Risiko:** data tidak dapat langsung dimigrasikan.

**Mitigasi:** gunakan template Excel, validasi bertahap, dan migrasi hanya data yang layak.

### 16.2 Waktu Pengerjaan Sangat Singkat

**Risiko:** fitur terlalu banyak untuk satu minggu.

**Mitigasi:** prioritaskan peminjaman sebagai MVP, gunakan modul bertahap, dan hindari perubahan scope selama pengerjaan.

### 16.3 Kesalahan Scan

**Risiko:** barcode atau kartu gagal terbaca.

**Mitigasi:** sediakan input manual berdasarkan kode inventaris atau nomor kartu.

### 16.4 Data Ganda

**Risiko:** NIS, NISN, nomor kartu, atau kode inventaris duplikat.

**Mitigasi:** gunakan unique constraint dan validasi impor.

### 16.5 Transaksi Ganda

**Risiko:** satu buku dipinjam oleh lebih dari satu member.

**Mitigasi:** gunakan transaksi database dan validasi status eksemplar pada backend.

### 16.6 Penyimpanan File Digital

**Risiko:** ukuran file besar dan biaya storage meningkat.

**Mitigasi:** tetapkan batas ukuran file, kompres media, dan monitoring penggunaan storage.

---

## 17. Batasan Versi Awal

Versi awal tidak mencakup:

- aplikasi mobile native;
- integrasi pembayaran online;
- integrasi WhatsApp otomatis;
- integrasi langsung dengan database lama;
- sinkronisasi real-time dengan sistem akademik;
- rekomendasi buku berbasis AI;
- DRM atau watermark dokumen;
- peminjaman mandiri oleh siswa;
- akses wali murid;
- integrasi Google Workspace atau Microsoft 365.

---

## 18. Kesimpulan

SDI Digital Library dirancang sebagai sistem perpustakaan sekolah yang modern, terpusat, dan siap menggantikan sistem lama. Fokus utama tahap awal adalah memastikan proses peminjaman, pengembalian, pengelolaan buku, pengelolaan member, dan scan kartu berjalan stabil.

Arsitektur Angular, Express TypeScript, dan Supabase sesuai untuk kebutuhan prototype yang harus cepat dikembangkan tetapi tetap dapat berevolusi menjadi sistem produksi. Pengerjaan satu malam dapat menghasilkan MVP operasional, sedangkan target satu minggu digunakan untuk melengkapi sistem sampai siap deploy dan digunakan oleh perpustakaan sekolah.
