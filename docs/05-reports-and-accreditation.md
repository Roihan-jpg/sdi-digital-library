# Dashboard, Laporan, dan Pendukung Akreditasi

## Sumber data

Dashboard dan laporan hanya membaca tabel transaksi, view agregat, serta `library_settings`. Tidak ada KPI yang dapat diubah manual.

View server-side yang digunakan:

- `v_dashboard_kpis` untuk KPI operasional;
- `v_daily_loans` untuk tren peminjaman;
- `v_daily_visits` untuk tren kunjungan;
- `v_overdue_loans`, `v_inventory_summary`, dan view laporan awal lainnya;
- `v_digital_activity_daily` untuk agregasi view, play, dan download.

View laporan tidak diberikan kepada `anon` atau `authenticated`. Backend mengaksesnya menggunakan service role setelah middleware memverifikasi role aplikasi.

## Hak akses

- `master_admin`: membaca dashboard/laporan, export, dan mengubah identitas sekolah untuk header export;
- `head_librarian`: membaca dashboard/laporan dan export;
- `librarian`: membaca dashboard/laporan dan export operasional;
- `member` dan `guest`: tidak dapat mengakses endpoint laporan.

Petugas dan kepala perpustakaan tidak menerima payload konfigurasi master admin. Identitas sekolah dimasukkan backend langsung ke file export.

## Export

PDF dan Excel dibuat di memori backend lalu dikirim sebagai attachment. Pendekatan ini dipilih karena ukuran laporan sekolah relatif kecil dan tidak meninggalkan file sementara di bucket `exports`.

File memuat:

- identitas sekolah;
- judul laporan;
- periode dan waktu cetak;
- filter aktif;
- tabel data;
- ringkasan;
- nomor halaman PDF atau footer halaman Excel.

Identitas sekolah dapat diatur master admin melalui halaman laporan. Logo disimpan sebagai path Storage untuk integrasi visual berikutnya; export tahap ini memakai identitas teks agar tetap stabil bila logo belum tersedia.

## Asumsi laporan akreditasi

Format instrumen akreditasi resmi belum diberikan. Laporan `accreditation` karena itu merupakan ringkasan pendukung generik yang mencakup koleksi aktif, anggota aktif, transaksi peminjaman, kunjungan, koleksi digital, pembayaran denda, serta kondisi rusak/hilang.

Setiap indikator menyertakan sumber tabel agar dapat dipetakan ke butir instrumen resmi tanpa mengubah histori transaksi. Setelah format resmi diterima, lakukan pemetaan nama indikator dan struktur dokumen melalui migration/API baru tanpa mengganti data sumber.

## Endpoint

```text
GET   /api/reports/dashboard
GET   /api/reports/:kind
GET   /api/reports/:kind/export?format=pdf|xlsx
GET   /api/reports/settings/school
PATCH /api/reports/settings/school
```

Filter umum: `from`, `to`, `classId`, `studyGroupId`, `categoryId`, `status`, dan `search`. Filter hanya diterapkan pada laporan yang memiliki dimensi terkait.
