# Prompt Implementasi UI/UX Per Halaman

Dokumen ini berisi prompt siap pakai untuk memperbaiki UI dan UX setiap halaman SDI Digital Library secara bertahap. Gunakan satu prompt untuk satu tahap implementasi agar perubahan tetap kecil, mudah diuji, dan tidak bercampur antar halaman.

## Aturan umum untuk semua prompt

Pada setiap prompt, pertahankan aturan ini:

- Gunakan `$frontend-design`, `$ui-ux-pro-max`, dan `$incremental-implementation`.
- Baca `docs/ui-ux-audit.md`, `docs/design-system.md`, `AGENTS.md`, route terkait, page component terkait, data-access terkait, dan komponen global yang sudah tersedia.
- Ikuti design system terbaru: digital indigo, Lora, Raleway, token global, focus ring global, spacing scale, card, button, form, table, modal/drawer, badge, dan feedback state.
- Jangan mengganti stack, routing utama, kontrak API, business logic, role guard, struktur data, atau sumber perhitungan.
- Jangan membuat dummy data bila data asli, API, signal, form, atau state yang ada sudah tersedia.
- Jangan memperbaiki seluruh aplikasi sekaligus. Jika shared component perlu dibuat, pakai hanya bila langsung menyelesaikan pola berulang pada halaman yang sedang dikerjakan.
- Gunakan Angular standalone component, TypeScript, SCSS, signals, dan reactive forms sesuai pola project.
- Pastikan loading, empty, error, no-result, success, disabled, hover, focus, active, dan keyboard state jelas.
- Pastikan tidak ada horizontal overflow pada 320 px, 375 px, 768 px, 1024 px, dan 1440 px.
- Semua tabel harus memiliki strategi responsive, caption atau label konteks, header scope, state kosong, dan action target minimal 44 x 44 px.
- Semua form harus memiliki label terlihat, helper bila perlu, error dekat field, `aria-invalid`, `aria-describedby`, focus ke error pertama, dan pesan Bahasa Indonesia.
- Semua status backend harus dipetakan ke label Bahasa Indonesia, bukan enum mentah.
- Setelah selesai, jalankan lint, test, typecheck, build, dan inspeksi visual melalui browser. Periksa console browser dan validasi desktop, tablet, mobile.

## Urutan implementasi yang disarankan

1. `/dashboard/admin`, `/dashboard/monitoring`, `/dashboard/operasional`, `/dashboard/guest`
2. `/dashboard/circulation`
3. `/dashboard/members`
4. `/dashboard/inventory`
5. `/dashboard/master-data`
6. `/dashboard/imports`
7. `/dashboard/digital-library`
8. `/dashboard/reports`
9. `/dashboard/member`
10. `/katalog`
11. `/koleksi-digital`
12. `/koleksi-digital/:slug`
13. `/masuk`
14. `/`
15. `/dashboard/forbidden` dan route `**`

## Prompt: Dashboard overview

Route: `/dashboard/admin`, `/dashboard/monitoring`, `/dashboard/operasional`, `/dashboard/guest`

File utama: `frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman dashboard overview berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- route dashboard berbasis role di frontend/src/app/app.routes.ts;
- file frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.ts.

Scope hanya halaman dashboard overview dan komponen khusus yang langsung dipakai halaman ini.

Karakter halaman:

- satu component dipakai untuk dashboard master admin, monitoring kepala perpustakaan, operasional petugas, dan portal tamu;
- halaman berisi filter periode, KPI ringkasan, grafik peminjaman, dan grafik kunjungan;
- data berasal dari DashboardService dan tidak boleh diganti dummy;
- heading dipengaruhi metadata route.

Target:

- hierarki informasi jelas untuk setiap role;
- KPI mudah dipindai dengan angka tabular, label periode, dan konteks singkat;
- filter periode mudah digunakan, valid pada mobile, dan tidak membuat request ganda;
- chart memiliki judul, label axis/konteks, ringkasan tekstual, dan tidak bergantung pada warna saja;
- empty chart state jelas ketika tidak ada transaksi pada periode terpilih;
- loading, empty, error, retry, dan no-result state tersedia;
- layout mobile tetap usable tanpa horizontal scroll;
- tidak ada informasi terpotong;
- copy dashboard tidak menyebut hal teknis internal.

Jangan:

- mengubah perhitungan KPI, query API, role guard, atau sumber data;
- membuat chart library baru kecuali benar-benar diperlukan dan terdokumentasi;
- menambah dekorasi visual yang tidak membawa informasi;
- mengubah route role dashboard tanpa alasan UX yang jelas.

Setelah selesai:

1. jalankan lint;
2. jalankan test;
3. jalankan typecheck;
4. jalankan build;
5. buka route dashboard melalui browser untuk role yang bisa diakses;
6. validasi desktop, tablet, dan mobile;
7. cek console browser;
8. dokumentasikan masalah yang belum ditangani.
```

## Prompt: Meja layanan

Route: `/dashboard/circulation`

File utama: `frontend/src/app/features/circulation/pages/operations-page/operations-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman meja layanan perpustakaan berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/circulation/pages/operations-page/operations-page.ts;
- data-access circulation yang sudah ada.

Scope hanya halaman circulation dan komponen khusus meja layanan. Ini halaman operasional utama untuk petugas, jadi prioritaskan kecepatan scanner, keyboard, status transaksi, dan error yang jelas.

Karakter halaman:

- digunakan petugas untuk peminjaman, pengembalian, reservasi, denda, kunjungan individu, dan kunjungan rombongan;
- banyak form pendek, tabel status, receipt, dan aksi transaksional;
- beberapa aksi saat ini memakai prompt browser native;
- workflow scanner harus tetap cepat dan fokus kembali ke input utama setelah aksi sukses.

Target:

- tab/panel layanan menjadi semantic, keyboard-accessible, dan dapat deep-link via query parameter bila aman;
- langkah scan member dan scan eksemplar terlihat sebagai workflow operasional yang jelas;
- fokus scanner stabil pada desktop dan tidak memicu keyboard mobile secara agresif;
- receipt peminjaman, pengembalian, dan pembayaran mudah dipindai;
- reservasi aktif dan tagihan belum lunas punya loading, empty, error, dan no-result state;
- prompt native diganti dengan dialog/form aksesibel untuk alasan reject, kode inventaris, dan pembayaran;
- semua status dan kondisi memakai label Bahasa Indonesia;
- focus ring memakai global token, bukan override kuning lama;
- tabel responsif dan action target minimal 44 x 44 px;
- error bisnis backend tampil dekat konteks aksi, bukan hanya pesan generik.

Jangan:

- mengubah aturan checkout, return, reservation, visit, denda, idempotency, atau kontrak API;
- menghapus fallback input manual scanner;
- mengubah urutan bisnis peminjaman dan pengembalian;
- membuat animasi yang memperlambat petugas;
- menambah abstraksi besar sebelum satu slice terbukti bekerja.

Implementasikan bertahap:

1. benahi focus, tabs, dan layout responsive;
2. benahi panel scan dan receipt;
3. benahi tabel reservasi/denda dan state kosong;
4. ganti prompt native dengan dialog/form aksesibel;
5. lokalkan status dan rapikan feedback.

Setelah setiap slice, jalankan test yang relevan. Setelah selesai penuh, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, keyboard-only pass, dan cek console browser.
```

## Prompt: Manajemen member

Route: `/dashboard/members`

File utama: `frontend/src/app/features/members/pages/member-management-page/member-management-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman manajemen member berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/members/pages/member-management-page/member-management-page.ts;
- MemberService/data-access yang sudah ada.

Scope hanya halaman member dan komponen khusus member.

Karakter halaman:

- digunakan petugas untuk mencari, membuat, mengubah, dan melihat data siswa/non-siswa;
- field penting meliputi NIS, NISN, kelas, rombel, kartu pelajar, kartu perpustakaan, status aktif, dan kode member;
- tabel harus cepat dipindai oleh petugas.

Target:

- form member memiliki label, required marker, helper, error per field, error summary, dan focus ke field invalid pertama;
- field siswa dan non-siswa dibedakan jelas tanpa menyembunyikan data penting;
- classId dan studyGroupId tidak terasa sebagai ID internal; gunakan kontrol yang lebih mudah bila data/API yang ada memungkinkan;
- search dan filter usable pada 320 px tanpa overflow;
- tabel member punya caption/konteks, header scope, empty/loading/error state, dan aksi konsisten;
- status aktif/nonaktif tampil sebagai badge semantic Bahasa Indonesia;
- tombol Ubah dan aksi lain memenuhi target sentuh minimal;
- tidak ada informasi nomor penting yang terpotong tanpa fallback wrap/truncate yang jelas.

Jangan:

- mengubah constraint bisnis NIS, NISN, kartu pelajar, kartu perpustakaan, atau kode member;
- mempercayai validasi frontend sebagai satu-satunya sumber kebenaran;
- mengubah kontrak API member;
- membuat dummy master data.

Setelah selesai, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, cek console, dan uji keyboard untuk search, form, submit invalid, dan tombol edit.
```

## Prompt: Inventaris buku dan eksemplar

Route: `/dashboard/inventory`

File utama: `frontend/src/app/features/inventory/pages/inventory-page/inventory-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman judul buku dan eksemplar berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/inventory/pages/inventory-page/inventory-page.ts;
- data-access inventory dan master data yang sudah tersedia.

Scope hanya halaman inventory dan komponen khusus inventory.

Karakter halaman:

- digunakan untuk menambah judul buku dan eksemplar;
- inventory_code adalah identitas fisik penting dan harus sama dengan isi barcode/QR;
- petugas perlu membedakan data judul, data eksemplar, kondisi, status, rak, kategori, penerbit, dan pengarang.

Target:

- layout dua form tidak overflow di mobile dan tetap efisien di desktop;
- form judul dan form eksemplar memiliki heading, deskripsi singkat, grouping field, helper, error per field, dan focus-first-error;
- input ID internal diganti atau dibantu dengan label manusia/autocomplete/select bila data yang ada memungkinkan;
- inventory_code diberi treatment data/mono dan helper yang jelas;
- status eksemplar dan kondisi memakai label Bahasa Indonesia;
- saving state tidak mengunci form yang tidak sedang diproses bila bisa dipisahkan tanpa mengubah business logic;
- success dan error memberi informasi aksi yang baru terjadi.

Jangan:

- mengubah payload barcode/QR atau mengganti inventory_code dengan ID internal;
- mengubah kontrak API inventory;
- mengubah aturan status eksemplar;
- membuat master data palsu.

Setelah selesai, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, cek console, dan uji submit invalid pada kedua form.
```

## Prompt: Master data

Route: `/dashboard/master-data`

File utama: `frontend/src/app/features/master-data/pages/master-data-page/master-data-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman master data berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/master-data/pages/master-data-page/master-data-page.ts;
- data-access master data yang sudah ada.

Scope hanya halaman master data dan komponen khusus master data.

Karakter halaman:

- halaman mengelola kategori, rak, penerbit, pengarang, kelas, rombel, dan data referensi lain;
- form berubah berdasarkan jenis master data;
- tabel dan aksi edit/hapus harus sangat jelas karena data bisa dipakai oleh fitur lain.

Target:

- pilihan jenis master data mudah dipahami dan tidak merusak fokus saat form berubah;
- form dinamis memiliki label, helper, required marker, error per field, dan focus-first-error;
- tabel memakai wrapper responsive, caption, header scope, empty/loading/error state;
- aksi Hapus memakai danger treatment dan dialog konfirmasi aksesibel yang menjelaskan objek serta dampak;
- tombol Ubah dan Hapus tidak terlalu dekat dan memenuhi target sentuh;
- pesan data masih digunakan tampil jelas dan memberi langkah berikutnya.

Jangan:

- mengubah kontrak API master data;
- menghapus data tanpa konfirmasi;
- mengganti confirm native dengan dialog yang tidak punya focus trap, Escape, dan focus return;
- membuat abstraction form builder besar bila local component cukup.

Setelah selesai, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, cek console, dan uji keyboard untuk ganti jenis, submit invalid, edit, dan hapus.
```

## Prompt: Import data

Route: `/dashboard/imports`

File utama: `frontend/src/app/features/imports/pages/import-page/import-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman import data berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/imports/pages/import-page/import-page.ts;
- data-access import yang sudah ada.

Scope hanya halaman import dan komponen khusus import.

Karakter halaman:

- digunakan untuk mengunduh template dan mengupload file member atau buku;
- import harus menjelaskan berhasil/gagal dan menyediakan CSV error;
- petugas perlu melihat riwayat import dengan cepat.

Target:

- dua jenis import memiliki kartu/panel konsisten dengan aksi jelas: unduh template, pilih file, import;
- tombol Import disabled bila file belum dipilih dan memiliki helper kenapa belum bisa diklik;
- tampilkan nama file, ukuran, tipe, dan state upload per jenis import;
- loading, success, error, empty history, dan partial failure state tersedia;
- tabel riwayat memiliki caption, header scope, waktu import, status Bahasa Indonesia, jumlah berhasil/gagal, dan aksi CSV error yang jelas;
- status job memakai badge semantic dan tidak hanya warna;
- layout mobile tetap usable untuk file input dan tabel riwayat.

Jangan:

- mengubah validasi backend import, format template, atau kontrak API;
- membuang informasi error row;
- membuat dummy riwayat import;
- menyembunyikan kegagalan sebagian baris sebagai sukses penuh.

Setelah selesai, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, cek console, dan uji state tanpa file, file dipilih, upload gagal, history kosong, serta CSV error.
```

## Prompt: Pengelolaan koleksi digital ------------------------------------->>>>

Route: `/dashboard/digital-library`

File utama: `frontend/src/app/features/digital-library/pages/digital-management-page/digital-management-page.ts`

```text
Gunakan $frontend-design, $ui-ux-pro-max, dan $incremental-implementation.

Perbaiki UI dan UX halaman pengelolaan koleksi digital berdasarkan:

- docs/ui-ux-audit.md;
- docs/design-system.md;
- komponen global yang sudah diperbaiki;
- file frontend/src/app/features/digital-library/pages/digital-management-page/digital-management-page.ts;
- data-access digital library yang sudah ada.

Scope hanya halaman manajemen koleksi digital dan komponen khususnya.

Karakter halaman:

- digunakan staf untuk tambah, edit, publish/draft, upload file utama, upload cover, dan hapus koleksi digital;
- file utama bersifat private dan akses penuh harus tetap lewat backend/signed URL;
- halaman berisi form besar dan tabel daftar koleksi.

Target:

- form koleksi digital memiliki grouping jelas: metadata, media, akses, file, dan publikasi;
- validasi tampil per field dengan helper MIME/ukuran dekat input file;
- focus pindah ke error pertama saat submit invalid;
- status Published/Draft dan media type dilokalkan ke Bahasa Indonesia;
- tabel daftar koleksi responsif, punya caption, header scope, empty/loading/error state, dan action target minimal 44 x 44 px;
- delete memakai dialog aksesibel yang menyebut judul koleksi dan dampak file;
- edit state jelas dan scroll/focus ke form menghormati reduced motion;
- cover/file preview tidak menyebabkan layout shift.

Jangan:

- mengubah aturan private storage, signed URL, upload authorization, atau kontrak API;
- membuat bucket public atau menaruh secret di frontend;
- memakai confirm native untuk delete;
- mengubah struktur data media.

Setelah selesai, jalankan lint, test, typecheck, build, inspeksi browser desktop/tablet/mobile, cek console, dan uji keyboard untuk form, file input, edit, delete, loading, empty, dan error.
```

## Prompt: Laporan

Route: `/dashboard/reports`

File utama: `frontend/src/app/features/reports/pages/reports-page/reports-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX halaman laporan dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan laporan / dashboard / filter / tabel / export dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, table, form, badge, feedback, dan accessibility dari `docs/design-system.md`;
- file utama halaman laporan;
- data-access/model reports yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- digunakan untuk dashboard laporan, inventaris, transaksi, denda, keterlambatan, koleksi digital, dan export;
- filter periode dan jenis report penting untuk akreditasi;
- tabel bisa lebar dan padat.

Target desain dan UX:

- filter laporan mudah dipahami, tidak terlalu padat, dan dapat dipakai di mobile;
- state filter penting tersimpan di URL bila aman dan tidak memicu request loop;
- tabel laporan memiliki caption, header scope, sticky/scroll behavior yang jelas, dan alternatif responsive tanpa nested scroll membingungkan;
- angka, tanggal, uang, dan persentase memakai format lokal Indonesia dan tabular nums;
- enum status dilokalkan ke badge semantic;
- loading export terlihat pada tombol spesifik, bukan hanya disabled;
- empty/no-result/error state menjelaskan periode dan filter yang sedang aktif;
- konfigurasi identitas sekolah memiliki validasi dan feedback jelas.

Batasan keras:

- jangan mengubah perhitungan laporan, sumber data transaksi, export API, atau role access;
- jangan menyembunyikan kolom penting tanpa strategi responsive;
- jangan membuat report dummy;
- jangan membuat scroll horizontal page-level.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji keyboard untuk filter, no-result, export PDF/Excel bila environment mendukung, dan navigasi tabel.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Portal anggota

Route: `/dashboard/member`

File utama: `frontend/src/app/features/circulation/pages/member-portal-page/member-portal-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX portal anggota dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan portal anggota / reservasi / tabel / status dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, form, table, badge, feedback, dan accessibility dari `docs/design-system.md`;
- file utama portal anggota;
- data-access/model circulation/reservation yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- digunakan member untuk melihat pinjaman aktif, jatuh tempo, reservasi, denda, pembayaran, dan riwayat;
- reservasi harus terasa seperti alur katalog, bukan input ID internal;
- user utama bisa siswa, jadi copy harus jelas dan tidak teknis.

Target desain dan UX:

- ringkasan pinjaman aktif, jatuh tempo, dan denda mudah dipindai;
- reservasi tidak meminta ID internal bila ada jalur dari katalog atau data buku yang dapat dipakai;
- form reservasi memiliki helper, validasi, error, dan feedback sukses/gagal;
- cancel reservasi memakai konfirmasi/undo yang sesuai dan error terlihat;
- tabel reservasi, denda, dan riwayat punya caption, header scope, empty/loading/error state, dan layout mobile usable;
- status reservasi, loan, dan pembayaran memakai label Bahasa Indonesia;
- action target minimal 44 x 44 px.

Batasan keras:

- jangan mengubah aturan reservasi, denda, atau sumber data member;
- jangan membuat member bisa melakukan aksi yang bukan haknya;
- jangan membuat dummy pinjaman/reservasi;
- jangan menyembunyikan error cancel/reserve.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji keyboard untuk refresh, reserve, cancel, dan tabel.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Katalog publik

Route: `/katalog`

File utama: `frontend/src/app/features/catalog/pages/catalog-page/catalog-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX katalog publik dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan katalog publik / search / card / reservasi dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, card, form, badge, feedback, dan accessibility dari `docs/design-system.md`;
- file utama katalog publik;
- data-access/model catalog dan reservation yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- digunakan guest/member untuk mencari buku fisik;
- member dapat melakukan reservasi bila role dan backend mengizinkan;
- katalog harus menjelaskan ketersediaan tanpa membuka data internal eksemplar.

Target desain dan UX:

- search terasa sebagai kontrol utama, usable pada mobile, dan dapat disimpan di URL query;
- hasil katalog memakai card konsisten dengan judul, metadata, stok, dan aksi jelas;
- guest mendapat CTA login atau penjelasan saat reservasi membutuhkan akun;
- reservasi memiliki loading per item, success, error lokal, dan double-submit prevention;
- loading awal memakai skeleton/reserved space yang tidak membuat layout shift;
- empty/no-result state menjelaskan query yang dipakai dan cara memperbaiki;
- stok/status memakai badge semantic Bahasa Indonesia.

Batasan keras:

- jangan mengekspos UUID/copy internal di UI publik;
- jangan mengubah kontrak API katalog/reservasi;
- jangan membuat dummy buku;
- jangan mengubah aturan guest tidak dapat meminjam/reservasi bila backend menolak.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji search, no-result, guest CTA, reservasi sukses/gagal, serta back/refresh query.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Katalog koleksi digital

Route: `/koleksi-digital`

File utama: `frontend/src/app/features/digital-library/pages/digital-catalog-page/digital-catalog-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX katalog koleksi digital dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan katalog digital / filter / cover / card dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, card, image, badge, feedback, dan accessibility dari `docs/design-system.md`;
- file utama katalog koleksi digital;
- data-access/model digital library yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- digunakan publik untuk mencari PDF/e-book, modul, dan video;
- metadata published boleh tampil publik, tetapi akses penuh file membutuhkan login/backend;
- cover image bisa berasal dari storage.

Target desain dan UX:

- filter search, media type, dan sort mudah digunakan serta dapat disimpan di URL query;
- card koleksi punya cover dengan aspect ratio stabil, dimensi/lazy loading, judul link jelas, metadata, dan badge media;
- seluruh target navigasi cukup besar untuk touch tanpa membuat card multi-aksi membingungkan;
- loading, empty, error, no-result, dan retry state tersedia;
- media type dan akses download memakai label Bahasa Indonesia;
- layout mobile tidak overflow dan cover tidak menyebabkan CLS.

Batasan keras:

- jangan mengekspos private file URL;
- jangan mengubah aturan published/unpublished atau download;
- jangan membuat dummy koleksi;
- jangan menggunakan image tanpa reservasi dimensi/aspect ratio.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji filter, sort, no-result, gambar cover, dan navigasi ke detail.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Detail koleksi digital

Route: `/koleksi-digital/:slug`

File utama: `frontend/src/app/features/digital-library/pages/digital-detail-page/digital-detail-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX detail koleksi digital dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan detail koleksi digital / media viewer / akses file dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, media, button, feedback, dan accessibility dari `docs/design-system.md`;
- file utama detail koleksi digital;
- data-access/model digital library yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- menampilkan detail metadata, cover, akses baca/play, download bila diizinkan, dan viewer media;
- akses file memakai backend signed URL;
- user yang belum login perlu memahami batas akses.

Target desain dan UX:

- metadata utama jelas: judul, media type, penulis, penerbit, tahun, ukuran/durasi, status download;
- cover memiliki dimensi/aspect ratio stabil;
- aksi Buka koleksi dan Unduh punya loading/error state terpisah;
- viewer media responsif untuk PDF/video dan punya fallback yang jelas;
- guest atau user belum login mendapat CTA login yang tidak membingungkan;
- error akses file tampil dekat aksi terkait;
- label enum media dilokalkan ke Bahasa Indonesia;
- tombol kembali dan breadcrumb/arah navigasi jelas bila diperlukan.

Batasan keras:

- jangan mengubah signed URL flow, authorization, atau aturan download;
- jangan memakai sanitizer untuk URL yang tidak berasal dari API aman yang sudah ada;
- jangan membuat file private menjadi public;
- jangan mengubah kontrak API detail.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji loading, not found, guest, buka file, download, dan viewer.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Login

Route: `/masuk`

File utama: `frontend/src/app/features/auth/pages/login-page/login-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX halaman login dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan login / auth error / form dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, form, button, feedback, dan accessibility dari `docs/design-system.md`;
- file utama login;
- AuthService/auth guard/data-access yang dipakai langsung halaman ini.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global yang sudah dipakai halaman ini.

Karakter halaman:

- pintu masuk untuk master_admin, head_librarian, librarian, member, dan guest yang memiliki akun;
- harus aman, jelas, dan cepat digunakan di komputer perpustakaan;
- sudah memakai reactive form.

Target desain dan UX:

- form login memakai container reading, card/form global, label, helper, error per field, dan error summary yang dapat diakses;
- submit invalid memindahkan fokus ke field invalid pertama;
- error autentikasi terhubung ke form dan mudah dipahami;
- tombol submit memiliki loading state visual tanpa layout shift;
- tambahkan kontrol tampil/sembunyikan kata sandi bila bisa dilakukan tanpa dependency baru;
- autocomplete email/password benar;
- mobile layout nyaman tanpa zoom/overflow.

Batasan keras:

- jangan mengubah alur Supabase Auth, AuthService, token handling, role redirect, atau guard;
- jangan menampilkan detail error sensitif;
- jangan membuat login demo/hardcoded credential;
- jangan menyimpan password di state yang tidak diperlukan.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji keyboard, submit invalid, login gagal, loading, dan redirect sukses bila environment mendukung.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Beranda publik

Route: `/`

File utama: `frontend/src/app/features/public/pages/home-page/home-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX beranda publik dengan scope hanya halaman ini dan komponen khususnya.

Baca konteks minimal:
- bagian relevan beranda / public layout / copy publik dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, layout publik, button, feedback, dan accessibility dari `docs/design-system.md`;
- file utama beranda;
- public layout yang sudah memakai brand SDI.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global/layout publik yang sudah dipakai halaman ini.

Karakter halaman:

- first impression untuk siswa, guru, orang tua, tamu, dan warga sekolah;
- tugas utama: mengarahkan pengguna ke katalog, koleksi digital, atau login;
- harus terasa seperti perpustakaan sekolah digital, bukan landing SaaS generik.

Target desain dan UX:

- hero memakai brand SDI Digital Library sebagai sinyal first viewport yang jelas;
- copy mencerminkan fitur yang sudah ada, bukan status fondasi tahap awal;
- CTA utama jelas menuju katalog/koleksi digital/masuk sesuai kebutuhan;
- section ringkas menjelaskan layanan buku fisik, koleksi digital, dan akses anggota;
- visual mengikuti design system, termasuk garis indeks katalog sebagai elemen khas yang bermakna;
- layout mobile tidak overflow dan tetap menunjukkan arah ke section berikutnya;
- footer/public copy relevan dengan sekolah dan layanan.

Batasan keras:

- jangan membuat klaim fitur yang belum tersedia;
- jangan menambah dekorasi berat, gradient berlebihan, glassmorphism, atau animasi yang tidak perlu;
- jangan mengubah route publik;
- jangan membuat dummy statistik.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji navigasi CTA.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```

## Prompt: Forbidden dan not found

Route: `/dashboard/forbidden` dan `/**`

File utama:

- `frontend/src/app/features/auth/pages/forbidden-page/forbidden-page.ts`
- `frontend/src/app/features/public/pages/not-found-page/not-found-page.ts`

```text
Gunakan $ui-ux-pro-max dan $incremental-implementation.
Gunakan $frontend-design ringan untuk arahan visual, tanpa eksplorasi desain panjang.

Perbaiki UI/UX halaman akses ditolak dan tidak ditemukan dengan scope hanya dua halaman ini.

Baca konteks minimal:
- bagian relevan forbidden / not found / route error dari `docs/ui-ux-audit.md`;
- token, spacing, warna, typography, content state, button, feedback, dan accessibility dari `docs/design-system.md`;
- file forbidden page dan not-found page;
- route/guard yang dipakai langsung bila perlu memahami konteks CTA.

Jangan eksplor seluruh frontend kecuali diperlukan untuk memahami komponen global/layout yang sudah dipakai dua halaman ini.

Karakter halaman:

- forbidden menjelaskan pengguna tidak memiliki izin berdasarkan role;
- not-found membantu pengguna kembali ke jalur yang benar;
- keduanya harus singkat, tidak menyalahkan user, dan memberi aksi berikutnya.

Target desain dan UX:

- heading, pesan, dan CTA jelas;
- CTA menyesuaikan konteks sebisa mungkin: dashboard sesuai role, katalog, beranda, atau login;
- layout menggunakan page/card/content-state global;
- keyboard focus dan screen reader announcement benar;
- mobile layout ringkas tanpa elemen terpotong.

Batasan keras:

- jangan mengubah role guard atau redirect logic tanpa alasan kuat;
- jangan membuka informasi role/data yang tidak perlu;
- jangan membuat copy terlalu teknis.

Proses hemat token:
1. Ringkas temuan maksimal 6 bullet sebelum edit.
2. Buat rencana maksimal 5 langkah.
3. Implementasikan perubahan kecil dan terarah.
4. Jangan tampilkan diff besar; cukup sebut file yang berubah.
5. Ringkas output command panjang.

Verifikasi:
- jalankan command yang tersedia dari `package.json`, prioritaskan lint, typecheck, test terkait, dan build;
- inspeksi browser minimal desktop dan mobile;
- cek console;
- uji navigasi dari route tidak ditemukan dan akses role yang ditolak bila environment mendukung.

Laporan akhir singkat: perubahan utama, file penting, command dan hasil, serta risiko/verifikasi yang belum selesai.
```
