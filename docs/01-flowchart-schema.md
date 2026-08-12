# Skema Flowchart SDI Digital Library

Dokumen ini berisi contoh skema yang dapat digambar ulang di draw.io. Setiap contoh menggunakan format Mermaid agar hubungan antarproses mudah dibaca. Bentuk, warna, dan tata letak akhir bebas disesuaikan.

## Legenda Bentuk

| Bentuk          | Fungsi                       |
| --------------- | ---------------------------- |
| Oval            | Mulai atau selesai           |
| Persegi panjang | Proses                       |
| Belah ketupat   | Keputusan atau validasi      |
| Jajar genjang   | Input atau output            |
| Silinder        | Database                     |
| Dokumen         | Bukti transaksi atau laporan |

---

## 1. Arsitektur dan Aliran Data Utama

```mermaid
flowchart LR
    U1[Master Admin]
    U2[Kepala Perpustakaan]
    U3[Petugas Perpustakaan]
    U4[Member / Siswa]
    U5[Guest / Pengunjung Web]

    FE[Angular Web Application]
    API[Express TypeScript API]
    AUTH[Supabase Auth]
    DB[(Supabase PostgreSQL)]
    ST[(Supabase Storage)]
    WEB[Website Sekolah]
    SCAN[Scanner Barcode / QR / Kartu]

    U1 --> FE
    U2 --> FE
    U3 --> FE
    U4 --> FE
    U5 --> WEB
    WEB --> FE
    SCAN --> FE

    FE -->|REST API| API
    FE -->|Login / Session| AUTH
    API -->|Validasi user| AUTH
    API --> DB
    API --> ST
```

### Susunan draw.io

Letakkan pengguna di kiri, Angular di tengah kiri, Express di tengah, lalu Supabase Auth, Database, dan Storage di kanan. Website sekolah dan scanner dapat diletakkan di bagian atas atau bawah sebagai sumber akses tambahan.

---

## 2. Alur Login dan Pengarahan Role

```mermaid
flowchart TD
    A([Mulai]) --> B[Pengguna membuka website]
    B --> C{Sudah memiliki sesi?}
    C -- Tidak --> D[Masukkan email dan password]
    D --> E[Supabase Auth memvalidasi]
    E --> F{Login berhasil?}
    F -- Tidak --> G[Tampilkan pesan gagal]
    G --> D
    F -- Ya --> H[Ambil profil dan role]
    C -- Ya --> H

    H --> I{Role pengguna}
    I -- Master Admin --> J[Dashboard Master Admin]
    I -- Kepala Perpustakaan --> K[Dashboard Monitoring dan Laporan]
    I -- Petugas --> L[Dashboard Operasional]
    I -- Member --> M[Portal Member]
    I -- Guest --> N[Katalog dan Koleksi Digital]

    J --> O([Selesai])
    K --> O
    L --> O
    M --> O
    N --> O
```

---

## 3. Alur Kunjungan Perpustakaan

```mermaid
flowchart TD
    A([Siswa datang]) --> B{Membawa kartu member?}
    B -- Ya --> C[Petugas scan kartu]
    C --> D[Frontend mengirim nomor kartu]
    D --> E[Backend mencari member]
    E --> F{Member aktif dan kartu valid?}
    F -- Tidak --> G[Tolak akses dan tampilkan alasan]
    F -- Ya --> H[Simpan data kunjungan]
    H --> I[Tampilkan identitas siswa]
    I --> J[Izinkan masuk]
    B -- Tidak --> K{Datang bersama rombongan belajar dan guru?}
    K -- Tidak --> G
    K -- Ya --> L[Petugas pilih kunjungan rombongan]
    L --> M[Input kelas, rombel, guru, jumlah siswa]
    M --> N[Simpan group visit]
    N --> J
    J --> O([Selesai])
```

### Data yang dicatat

- Member atau rombongan belajar.
- Nomor kartu saat scan.
- Waktu masuk.
- Metode kunjungan.
- Petugas pencatat.
- Guru pendamping dan jumlah peserta untuk rombongan.

---

## 4. Alur Peminjaman Langsung oleh Petugas

```mermaid
flowchart TD
    A([Mulai transaksi]) --> B[Petugas scan kartu member]
    B --> C{Member ditemukan dan aktif?}
    C -- Tidak --> X[Tolak transaksi]
    C -- Ya --> D[Ambil jumlah pinjaman aktif]
    D --> E{Sudah mencapai 3 buku?}
    E -- Ya --> X
    E -- Tidak --> F[Petugas scan kode inventaris buku]
    F --> G{Kode buku valid?}
    G -- Tidak --> H[Tampilkan buku tidak ditemukan]
    H --> F
    G -- Ya --> I{Eksemplar tersedia dan boleh dipinjam?}
    I -- Tidak --> J[Tampilkan alasan penolakan]
    J --> F
    I -- Ya --> K[Tambahkan buku ke daftar transaksi]
    K --> L{Jumlah total lebih dari 3?}
    L -- Ya --> M[Batalkan item terakhir]
    M --> F
    L -- Tidak --> N{Tambah buku lain?}
    N -- Ya --> F
    N -- Tidak --> O[Konfirmasi transaksi]
    O --> P[Database mengunci eksemplar]
    P --> Q{Semua eksemplar masih tersedia?}
    Q -- Tidak --> R[Batalkan transaksi dan muat ulang stok]
    Q -- Ya --> S[Buat loan dan loan items]
    S --> T[Tetapkan jatuh tempo 7 hari]
    T --> U[Ubah status buku menjadi loaned]
    U --> V[Cetak atau tampilkan bukti peminjaman]
    V --> W([Selesai])
    X --> W
    R --> W
```

### Aturan yang ditempatkan pada decision

- Maksimal tiga buku aktif per member.
- Masa pinjam tujuh hari.
- Member harus aktif.
- Buku referensi khusus dapat ditolak.
- Satu eksemplar hanya boleh memiliki satu transaksi aktif.

---

## 5. Alur Reservasi Online Menjadi Peminjaman

```mermaid
flowchart TD
    A([Member login]) --> B[Buka katalog]
    B --> C[Pilih judul buku]
    C --> D{Ada eksemplar tersedia?}
    D -- Tidak --> E[Tampilkan tidak tersedia]
    D -- Ya --> F[Kirim reservasi]
    F --> G[Simpan status pending]
    G --> H[Member datang ke perpustakaan]
    H --> I[Petugas scan kartu member]
    I --> J[Buka daftar reservasi pending]
    J --> K{Reservasi masih berlaku?}
    K -- Tidak --> L[Ubah status expired]
    K -- Ya --> M[Petugas pilih eksemplar]
    M --> N{Member memenuhi syarat pinjam?}
    N -- Tidak --> O[Tolak reservasi dan simpan alasan]
    N -- Ya --> P[Konversi reservasi ke transaksi loan]
    P --> Q[Ubah status reservasi completed]
    Q --> R[Ubah status eksemplar loaned]
    R --> S[Tampilkan bukti peminjaman]
    S --> T([Selesai])
    E --> T
    L --> T
    O --> T
```

### Status reservasi

```text
pending → completed
pending → rejected
pending → cancelled
pending → expired
approved → completed
approved → cancelled
approved → expired
```

Untuk kebutuhan sekolah ini, approval dapat langsung disertai pembuatan transaksi peminjaman ketika siswa datang.

---

## 6. Alur Pengembalian, Keterlambatan, Rusak, dan Hilang

```mermaid
flowchart TD
    A([Mulai pengembalian]) --> B[Petugas scan kode inventaris]
    B --> C[Cari loan item aktif]
    C --> D{Transaksi ditemukan?}
    D -- Tidak --> E[Tampilkan transaksi tidak ditemukan]
    D -- Ya --> F[Hitung tanggal jatuh tempo]
    F --> G{Terlambat?}
    G -- Ya --> H[Hitung jumlah hari terlambat]
    H --> I[Hitung denda Rp2.000 x hari]
    G -- Tidak --> J[Nilai denda keterlambatan = 0]
    I --> K[Petugas pilih kondisi buku]
    J --> K
    K --> L{Kondisi}
    L -- Baik / Layak --> M[Status buku available]
    L -- Rusak --> N[Status buku damaged]
    L -- Hilang --> O[Status buku lost]
    N --> P[Hitung biaya sesuai kategori penggantian]
    O --> P
    M --> Q[Selesaikan loan item]
    P --> R[Buat data fine]
    R --> Q
    Q --> S{Semua item pada loan sudah kembali?}
    S -- Ya --> T[Status loan completed]
    S -- Tidak --> U[Status loan tetap active atau overdue]
    T --> V[Tampilkan rincian pengembalian dan denda]
    U --> V
    V --> W([Selesai])
    E --> W
```

### Catatan denda

Denda keterlambatan dan biaya rusak/hilang dibuat sebagai data terpisah. Dengan demikian, satu buku dapat memiliki denda keterlambatan sekaligus biaya kerusakan.

---

## 7. Alur Pembayaran Denda

```mermaid
flowchart TD
    A([Mulai]) --> B[Petugas buka tagihan member]
    B --> C[Pilih denda]
    C --> D[Input jumlah pembayaran]
    D --> E{Jumlah melebihi sisa tagihan?}
    E -- Ya --> F[Tolak pembayaran]
    E -- Tidak --> G[Simpan pembayaran]
    G --> H[Hitung total pembayaran]
    H --> I{Sudah lunas?}
    I -- Ya --> J[Status fine paid]
    I -- Tidak --> K[Status fine partial]
    J --> L[Cetak bukti]
    K --> L
    L --> M([Selesai])
    F --> M
```

---

## 8. Alur Import Excel Siswa

```mermaid
flowchart TD
    A([Mulai]) --> B[Petugas unduh template Excel]
    B --> C[Isi data siswa]
    C --> D[Upload file]
    D --> E[Validasi format file dan header]
    E --> F{Template sesuai?}
    F -- Tidak --> G[Tolak file dan tampilkan kesalahan]
    F -- Ya --> H[Baca setiap baris]
    H --> I[Validasi NIS, NISN, kartu, kelas, rombel]
    I --> J{Baris valid?}
    J -- Tidak --> K[Simpan import error]
    J -- Ya --> L{Data sudah ada?}
    L -- Ya --> M[Update sesuai strategi import]
    L -- Tidak --> N[Insert member baru]
    M --> O[Tambah success counter]
    N --> O
    K --> P{Masih ada baris?}
    O --> P
    P -- Ya --> H
    P -- Tidak --> Q[Buat ringkasan hasil import]
    Q --> R[Unduh laporan baris gagal]
    R --> S([Selesai])
    G --> S
```

### Kolom template siswa

```text
nis
nisn
nama_lengkap
jenis_kelamin
kelas
rombongan_belajar
nomor_kartu_pelajar
nomor_kartu_perpustakaan
status_aktif
```

Kode kartu perpustakaan harus unik. Strategi update atau skip data lama harus dipilih secara eksplisit sebelum proses import dijalankan.

---

## 9. Alur Koleksi Digital

```mermaid
flowchart TD
    A([Pengunjung membuka katalog digital]) --> B[Pilih koleksi]
    B --> C{Sudah login?}
    C -- Tidak --> D[Tampilkan metadata dan tombol login]
    C -- Ya --> E{Koleksi dipublikasikan?}
    E -- Tidak --> F[Tolak akses]
    E -- Ya --> G{Jenis media}
    G -- E-Book / Modul --> H[Buka PDF viewer]
    G -- Video --> I[Buka video player]
    H --> K[Catat view]
    I --> K
    K --> L{Download diizinkan?}
    L -- Ya --> M[Tampilkan tombol download]
    L -- Tidak --> N[Hanya baca atau tonton]
    M --> O[Catat download]
    N --> P([Selesai])
    O --> P
    D --> P
    F --> P
```

---

## 10. Alur Laporan

```mermaid
flowchart TD
    A([Kepala atau petugas membuka laporan]) --> B[Pilih jenis laporan]
    B --> C[Pilih rentang tanggal dan filter]
    C --> D[Backend menjalankan query agregasi]
    D --> E[Tampilkan tabel dan ringkasan]
    E --> F{Ekspor?}
    F -- Tidak --> G([Selesai])
    F -- PDF --> H[Generate file PDF]
    F -- Excel --> I[Generate file Excel]
    H --> J[Simpan sementara di bucket exports]
    I --> J
    J --> K[Buat signed URL]
    K --> L[Unduh file]
    L --> G
```

Jenis laporan utama:

- Buku paling sering dipinjam.
- Siswa paling aktif.
- Keterlambatan dan denda.
- Buku rusak atau hilang.
- Stok dan inventaris.
- Statistik kunjungan.
- Rekap koleksi digital.
- Data pendukung akreditasi perpustakaan.

---

## 11. Peta Status Eksemplar Buku

```mermaid
stateDiagram-v2
    [*] --> available
    available --> loaned: dipinjam
    available --> reserved: dialokasikan untuk reservasi
    reserved --> loaned: reservasi disetujui
    reserved --> available: dibatalkan atau kedaluwarsa
    loaned --> available: kembali baik
    loaned --> damaged: kembali rusak
    loaned --> lost: dinyatakan hilang
    damaged --> maintenance: diperbaiki
    maintenance --> available: selesai diperbaiki
    damaged --> inactive: tidak layak
    lost --> inactive: dihapus dari layanan
    available --> inactive: dinonaktifkan
```

---

## 12. Urutan Gambar Flowchart yang Disarankan

Untuk dokumentasi proyek, cukup buat tujuh halaman draw.io:

1. Arsitektur dan aktor sistem.
2. Login dan pembagian role.
3. Kunjungan perpustakaan.
4. Peminjaman langsung.
5. Reservasi online.
6. Pengembalian dan denda.
7. Import Excel dan koleksi digital.

Alur pembayaran denda, laporan, dan status buku dapat dimasukkan sebagai subdiagram pada halaman yang paling relevan.
