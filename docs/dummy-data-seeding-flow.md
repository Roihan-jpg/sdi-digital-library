# Alur Pengisian Data Dummy

Dokumen ini merangkum alur pengisian data dummy untuk database Supabase SDI Digital Library. Data dibuat oleh script:

```powershell
npx supabase db query --linked --file supabase\demo\seed_full_dummy.sql
```

Script verifikasi:

```powershell
npx supabase db query --linked --file supabase\demo\verify_dummy.sql
```

Data dummy memakai prefix `DUMMY-` dan UUID tetap agar idempoten, sehingga aman dijalankan ulang pada database development/staging/testing tanpa menggandakan data utama. Script ini bukan untuk production.

## Prinsip Urutan

Pengisian data harus mengikuti urutan relasi database:

1. Akun Auth dan profile role.
2. Master tahun ajaran, kelas, dan rombel.
3. Member siswa dan non-siswa.
4. Master katalog: kategori, penulis, penerbit, rak, kategori biaya pengganti.
5. Judul buku dan relasi penulis.
6. Eksemplar buku.
7. Koleksi digital dan log akses.
8. Reservasi.
9. Peminjaman, item peminjaman, perpanjangan, denda, pembayaran.
10. Status akhir eksemplar.
11. Kunjungan individual/rombongan.
12. Import job dan import error.
13. Setting perpustakaan.
14. Verifikasi hitungan dan integritas.

Urutan ini penting karena banyak tabel memiliki foreign key. Contoh: `members` butuh `classes` dan `study_groups`; `book_copies` butuh `book_titles`; `loan_items` butuh `loans` dan `book_copies`; `fine_payments` butuh `fines`.

## 1. Akun Auth dan Profile

Script membuat 6 akun login dummy langsung di `auth.users`, `auth.identities`, dan `public.profiles`.

Password semua akun:

```text
DemoPass123!
```

Daftar akun:

| Email | Role |
|---|---|
| `admin.dummy@sdi.test` | `master_admin` |
| `kepala.perpus.dummy@sdi.test` | `head_librarian` |
| `petugas.dummy@sdi.test` | `librarian` |
| `siswa.dummy@sdi.test` | `member` |
| `guru.member.dummy@sdi.test` | `member` |
| `guest.dummy@sdi.test` | `guest` |

Catatan teknis Auth:

- `instance_id` diisi `00000000-0000-0000-0000-000000000000` agar akun dikenali GoTrue hosted.
- Token Auth string seperti `confirmation_token`, `recovery_token`, dan `email_change_token_new` diisi string kosong, bukan `NULL`, agar login password tidak error.
- Row profile dibuat/diupdate dengan role aplikasi yang sesuai.

## 2. Master Sekolah

Data master sekolah yang dibuat:

| Tabel | Isi |
|---|---|
| `school_years` | 1 tahun ajaran `DUMMY 2026/2027` |
| `classes` | 6 kelas, `DUMMY Kelas 1` sampai `DUMMY Kelas 6` |
| `study_groups` | 12 rombel, masing-masing kelas punya `DUMMY A` dan `DUMMY B` |

Tahun ajaran dummy dibuat aktif hanya jika belum ada tahun ajaran aktif lain, supaya tidak melanggar unique index satu tahun ajaran aktif.

## 3. Member

Script membuat 594 member:

| Jenis | Jumlah |
|---|---:|
| Siswa dummy | 592 |
| Member non-siswa | 2 |

Pola data siswa:

- `member_code`: `DUMMY-SIS-0001` sampai `DUMMY-SIS-0592`
- `card_number`: `DUMMY-LIB-0001` sampai `DUMMY-LIB-0592`
- `student_card_number`: `DUMMY-KP-0001` sampai `DUMMY-KP-0592`
- `nis`: `260001` sampai seterusnya
- `nisn`: `9990000001` sampai seterusnya
- kelas/rombel dibagi merata ke 6 kelas dan 2 rombel
- beberapa siswa dibuat nonaktif untuk menguji penolakan member tidak aktif

Member `DUMMY-SIS-0001` dihubungkan ke akun `siswa.dummy@sdi.test`.

## 4. Master Katalog

Master katalog yang dibuat:

| Tabel | Jumlah | Contoh |
|---|---:|---|
| `categories` | 8 | `DUMMY Bacaan Anak`, `DUMMY Pelajaran` |
| `authors` | 12 | `Penulis Dummy 01` |
| `publishers` | 5 | `Penerbit Dummy 01` |
| `shelves` | 8 | `DUMMY-RK-01` |
| `replacement_cost_categories` | 3 | harga penuh, nominal tetap, persentase |

Data ini dipakai oleh judul buku, eksemplar, digital collection, import dummy, dan laporan.

## 5. Judul Buku dan Eksemplar

Script membuat:

| Tabel | Jumlah |
|---|---:|
| `book_titles` | 30 |
| `book_authors` | 36 |
| `book_copies` | 90 |

Pola data:

- `catalog_code`: `DUMMY-TITLE-001` sampai `DUMMY-TITLE-030`
- `inventory_code`: `DUMMY-INV-001-1`, `DUMMY-INV-001-2`, dan seterusnya
- setiap judul punya 3 eksemplar
- beberapa judul ditandai reference-only atau unpublished untuk menguji katalog dan validasi peminjaman

Status akhir eksemplar setelah semua transaksi dummy:

| Status | Jumlah |
|---|---:|
| `available` | 79 |
| `loaned` | 4 |
| `reserved` | 1 |
| `damaged` | 2 |
| `lost` | 2 |
| `maintenance` | 1 |
| `inactive` | 1 |

Barcode dan QR tetap mengikuti aturan sistem: payload sama persis dengan `inventory_code`.

## 6. Koleksi Digital

Script membuat 8 koleksi digital dan 24 log akses.

Jenis media:

- `ebook`
- `module`
- `video`
- `audio`

Skenario akses:

- sebagian downloadable
- sebagian hanya view/play
- satu koleksi unpublished
- log aksi `view`, `play`, dan `download`

Catatan: script hanya mengisi metadata database dan path dummy. File fisik di Supabase Storage tidak diupload oleh script ini.

## 7. Reservasi

Script membuat 6 reservasi, masing-masing mewakili status penting:

| Status | Jumlah | Fungsi Testing |
|---|---:|---|
| `pending` | 1 | daftar reservasi menunggu approval |
| `approved` | 1 | copy sudah dialokasikan dan status copy `reserved` |
| `rejected` | 1 | alasan penolakan terisi |
| `cancelled` | 1 | pembatalan member/staf |
| `expired` | 1 | maintenance/expiry |
| `completed` | 1 | reservasi dikonversi menjadi loan |

## 8. Peminjaman, Return, Denda, dan Pembayaran

Script membuat:

| Tabel | Jumlah |
|---|---:|
| `loans` | 6 |
| `loan_items` | 8 |
| `loan_extensions` | 1 |
| `fines` | 3 |
| `fine_payments` | 2 |

Skenario yang dicakup:

- peminjaman aktif
- item overdue
- pengembalian tepat waktu
- pengembalian rusak
- pengembalian hilang
- perpanjangan 1 kali
- denda unpaid
- denda partial
- denda paid
- loan hasil konversi reservasi

Setelah data transaksi masuk, script menyesuaikan status eksemplar agar konsisten dengan state transaksi.

## 9. Kunjungan

Script membuat:

| Tabel | Jumlah |
|---|---:|
| `visits` | 24 |
| `group_visits` | 6 |

Skenario:

- kunjungan individual via scan kartu
- kunjungan individual input manual
- kunjungan dengan jam keluar
- kunjungan rombongan per kelas/rombel dan guru pendamping

## 10. Import Job

Script membuat:

| Tabel | Jumlah |
|---|---:|
| `import_jobs` | 2 |
| `import_errors` | 2 |

Skenario:

- import member selesai dengan error
- import buku selesai sukses
- contoh error baris untuk validasi NIS dan duplikasi

## 11. Verifikasi

Verifikasi utama:

```powershell
npx supabase db query --linked --file supabase\demo\verify_dummy.sql
```

Hasil terakhir yang sudah diverifikasi:

| Data | Jumlah |
|---|---:|
| profiles dummy | 6 |
| members dummy | 594 |
| classes dummy | 6 |
| study groups dummy | 12 |
| categories dummy | 8 |
| authors dummy | 12 |
| publishers dummy | 5 |
| shelves dummy | 8 |
| book titles dummy | 30 |
| book copies dummy | 90 |
| digital collections dummy | 8 |
| digital access logs dummy | 24 |
| reservations dummy | 6 |
| loans dummy | 6 |
| loan items dummy | 8 |
| fines dummy | 3 |
| fine payments dummy | 2 |
| visits dummy | 24 |
| group visits dummy | 6 |
| import jobs dummy | 2 |
| import errors dummy | 2 |

Verifikasi tambahan yang sudah dijalankan:

- tidak ada satu eksemplar dengan lebih dari satu loan aktif
- tidak ada mismatch status eksemplar `loaned` terhadap active loan item
- tidak ada mismatch status eksemplar `reserved` terhadap approved reservation
- tidak ada member dummy yang melewati batas 3 pinjaman aktif
- login `petugas.dummy@sdi.test` berhasil dengan password `DemoPass123!`

## Cara Menambah Data Dummy Baru

Jika perlu menambah skenario:

1. Tambahkan data pada urutan relasi yang benar.
2. Gunakan UUID tetap dengan prefix blok baru agar idempoten.
3. Gunakan kode bisnis berprefix `DUMMY-`.
4. Pakai `on conflict ... do update` untuk master data.
5. Untuk tabel yang punya trigger validasi pembayaran atau transaksi, gunakan `insert ... select ... where not exists` jika insert ulang akan memicu trigger yang tidak idempoten.
6. Update `supabase/demo/verify_dummy.sql` agar jumlah baru ikut terverifikasi.
7. Jalankan seed dan verifikasi ulang.

## Batasan

- Script mengisi database, bukan upload file Storage.
- Script ditujukan untuk development/staging/testing.
- Jangan jalankan di production tanpa keputusan eksplisit karena data dummy akan bercampur dengan data operasional.
