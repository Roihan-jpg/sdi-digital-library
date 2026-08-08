# Panduan Admin

## Akun dan role

Role yang didukung: `master_admin`, `head_librarian`, `librarian`, `member`, dan `guest`. Hanya master admin yang mengubah role dan status akun. Master admin tidak menjalankan sirkulasi atau pengelolaan koleksi. Kepala perpustakaan membaca seluruh data operasional dan laporan tanpa aksi perubahan. Pustakawan menjalankan operasional dan hanya melihat laporan harian yang diizinkan.

Bootstrap master admin pertama dilakukan sekali melalui SQL Editor administratif. Sesudah itu gunakan menu akun; jangan mengubah `profiles.role` dari frontend atau membagikan service role key.

Menu administrasi menyediakan pembuatan akun melalui undangan email atau kata sandi sementara. Kata sandi sementara wajib minimal 12 karakter dengan huruf besar, huruf kecil, angka, dan simbol; pengguna dipaksa menggantinya sebelum membuka fitur lain. Gunakan nonaktifkan akun, bukan menghapus histori pengguna.

Audit detail menyamarkan kredensial, path privat, dan identitas sensitif. Halaman status sistem hanya menampilkan konfigurasi aman. Event warning/error disimpan 30 hari dan dibersihkan oleh job maintenance.

## Data master dan import

Isi master kelas, rombel, kategori, pengarang, penerbit, rak, dan biaya penggantian sebelum import. Unduh template dari aplikasi. Baris invalid tetap tercatat bersama nomor baris; unduh CSV error, koreksi sumber, lalu import ulang.

Seed sintetis berada di `supabase/demo/seed_demo.sql`. File ini tidak dijalankan oleh `db:reset` dan dilarang dipakai production. Untuk lokal:

```powershell
Get-Content -Raw supabase/demo/seed_demo.sql | docker exec -i supabase_db_sdi-digital-library psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

## Koleksi digital

- Cover disimpan pada bucket public yang ditentukan; file utama tetap private.
- Upload/delete harus melalui backend agar MIME, signature file, ukuran, path, role, dan audit diterapkan.
- Jangan menambah policy direct-read pada `digital-library`; akses penuh menggunakan signed URL backend.
- Unpublished tidak boleh diberikan kepada user biasa. Download mengikuti `is_downloadable`.

## Laporan dan akreditasi

Identitas sekolah di laporan dikonfigurasi master admin. Angka dashboard berasal dari transaksi. Empty data tampil nol/empty state. Laporan akreditasi saat ini merupakan ringkasan pendukung generik, bukan format resmi lembaga; pemetaan dilakukan ketika template resmi tersedia.

## Operasional berkala

- Pantau health/log/error request ID setiap hari.
- Jalankan maintenance overdue/reservasi setiap 15 menit.
- Tinjau akun aktif, RLS/Storage advisor, kegagalan import, stok rusak/hilang, dan denda berkala.
- Jalankan backup database harian serta backup Storage terpisah; uji restore.
- Terapkan migration melalui dry-run dan staging. Migration yang sudah remote tidak diedit.

## Uji terima disposable

1. Reset database lokal, jalankan seed demo manual, lalu siapkan lima akun Auth dengan role dan link member yang sesuai.
2. Isi seluruh `SMOKE_*` environment variable yang didokumentasikan di `docs/go-live-checklist.md`.
3. Jalankan `npm run smoke:uat` hanya dengan `SMOKE_TARGET=local` atau `staging`. Script menolak target lain dan membuat data berawalan `SMOKE-`.
