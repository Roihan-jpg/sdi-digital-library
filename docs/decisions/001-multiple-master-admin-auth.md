# ADR-001: Izinkan beberapa master admin melalui Supabase Auth

## Status

Accepted

## Date

2026-08-18

## Context

Versi awal sistem membatasi Supabase Auth hanya untuk satu identitas `master_admin`. Pembatasan ini membuat serah-terima, pemulihan akses, dan pembagian tanggung jawab administratif bergantung pada satu akun. Role lain tetap menggunakan akun lokal dan tidak boleh memakai Supabase Auth.

## Decision

Supabase Auth tetap dicadangkan untuk role `master_admin`, tetapi jumlah identitasnya tidak dibatasi satu. Trigger `public.handle_new_auth_user()` membuat profile `master_admin` aktif untuk setiap user Auth baru. Kolom `profiles.auth_user_id` yang unik tetap memastikan satu profile hanya terhubung ke satu identitas Auth.

Aturan perlindungan yang sudah ada tetap berlaku: sistem tidak boleh menonaktifkan atau mengubah role master admin terakhir yang aktif. Service role hanya digunakan oleh backend/Admin API dan tidak boleh dikirim ke Angular.

## Alternatives Considered

### Tetap satu akun Auth

Ditolak karena menciptakan single point of failure dan menyulitkan rotasi akses.

### Menggunakan `user_metadata` sebagai role admin

Ditolak karena metadata user dapat diubah user dan tidak aman untuk otorisasi. Role aplikasi tetap dibaca dari `public.profiles`.

### Memindahkan semua role ke Supabase Auth

Ditolak karena akun lokal untuk role non-admin sudah menjadi bagian dari desain dan migration saat ini.

## Consequences

- Lebih dari satu admin dapat login dan mengelola konfigurasi serta akun.
- Setiap user Auth baru harus diperlakukan sebagai `master_admin`; role lain dibuat sebagai akun lokal.
- Pembuatan user Auth wajib dilakukan melalui Dashboard atau Admin API dengan service role di server/lingkungan administratif.
- Penghapusan atau penonaktifan admin tetap harus menyisakan minimal satu master admin aktif.
