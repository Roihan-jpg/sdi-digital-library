# Checklist Go-Live dan Uji Terima

## Sebelum deployment

- [ ] Domain, DNS, HTTPS, Site URL, dan redirect URL Supabase benar.
- [ ] Secret hanya ada di secret manager/`backend/.env` permission `0600`.
- [ ] Frontend bundle tidak mengandung service role, database URL, password, atau JWT secret.
- [ ] Signup publik, SMTP, MFA admin, SSL enforcement, network restriction, PITR/backup disesuaikan risiko.
- [ ] `npx supabase db push --dry-run` hanya menampilkan migration yang disetujui.
- [ ] Security Advisor dan Performance Advisor ditinjau.
- [ ] `npm run db:reset`, `npm run db:test`, lint, typecheck, test, dan build lulus.
- [ ] Backup database dan Storage pertama berhasil serta checksum tersimpan off-site.

## Uji terima fungsional

- [ ] Login `master_admin`, `head_librarian`, `librarian`, `member`, dan `guest`; menu/403 sesuai role.
- [ ] Import member valid dan invalid menghasilkan ringkasan serta CSV error.
- [ ] Tambah judul/eksemplar; barcode dan QR persis sama dengan `inventory_code`.
- [ ] Scan kunjungan individual dan catat rombongan.
- [ ] Pinjam tiga buku berhasil; buku keempat ditolak.
- [ ] Retry checkout dengan request sama tidak membuat loan kedua.
- [ ] Copy sama tidak dapat di-checkout oleh dua request bersamaan.
- [ ] Member membuat reservasi; petugas approve/reject/convert; stok diperiksa ulang.
- [ ] Return tepat waktu tidak menghasilkan denda terlambat.
- [ ] Return terlambat menghasilkan Rp2.000/hari/item sesuai aturan aktif.
- [ ] Return rusak/hilang membuat status dan biaya penggantian benar.
- [ ] Pembayaran partial menyisakan saldo; pembayaran akhir menjadi paid.
- [ ] Anon hanya melihat metadata published; file penuh meminta login.
- [ ] Guest/member dapat view/play; download hanya jika diizinkan.
- [ ] Unpublished dan path private tidak bocor lewat API/RLS/Storage.
- [ ] Kepala perpustakaan dapat export PDF/XLSX tetapi tidak mengubah setting admin.
- [ ] PDF/XLSX memuat identitas sekolah, judul, periode, waktu, filter, tabel/ringkasan.

## UX dua komputer

- [ ] Keyboard Tab/Enter dapat menjalankan alur tanpa mouse.
- [ ] Fokus kembali ke scanner setelah sukses dan error.
- [ ] Double click/scan saat loading tidak menggandakan transaksi.
- [ ] Putus jaringan menampilkan pesan yang dapat ditindaklanjuti dan input tetap ada.
- [ ] Request ID tampil untuk error backend dan dapat dicari di log.
- [ ] Printer label dan bukti diuji pada perangkat sebenarnya.

## Environment smoke UAT

Isi `SMOKE_API_URL`, `SMOKE_SUPABASE_URL`, `SMOKE_SUPABASE_ANON_KEY`, `SMOKE_TARGET`, `SMOKE_CONFIRM=CREATE_DISPOSABLE_TEST_DATA`, serta email/password untuk prefix `SMOKE_MASTER_ADMIN`, `SMOKE_HEAD_LIBRARIAN`, `SMOKE_LIBRARIAN`, `SMOKE_MEMBER`, dan `SMOKE_GUEST`. Akun member harus tertaut ke record member. Untuk skenario penuh isi juga `SMOKE_OVERDUE_INVENTORY_CODE` dan `SMOKE_DIGITAL_SLUG` dari fixture staging.

## Sesudah deployment

- [ ] `/api/health` dipantau dari luar server.
- [ ] PM2 startup persistence dan auto-restart diuji.
- [ ] Nginx access/error log dan aplikasi terotasi.
- [ ] Cron maintenance dan backup menghasilkan exit code 0.
- [ ] Restore rehearsal dijadwalkan dan pemilik insiden ditentukan.
- [ ] Commit/tag rilis dan migration version dicatat untuk rollback forward.
