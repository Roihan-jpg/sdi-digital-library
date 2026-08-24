# Panduan Pengguna

## Pengunjung

Katalog fisik dan metadata koleksi digital published dapat dibuka tanpa login. Gunakan pencarian, kategori, jenis media, terbaru, atau populer. Login diperlukan untuk membaca file penuh, memutar media, atau mengunduh.

## Member

1. Login menggunakan akun dengan role `member`; sistem menyediakan data anggota sementara secara otomatis saat akun dibuat atau role-nya diubah menjadi member.
2. Buka **Portal member** untuk melihat pinjaman, jatuh tempo, reservasi, dan denda.
3. Reservasi hanya tersedia untuk member aktif. Guest tidak dapat meminjam atau membuat reservasi.
4. Pada koleksi digital, tombol download hanya tampil jika koleksi published dan `is_downloadable` aktif. Tautan akses bersifat sementara; muat ulang halaman bila kedaluwarsa.

## Petugas: transaksi cepat

### Peminjaman

1. Buka **Sirkulasi > Peminjaman**. Fokus awal berada di scan member.
2. Scan kartu, lalu scan maksimal tiga kode inventaris. Payload barcode/QR harus sama dengan `inventory_code`.
3. Periksa nama, status, pinjaman aktif, dan daftar buku. Tekan **Konfirmasi peminjaman** sekali.
4. Jika jaringan gagal, input tidak dihapus. Baca pesan error dan tekan konfirmasi kembali; server memakai idempotency key yang sama untuk mencegah transaksi ganda.
5. Cetak bukti bila perlu, lalu pilih **Transaksi berikutnya** untuk kembali ke scan member.

### Pengembalian

Scan `inventory_code`, pilih kondisi baik/rusak/hilang, isi catatan, lalu proses. Hari terlambat dan denda dihitung server/database. Jangan mengubah nominal dari browser.

### Kunjungan

Kunjungan individual wajib scan kartu member. Jika scanner sulit membaca, ketik isi kartu yang sama. Kunjungan rombongan memakai kelas, rombel, guru pendamping, dan jumlah siswa.

### Pemulihan error

- Tombol dinonaktifkan selama request berjalan untuk mencegah double submit.
- Setelah scan sukses/gagal, fokus kembali ke input scanner terkait.
- Jika muncul referensi request ID, catat ID dan waktu kejadian untuk admin.
- Untuk error koneksi, periksa internet/LAN lalu coba lagi tanpa mengubah data input.
- Jangan mengulang pembayaran bila bukti sudah muncul; cek daftar tagihan lebih dulu.
