# Checklist Uji Input Manual

Panduan singkat untuk menguji pengisian data SDI Digital Library. Jalankan di database lokal atau staging dan gunakan awalan data `UJI-` agar mudah dicari.

## Cara uji paling sederhana

Untuk setiap poin: buka menu terkait, isi data, klik **Simpan/Proses**, lalu cek data pada daftar/detail yang terkait. Ulangi sekali dengan input salah untuk memastikan sistem menolak tanpa menyimpan data setengah jadi.

## Relasi penting

| Data yang diisi | Harus sudah ada / dampaknya |
|---|---|
| Tahun ajaran → kelas → rombel | Kelas dapat memakai tahun ajaran; rombel harus memilih kelas. |
| Member | Siswa memilih kelas dan rombel; satu member dapat dihubungkan ke satu akun profile. |
| Judul buku | Dapat memakai kategori, pengarang, penerbit, rak default, dan kategori biaya penggantian. |
| Eksemplar buku | Wajib memilih judul buku; dapat memilih rak. Satu judul bisa memiliki banyak eksemplar. |
| Peminjaman | Memilih member dan satu/lebih eksemplar; menghasilkan item pinjaman. |
| Reservasi | Menghubungkan member dengan judul, lalu dapat dialokasikan ke satu eksemplar. |
| Pengembalian | Mengubah item pinjaman dan status eksemplar; dapat membuat denda. |
| Pembayaran denda | Wajib mengacu ke satu denda. |
| Kunjungan | Individual mengacu ke member; rombongan mengacu ke kelas/rombel. |
| Koleksi digital | Dapat memilih kategori; akses baca/putar/download dicatat di log. |

## 1. Akun dan pengaturan

Gunakan `master_admin`.

- Buat akun: email valid, nama lengkap, role, dan undangan atau kata sandi sementara.
- Uji email salah/duplikat dan kata sandi yang kurang dari 12 karakter atau tidak memiliki huruf besar, kecil, angka, dan simbol.
- Hubungkan akun ke member; coba hubungkan member yang sama ke akun lain. Harus ditolak.
- Ubah role/status akun; coba lakukan sebagai role selain master admin. Harus ditolak.
- Uji pengaturan: batas pinjaman, hari pinjam, jumlah/hari perpanjangan, denda per hari, lama hold reservasi, nama sekolah, email sekolah, dan timezone.
- Isi angka nol, negatif, desimal, atau melewati batas; sistem harus menolak. Setelah setting valid disimpan, cek transaksi baru mengikuti setting tersebut.

## 2. Data master

Gunakan `librarian`.

- **Tahun ajaran:** nama wajib dan unik; tanggal selesai tidak boleh sebelum tanggal mulai; hanya satu yang aktif.
- **Kelas:** tingkat hanya 1–6; coba nama kelas yang sama dalam tahun ajaran yang sama.
- **Rombel:** wajib memilih kelas; coba kelas yang tidak ada dan nama rombel sama dalam satu kelas.
- **Kategori:** nama, slug, induk kategori, deskripsi, aktif/nonaktif. Slug hanya huruf kecil, angka, dan strip, misalnya `cerita-anak`.
- **Pengarang dan penerbit:** nama wajib; coba duplikat beda huruf besar/kecil. Untuk penerbit, uji URL website salah.
- **Rak:** kode dan nama wajib; kode harus unik.
- **Kategori biaya penggantian:** coba nominal negatif dan persentase di luar batas; simpan satu data valid untuk dipakai pada buku.

## 3. Member

- Buat **member non-siswa**: kode member, nomor kartu perpustakaan, nama, gender, status aktif. Identitas sekolah boleh kosong.
- Buat **member siswa**: isi juga NIS, NISN, nomor kartu pelajar, kelas, dan rombel. Kosongkan satu per satu; setiap field itu harus wajib untuk siswa.
- Uji kode member, kartu perpustakaan, NIS, NISN, dan kartu pelajar yang sama pada member lain. Semua harus ditolak.
- Uji email salah, nama terlalu pendek, serta masa berlaku sebelum tanggal bergabung.
- Pilih kelas A dengan rombel milik kelas B. Ini harus dianggap data salah; bila tersimpan, catat sebagai defect relasi.
- Nonaktifkan member, lalu coba scan untuk peminjaman, reservasi, dan kunjungan. Semua harus ditolak.

## 4. Judul buku dan eksemplar

### Judul buku

- Uji judul wajib, ISBN, kode katalog, kategori, penerbit, rak default, kategori biaya penggantian, tahun terbit, jumlah halaman, harga, bahasa, sinopsis, dan status published/reference-only.
- Coba ISBN/kode katalog yang sama pada judul lain; coba tahun di luar 1000–2100, halaman nol, dan harga negatif.
- Tambahkan pengarang: tanpa pengarang, satu pengarang, beberapa pengarang, pengarang sama dua kali, dan lebih dari 20 pengarang.
- Tandai judul sebagai `reference only`, nonaktif, atau tidak published; pastikan tidak dapat dipinjam/reservasi dan tidak muncul di katalog publik bila tidak published/nonaktif.

### Eksemplar buku

- Buat eksemplar dengan judul, `inventory_code`, nomor eksemplar, rak, tanggal/sumber akuisisi, harga, kondisi, status, dan catatan.
- Coba `inventory_code` yang sama. Harus ditolak karena kode ini adalah isi barcode/QR yang sebenarnya.
- Coba nomor eksemplar sama pada judul yang sama; harus ditolak.
- Uji kondisi `new`, `good`, `fair`, `damaged`, `lost` dan status `available`, `reserved`, `loaned`, `damaged`, `lost`, `maintenance`, `inactive`.
- Cetak barcode/QR lalu scan. Hasil scan harus sama persis dengan `inventory_code` dan menemukan eksemplar yang tepat.

## 5. Import CSV/XLSX

- Download template terlebih dahulu; upload file valid CSV/XLSX dan file lebih dari 10 MB/format lain.
- Untuk member, cek header: `member_code`, `nis`, `nisn`, `full_name`, `gender`, `class`, `study_group`, `student_card_number`, `library_card_number`, `is_active`.
- Untuk buku, cek header: `inventory_code`, `title`, `category`, `author`, `publisher`, `publication_year`, `isbn`, `shelf`, `condition`, `replacement_cost`, `status`.
- Uji header kurang, baris kosong, data wajib kosong, dan duplikasi di dalam file.
- Uji kelas, rombel, kategori, pengarang, penerbit, atau rak yang belum ada/nonaktif. Baris tersebut harus gagal dan muncul dalam CSV error.
- Campurkan beberapa baris valid dan salah. Pastikan baris valid tetap masuk, jumlah sukses/gagal benar, dan nomor baris error jelas.

## 6. Peminjaman, pengembalian, dan perpanjangan

Gunakan `librarian`, member aktif, dan eksemplar `available`.

- Scan kartu member dan kode inventaris yang valid; coba kartu/kode kosong atau tidak ditemukan.
- Pinjam 1 buku, lalu sampai 3 buku aktif. Buku keempat harus ditolak.
- Masukkan kode inventaris yang sama dua kali, buku yang sedang dipinjam, buku rusak/hilang/maintenance, atau buku reference-only. Transaksi harus ditolak tanpa perubahan parsial.
- Klik konfirmasi dua kali. Pastikan hanya terbentuk satu pinjaman (idempotensi).
- Kembalikan buku dengan kondisi `good`, `damaged`, dan `lost`. Cek status eksemplar berubah menjadi `available`, `damaged`, atau `lost` sesuai kondisi.
- Kembalikan buku terlambat. Cek jumlah hari telat dan denda; nominal dihitung sistem, bukan diketik petugas.
- Perpanjang sekali, lalu ulangi. Dengan setting default, perpanjangan kedua harus ditolak.

## 7. Reservasi dan denda

### Reservasi

- Sebagai member aktif, pilih judul published yang bukan reference-only dan memiliki eksemplar tersedia.
- Coba reservasi judul yang tidak tersedia, reference-only, atau judul yang sama untuk kedua kali. Harus ditolak.
- Sebagai librarian, approve dengan kode inventaris yang benar. Cek reservasi `approved` dan eksemplar `reserved`.
- Coba approve memakai eksemplar milik judul lain atau yang tidak tersedia. Harus ditolak.
- Convert ke loan. Cek reservasi menjadi `completed`, eksemplar menjadi `loaned`, dan loan baru terbentuk.
- Reject dengan alasan kosong/terlalu pendek, lalu alasan valid. Alasan valid harus tersimpan.
- Cancel reservasi pending/approved; eksemplar yang dialokasikan harus kembali available.

### Pembayaran denda

- Buat denda dari pengembalian terlambat/rusak/hilang.
- Bayar sebagian dengan tunai, transfer, dan metode lain; cek status menjadi `partial`.
- Bayar sisa tepat; cek status menjadi `paid` dan receipt tersedia.
- Coba bayar nol, negatif, atau lebih besar dari sisa denda. Harus ditolak.

## 8. Kunjungan

- **Individual:** scan kartu member aktif. Cek nama member, waktu, kartu snapshot, dan petugas tercatat.
- Coba kartu salah atau member nonaktif; harus ditolak.
- **Rombongan:** isi kelas, rombel (opsional), nama guru, jumlah peserta, catatan.
- Uji jumlah 0, negatif, desimal, lebih dari 1.000, dan nama guru terlalu pendek. Harus ditolak.
- Jika memilih rombel, pastikan rombel memang milik kelas tersebut.

## 9. Koleksi digital

- Isi judul, slug, deskripsi, jenis media, kategori, penulis/penerbit, tahun, durasi, published, dan download.
- Uji slug salah/duplikat, tahun atau durasi di luar batas, dan kategori yang tidak ada.
- Upload file sesuai media: PDF untuk e-book/modul, MP4/WebM untuk video, MP3/M4A/OGG/WAV untuk audio.
- Coba file >100 MB, file tidak sesuai jenis media, nama file tidak aman, dan signature file yang tidak cocok. Semua harus ditolak.
- Cover hanya JPG/PNG/WebP maksimal 5 MB.
- Simpan sebagai unpublished lalu buka sebagai guest/member: tidak boleh muncul. Publish, lalu cek metadata tampil di katalog.
- Sebagai member, coba baca/putar dan download. Download harus ditolak jika opsi download dimatikan.

## 10. Uji akses singkat

- `librarian` boleh mengelola data, import, sirkulasi, kunjungan, dan koleksi digital.
- `master_admin` mengelola akun dan pengaturan, bukan transaksi operasional.
- `head_librarian` melihat operasi/laporan, bukan mengubah data.
- `member` hanya membuat/membatalkan reservasinya sendiri dan melihat datanya sendiri.
- `guest` hanya melihat katalog publik. Coba tiap role melakukan aksi tulis yang bukan haknya; hasil harus ditolak dan tidak ada data berubah.

## Catatan hasil uji

Gunakan format sederhana ini untuk setiap temuan:

```text
Kasus    : MEM-03
Input    : NIS sama dengan member yang sudah ada
Hasil    : ditolak / tersimpan
Harapan  : ditolak sebagai data duplikat
Bukti    : screenshot atau pesan error
```

Prioritaskan sebagai temuan kritis bila satu eksemplar bisa dipinjam dua kali, pembayaran melebihi denda, transaksi dapat diubah oleh role yang salah, atau status buku dapat dibypass tanpa mengikuti transaksi.
