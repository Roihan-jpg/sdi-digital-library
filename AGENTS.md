# AGENTS.md

Guardrail untuk seluruh repository **SDI Digital Library**. `AGENTS.md` subfolder boleh menambah/mengganti aturan lokal. Selalu cek repo sebelum edit, pertahankan kode yang sudah bekerja, jangan menimpa perubahan user yang tidak terkait, dan pilih perubahan terkecil yang menyelesaikan alur.

Jika bekerja dengan Supabase, gunakan skill lokal `.agents/skills/supabase` dan `.agents/skills/supabase-postgres-best-practices` bila perlu.

## Konteks dan Stack

SDI Digital Library adalah prototype perpustakaan SD yang siap digunakan/deploy. Kondisi: 592 siswa, 41 guru, 2 petugas, sistem lama usang, data lama menumpuk, siswa punya NIS/NISN/kartu pelajar/kartu anggota. Aplikasi diakses dari jaringan sekolah dan internet publik. Prioritas MVP: peminjaman dan pengembalian. Koleksi: buku fisik, PDF/e-book, modul, video, audio.

Stack tetap: Angular + TypeScript + SCSS di `frontend/`; Node.js + Express + TypeScript REST API di `backend/`; Supabase PostgreSQL/Auth/Storage, RLS, SQL migrations, RPC/functions di `supabase/`; dokumentasi di `docs/`; script di `scripts/`. Jangan mengganti stack, menambah ORM berat, microservices, framework lain, atau abstraksi spekulatif tanpa instruksi eksplisit.

Sumber kebenaran: kode aktual dan migration yang sudah diterapkan. Sebelum coding baca file relevan, package scripts, docs utama (`README.md`, `docs/00-03*`), migration, source, dan test terkait. Jika docs dan kode berbeda, tentukan mana yang lebih baru/keliru, jangan menimpa kode valid, lakukan perubahan minimal, dan update docs bila perilaku berubah.

## Role dan Akses

Role: `master_admin`, `head_librarian`, `librarian`, `member`, `guest`.

- `master_admin`: konfigurasi dan role.
- `head_librarian`: monitoring dan laporan.
- `librarian`: operasional.
- `member`: katalog, reservasi, riwayat, koleksi digital.
- `guest`: katalog publik/koleksi yang diizinkan; tidak boleh pinjam/reservasi buku fisik.
- User biasa tidak boleh menaikkan role sendiri.

## Aturan Bisnis Inti

- **Member:** dapat siswa/non-siswa. Jika `is_student = true`, dukung NIS, NISN, kelas, rombel, nomor kartu pelajar, nomor kartu perpustakaan. Lindungi NIS, NISN, nomor kartu pelajar/perpustakaan, dan kode member dari duplikasi dengan constraint bila sesuai.
- **Buku/eksemplar:** satu judul punya banyak eksemplar. `inventory_code` unik diinput petugas dan harus menjadi payload barcode/QR persis. Jangan ganti dengan UUID, auto increment, token acak, atau ID internal. Satu eksemplar tidak boleh punya >1 pinjaman aktif. Status: `available`, `reserved`, `borrowed`, `damaged`, `lost`, `maintenance`. Perubahan kritis harus transaksional.
- **Peminjaman:** siswa maksimal 3 eksemplar aktif, masa pinjam 7 hari, perpanjangan maksimal 1 kali, tambahan 1 hari, denda terlambat Rp2.000/hari/eksemplar. Tolak jika member tidak aktif, batas tercapai, eksemplar tidak tersedia/sedang dipinjam, atau identitas tidak valid. Aturan kritis wajib di backend/database; Angular hanya UX awal.
- **Reservasi:** alur `pending` -> member datang -> petugas scan kartu -> cek kelayakan/stok -> approve -> convert to loan. Status: `pending`, `approved`, `rejected`, `cancelled`, `expired`, `completed`. Penolakan menyimpan alasan. Reservasi pending bukan pinjaman aktif.
- **Return/denda:** cari loan item aktif via `inventory_code`, hitung telat/denda di server/database, catat kondisi, update status eksemplar atomik, simpan petugas. Kondisi hasil: `available`, `damaged`, `lost`. Pembayaran: `unpaid`, `partial`, `paid`. Jangan hapus histori; gunakan koreksi/pembayaran/audit/aksi administratif.
- **Kunjungan:** individual via scan kartu anggota; siswa tanpa kartu tidak diterima individual. Rombongan/didampingi guru dicatat sebagai group visit. Dukung scan, fallback manual, kelas, rombel, guru, jumlah siswa, waktu, petugas.
- **Digital library:** metadata published boleh publik; baca penuh/play/download perlu login. File utama private, gunakan signed URL/mekanisme aman, download hanya jika `is_downloadable`, unpublished tidak boleh diakses user biasa. Jangan taruh service role key di Angular, jangan jadikan private bucket public, jangan manipulasi `storage.objects` langsung untuk upload/delete normal.

## Tanggung Jawab Layer

**Frontend Angular:** tampilan, routing, form, UX validation, loading/empty/success/error state, menu role, scanner interaction, dan panggilan API. Bukan otoritas untuk role, batas pinjaman, stok, denda, approval, pembayaran, atau akses file privat. Gunakan feature-first (`features/<feature>/{pages,components,data-access,models}`), HTTP di `data-access`, `core` untuk singleton/auth/guard/interceptor, `shared` untuk komponen generik, reactive forms, hindari `any`, error Bahasa Indonesia, cegah double submit, jaga keyboard/focus, fallback manual scanner, dan kembalikan fokus ke input scan setelah sukses. UI operasional harus cepat: tabel/search/filter/status/scanner > animasi.

**Backend Express:** autentikasi, otorisasi role, validasi request, orchestration bisnis, database/RPC, file authorization, import/export, audit-worthy action, structured logging, error mapping. Controller tipis; logika di service/domain; akses data di repository/data-access. Validasi env startup, params/query/body, centralized error handler, jangan bocorkan stack/raw Supabase error, gunakan pagination, whitelist sorting, request ID, jangan log token/password/private signed URL, cegah scanner double-submit bila mungkin, dan pakai RPC/transaction untuk circulation. Status HTTP: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500` sesuai makna umum.

**Database/Supabase:** constraint, unique/FK, transaksi, row locking, RLS, audit, report views, state transition penting. Pakai RPC/functions untuk checkout, reservation-to-loan, return, extension, fine payment, copy status transition, dan individual visit bila butuh konsistensi. Migration yang sudah diterapkan immutable; buat migration baru bertimestamp deterministic; index berdasarkan query nyata; RLS least privilege; service role hanya backend; secret jangan masuk Git; perubahan schema butuh migration, update/generated TS types atau rencana, test, dan catatan backfill. Public catalog harus DTO terpilih, bukan row internal mentah.

## Import, Reporting, Security

Import CSV/Excel wajib punya template, validasi header/baris, normalisasi aman, deteksi duplikasi, nomor baris error, import job, jumlah sukses/gagal, error jelas, dan tidak merusak data valid saat sebagian gagal. Kolom minimum member/student: `nis`, `nisn`, `full_name`, `gender`, `class`, `study_group`, `student_card_number`, `library_card_number`, `is_active`. Kolom minimum book: `inventory_code`, `title`, `category`, `author`, `publisher`, `publication_year`, `isbn`, `shelf`, `condition`, `replacement_cost`, `status`.

Laporan harus dari data transaksi, bukan total manual. Dukung buku paling sering dipinjam, siswa paling aktif, keterlambatan, denda/pembayaran, rusak/hilang, stok, inventaris, kunjungan, transaksi, akreditasi; modul final perlu ekspor PDF/Excel.

Security minimum: HTTPS saat deploy, Supabase Auth session aman, RBAC, RLS, input validation, validasi MIME/extension, upload size limit, private file authorization, rate limiting, Helmet, CORS terbatas, audit log, secret tidak masuk source, tidak ada credential asli dalam contoh, role/total dari frontend tidak dipercaya. Audit perubahan user/role, buku/eksemplar, import, checkout, return, extension, approve/reject reservasi, rusak/hilang, pembayaran denda, dan setting penting.

## Testing dan Definition of Done

Jangan klaim selesai tanpa verifikasi. Gunakan script yang benar-benar ada di `package.json`; jangan mengarang command. Umumnya `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Coverage sesuai risiko: database migration/constraint/RLS/RPC; backend validation/authorization/business rule/integration circulation/double-submit; frontend form validation, auth/role guard, data-access, komponen inti, build.

Skenario kritis: member nonaktif ditolak, buku aktif keempat ditolak, copy tidak tersedia ditolak, copy sama tidak dipinjam dua kali, due date 7 hari, perpanjangan kedua ditolak, denda telat benar, pembayaran partial menyisakan saldo, konversi reservasi cek ulang stok, guest tidak bisa meminjam, file private/unpublished tidak bocor, user biasa tidak bisa menaikkan role.

Fitur selesai jika end-to-end untuk role tujuan, validasi di layer benar, authorization server-side, state database konsisten, loading/error ada, test relevan lulus, TypeScript compile, build sukses, tidak ada secret/placeholder/dead code, dan docs diperbarui bila perlu. Untuk circulation, UI saja belum cukup; harus ada perubahan state database yang benar dan terverifikasi.

## Workflow, Git, dan Token Hygiene

Workflow: baca file terkait, cek `git status`, pilih vertical slice kecil tapi lengkap, pertahankan perubahan user, implementasikan kode nyata, tambah/update test, jalankan focused verification lalu lint/typecheck/test/build relevan, update docs bila setup/perilaku berubah, laporkan hasil faktual/risiko/manual step. Jika credential/layanan eksternal tidak tersedia, selesaikan kode lokal yang mungkin dan jangan klaim remote berhasil.

Prioritas default: foundation/env, auth/role, member/inventory, checkout/return, fine/extension, reservation, visit, import, digital collection, report/export, website integration, deployment hardening.

Git: cek status sebelum/sesudah, jangan revert perubahan user, hindari formatting massal, jangan commit `.env`, credential, build output, dependency folder, screenshot/log sementara, atau cache browser. Jangan destructive Git/rewrite history tanpa instruksi. Migration schema selalu file baru. Commit hanya jika diminta, dengan pesan deskriptif.

Token/tool-output hygiene:

- Jangan tampilkan diff besar penuh kecuali diminta; pakai `git diff --stat`, `--name-only`, atau diff file/section terbatas.
- Untuk file besar, pakai `rg`/`Select-String` dan baca chunk kecil; jangan dump dokumen panjang jika ringkasan cukup.
- Filter output panjang dengan `--short`, `--stat`, `Select-Object -First/-Last`, `-Tail`, atau pola spesifik.
- Final answer cukup rangkum command/status/angka penting/warning/error; jangan tempel output build/test lengkap.
- Bersihkan screenshot/log/profile browser/dev-server helper sebelum selesai.

## Larangan Keras

Jangan menyimpan service role key di Angular, mempercayai role client, menghitung aturan kritis hanya di browser, membuat RLS permisif, menjadikan private bucket public, mengganti `inventory_code` dengan generated ID, hard-code credential sekolah, menghapus histori transaksi, mengabaikan import error, membuat abstraksi/file kosong spekulatif, mengganti stack, mengklaim test/build/deploy tanpa menjalankan, atau mempersempit scope agar mudah tanpa menjelaskan batasannya.

## Completion Report dan Prinsip Praktis

Setelah task besar, laporkan singkat: fitur, file penting, perubahan database, command, hasil test/build, asumsi, risiko/manual step. Harus faktual; kegagalan atau pekerjaan belum selesai wajib disebutkan.

Bangun berdasarkan alur perpustakaan nyata: pencarian member cepat, scan stabil, ketersediaan jelas, checkout aman, return/denda akurat, error mudah dipahami, transaksi dapat ditelusuri. Implementasi terbaik adalah desain terkecil yang maintainable, menjaga aturan bisnis, dan nyaman dipakai petugas.
