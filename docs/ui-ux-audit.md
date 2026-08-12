# Audit UI/UX SDI Digital Library

Tanggal audit awal: 21 Juli 2026  
Pembaruan setelah design system: 21 Juli 2026  
Cakupan: frontend Angular, route publik dan dashboard, komponen bersama, SCSS global, state interaksi, responsive, accessibility, dan UX operasional.

Dokumen acuan visual saat ini: `docs/design-system.md`. Status temuan pada audit ini memakai **Open**, **Partially addressed**, atau **Addressed** agar hasil audit awal tetap dapat ditelusuri setelah fondasi design system diterapkan.

## Metode dan batas verifikasi

Audit dilakukan terhadap seluruh source UI di `frontend/src`, konfigurasi Angular, routing, template inline, style inline, style global, komponen bersama, serta aplikasi development yang dijalankan dari repository ini.

- Frontend berhasil dikompilasi oleh development server dan tersedia di port `4200`; backend berhasil berjalan di port `3000`.
- Pemeriksaan browser melalui Chrome berhasil tersambung, tetapi navigasi otomatis ke `http://localhost:4200` ditolak oleh kebijakan keamanan browser lingkungan audit. Kebijakan tersebut melarang penggunaan jalur browser alternatif sebagai workaround.
- Karena itu, temuan visual dan responsive di bawah yang menyangkut hasil render diberi dasar deterministik dari CSS/template (misalnya perhitungan lebar minimum dan cascade), bukan klaim hasil screenshot.
- Audit viewport aktual, layout shift runtime, urutan fokus runtime, dan AXE masih harus dijalankan ulang ketika URL aplikasi dapat diakses oleh browser audit.
- Pedoman pembanding: Web Interface Guidelines terbaru dari Vercel, WCAG AA, database aturan `ui-ux-pro-max`, dan panduan Angular pada `frontend/AGENTS.md`.
- Pembaruan ini memeriksa ulang audit terhadap `docs/design-system.md`, token aktual di `frontend/src/styles.scss`, font di `frontend/src/index.html`, serta adopsi token awal pada public dan dashboard layout. Pembaruan dokumentasi ini bukan audit browser baru, sehingga masalah per halaman yang belum disentuh tetap berstatus **Open**.

## 1. Ringkasan kondisi saat ini

### Stack dan sistem UI

- Angular `22.0.x`, standalone components, TypeScript `~6.0.2`, RxJS `~7.8`, Reactive Forms, Angular Router, dan SSR; bukti: `frontend/package.json` dan `frontend/angular.json`.
- Route fitur sudah lazy-loaded dengan `loadComponent`; bukti: `frontend/src/app/app.routes.ts:10-167`. Ini fondasi performa yang baik.
- Tidak ada Tailwind, Angular Material, CDK, Bootstrap, atau library UI lain. Tidak ditemukan `tailwind.config.*`; semua tampilan dibangun dengan SCSS global dan `styles` inline komponen.
- Fondasi token global kini tersedia untuk warna semantic, tipografi, font weight, spacing, container, border/radius, elevation, icon, control, dan motion; bukti: `frontend/src/styles.scss:1-94`. Primitive `.button`, `.button--secondary`, `.page`, `.eyebrow`, heading, focus treatment, disabled state, dan reduced motion memakai token tersebut di `frontend/src/styles.scss:122-209`.
- Hanya ada dua komponen UI bersama: `NotificationBanner` dan `EmptyState`. `EmptyState` tidak digunakan oleh halaman mana pun; bukti: `frontend/src/app/shared/components/empty-state/empty-state.ts:1-32` dan tidak ada pemakaian selector `sdi-empty-state`.
- Arah visual resmi sekarang adalah **digital indigo** untuk brand dan aksi utama, **hijau** khusus success/ketersediaan, Lora untuk heading, serta Raleway untuk body/UI; bukti: `docs/design-system.md`, `frontend/src/styles.scss:3-43`, dan `frontend/src/index.html:8-13`. Nilai hijau dan hex lama masih tersebar di style inline halaman, sehingga migrasi visual belum selesai.
- Public header dan dashboard sidebar sudah mengadopsi token brand indigo; bukti: `public-layout.ts:46-49` dan `dashboard-layout.ts:110-150`.

### Kondisi keseluruhan

Struktur informasi dasar sudah dapat dipahami: halaman publik memiliki header/footer, dashboard memiliki sidebar per role, form memakai label, route penting memiliki `h1`, dan loading/error sederhana sudah tersedia pada sebagian halaman. Skip link juga sudah ada pada kedua layout.

Namun, UI belum memenuhi Definition of Done untuk aksesibilitas dan penggunaan lintas perangkat. Kegagalan hover tombol sekunder sudah ditangani dan focus treatment global sudah diperbaiki, tetapi halaman sirkulasi masih mengoverride focus ring dengan warna lama. Layout dashboard mobile belum adaptif; beberapa grid pasti overflow pada viewport 320 px; pola form dan tabel masih berulang tanpa primitive bersama; serta alur member dan sirkulasi masih mengekspos ID internal atau menggunakan dialog browser native. Design system saat ini adalah fondasi, belum berarti seluruh halaman sudah termigrasi.

## 2. Masalah kritis

Tidak ada masalah global berstatus **Critical/Open** setelah penerapan token dasar. Dua temuan kritis audit awal dipertahankan berikut ini sebagai catatan status dan bukti regresi.

### C-01 — Teks tombol sekunder menghilang saat hover — **Addressed**

- Kondisi audit awal: `.button:hover` memakai background hijau gelap tanpa mengganti teks variant secondary, menghasilkan rasio sekitar **1,18:1**.
- Kondisi sekarang: selector hover primary dan secondary dipisahkan serta mengecualikan disabled state; secondary memakai background `--color-action-secondary-hover` dan teks `--color-brand-950`; bukti: `frontend/src/styles.scss:148-170`.
- Risiko tersisa: tombol lokal yang tidak memakai class `.button` belum otomatis mengikuti kontrak ini dan perlu diaudit saat migrasi per halaman.

### C-02 — Focus indicator global tidak memiliki kontras minimum — **Partially addressed**

- Kondisi audit awal: outline kuning `#f4b942` hanya sekitar **1,64–1,77:1** terhadap surface terang.
- Kondisi sekarang: focus treatment global memakai ring dua warna—outline surface dan ring luar indigo—melalui `--color-focus-inner` serta `--color-focus-outer`; bukti: `frontend/src/styles.scss:31-32` dan `frontend/src/styles.scss:122-126`.
- Temuan tersisa (**High/Open**): `operations-page.ts:386-391` masih mendefinisikan `button/input/select/textarea:focus-visible` dengan outline kuning lama dan dapat mengoverride baseline global pada `/dashboard/circulation`.

## 3. Masalah per halaman

### `/` — Beranda

- **High:** navbar mobile menaruh empat link dalam `.links` selebar kontainer dengan `justify-content: space-between` tanpa `flex-wrap`; bukti: `public-layout.ts:63-67` dan breakpoint `public-layout.ts:82-91`. Pada viewport 320 px, lebar teks, gap tiga kali `1rem`, padding tombol, dan kontainer efektif sekitar 288 px tidak dapat muat tanpa overflow atau kompresi buruk.
- **Medium:** isi hero masih menyatakan “Fondasi tahap pertama” dan fitur akan disambungkan pada tahap berikutnya, padahal route transaksi dan koleksi sudah ada; bukti: `home-page.ts:20-23`. Ini merusak kepercayaan dan membuat status produk membingungkan.
- **Medium:** footer berisi copy teknis “Fondasi aplikasi perpustakaan sekolah”, bukan informasi sekolah, kontak, bantuan, atau kebijakan akses; bukti: `public-layout.ts:31`.
- **Low:** hero masih memakai shadow hardcoded alih-alih `--shadow-sm/md/lg` yang sekarang tersedia; bukti: `home-page.ts:55-60` dibanding `frontend/src/styles.scss:79-82`.

### `/katalog` — Katalog publik

- **High:** anggota harus berada dalam role `member` agar tombol reservasi muncul, tetapi tidak ada CTA login atau penjelasan bagi pengunjung/guest di kartu buku; bukti: `catalog-page.ts:43-52`.
- **High:** state pencarian tidak disimpan di URL. Refresh/back/share menghapus query; bukti: `catalog-page.ts:105-136` hanya memakai `FormControl` lokal dan request API.
- **Medium:** saat reservasi gagal, halaman hanya menghapus `reservingId`; tidak ada error lokal atau recovery path; bukti: `catalog-page.ts:117-123`.
- **Medium:** loading hanya berupa satu baris teks, grid lama tidak dibersihkan, dan tidak ada skeleton/reserved space; bukti: `catalog-page.ts:25-31` dan `catalog-page.ts:125-136`.
- **Medium:** placeholder tidak berakhiran elipsis dan input tidak memiliki `name`/autocomplete yang eksplisit; bukti: `catalog-page.ts:15-23`.

### `/koleksi-digital` — Katalog digital

- **High:** gambar cover menggunakan `<img [src]>` tanpa `width`, `height`, `loading`, `sizes/srcset`, atau `NgOptimizedImage`; bukti: `digital-catalog-page.ts:54-56`. Ini melanggar aturan lokal `frontend/AGENTS.md`, meningkatkan risiko CLS dan pemborosan bandwidth.
- **High:** filter pencarian, media, dan sort tidak direfleksikan ke query parameter URL; bukti: `digital-catalog-page.ts:149-172`.
- **Medium:** `article` hanya membuat judul sebagai link; gambar dan seluruh kartu tidak dapat diklik, sehingga target navigasi relatif kecil pada touch screen; bukti: `digital-catalog-page.ts:53-70`.
- **Medium:** media badge memakai `0.78rem` (sekitar 12,5 px), terlalu kecil untuk teks fungsional mobile; bukti: `digital-catalog-page.ts:123-127`.

### `/koleksi-digital/:slug` — Detail koleksi digital

- **High:** cover kembali tidak memiliki dimensi intrinsik, lazy loading, atau `NgOptimizedImage`; bukti: `digital-detail-page.ts:22-24`.
- **High:** tombol “Buka koleksi” dan “Unduh” berbagi satu state `opening()`. Kegagalan salah satu aksi ditampilkan sebagai error global yang dapat tetap terlihat saat retry, dan kedua tombol dinonaktifkan bersamaan; bukti: `digital-detail-page.ts:47-61`, `digital-detail-page.ts:168-199`.
- **Medium:** viewer memakai `min-height: 32rem`/`20rem` tanpa strategi rasio atau fallback mobile landscape; bukti: `digital-detail-page.ts:119-141`.
- **Medium:** label media menampilkan enum mentah `ebook/module/video`, berbeda dari label Bahasa Indonesia di katalog; bukti: `digital-detail-page.ts:26`.

### `/masuk` — Login

- **High:** setelah submit invalid, seluruh field ditandai tetapi fokus tidak dipindahkan ke field invalid pertama; bukti: `login-page.ts:136-142`.
- **Medium:** tidak ada toggle tampil/sembunyikan kata sandi; bukti: `login-page.ts:34-45`.
- **Medium:** error autentikasi ada di atas form tanpa hubungan `aria-describedby` ke form atau fokus terkelola; bukti: `login-page.ts:17-19`.
- **Medium:** disabled submit hanya mengubah opacity dan cursor; tidak ada spinner visual selain perubahan teks; bukti: `login-page.ts:47-49`, `login-page.ts:94-97`.

### `/dashboard/admin`, `/dashboard/monitoring`, `/dashboard/operasional`

- **High:** grafik adalah kumpulan `div` visual tanpa nama grafik, deskripsi, tabel alternatif, axis label lengkap, atau semantics untuk screen reader; bukti: `dashboard-page.ts:40-73` dan `dashboard-page.ts:127-149`.
- **High:** tanggal pada grafik dipotong dengan `.slice(5)` menjadi bentuk numerik tanpa tahun/locale dan elemen `<time>` tidak memiliki `datetime`; bukti: `dashboard-page.ts:46-69`.
- **Medium:** filter periode tidak tersimpan di URL; bukti: `dashboard-page.ts:170-193`.
- **Medium:** angka KPI dan grafik belum menggunakan `font-variant-numeric: tabular-nums`; bukti: `dashboard-page.ts:94-149`.
- **Medium:** teks grafik `0.78rem` terlalu kecil untuk label data operasional; bukti: `dashboard-page.ts:127-134`.

### `/dashboard/members` — Member

- **High:** form hanya mencegah submit ketika invalid tanpa menampilkan error per field, required marker, `aria-invalid`, atau ringkasan error; bukti: `member-management-page.ts:28-63` dan `member-management-page.ts:203-205`.
- **High:** petugas harus memasukkan `classId` dan `studyGroupId` internal secara manual; placeholder bahkan berkata “Pilih dari master data” tetapi kontrol tetap text input; bukti: `member-management-page.ts:45-52`. Ini rawan salah, lambat, dan tidak sesuai alur petugas.
- **High:** search row berpotensi overflow pada layar 320 px: input memiliki `min-width: min(28rem, 70vw)` lalu masih ditambah tombol dan gap di dalam konten ber-padding 2rem; bukti: `member-management-page.ts:96-117`.
- **Medium:** tabel memiliki wrapper horizontal scroll, tetapi tombol “Ubah” tidak memperoleh style/touch target konsisten; bukti: `member-management-page.ts:68-93`.
- **Medium:** tidak ada loading state atau empty state terstruktur; list kosong hanya menghasilkan tabel kosong; bukti: `member-management-page.ts:68-93`, `member-management-page.ts:223-227`.

### `/dashboard/inventory` — Judul dan eksemplar

- **High:** petugas harus mengetik ID kategori, penerbit, rak, pengarang, dan judul secara manual; bukti: `inventory-page.ts:20-52`. Ini bukan pencarian operasional dan sangat rentan referensi salah.
- **High:** `.columns` menggunakan `minmax(18rem, 1fr)` di dalam section ber-padding 2rem tanpa breakpoint. Pada viewport 320 px, area konten sekitar 256 px sedangkan track minimum 288 px, sehingga overflow deterministik; bukti: `inventory-page.ts:64-70`.
- **High:** required validation gagal diam-diam tanpa field error atau focus management; bukti: `inventory-page.ts:97-119` dan `inventory-page.ts:135-137`.
- **Medium:** satu sinyal `saving()` menonaktifkan kedua form sekaligus sehingga aksi yang tidak terkait tampak terkunci; bukti: `inventory-page.ts:30`, `inventory-page.ts:51`, `inventory-page.ts:94`.

### `/dashboard/master-data` — Master data

- **High:** tabel empat kolom tidak dibungkus overflow container dan tidak punya responsive alternative; bukti: `master-data-page.ts:49-71`, `master-data-page.ts:104-114`.
- **High:** delete memakai `confirm()` native; bukti: `master-data-page.ts:201-206`. Dialog ini tidak dapat menyampaikan dependency data, dampak, atau recovery dengan konsisten.
- **High:** tombol “Hapus” tidak memiliki danger style dan berdampingan langsung dengan “Ubah”; bukti: `master-data-page.ts:64-67`.
- **Medium:** form dinamis tidak mengumumkan perubahan field saat jenis master data berubah; bukti: `master-data-page.ts:14-38`.
- **Medium:** submit invalid berhenti tanpa pesan; bukti: `master-data-page.ts:153-155`.

### `/dashboard/imports` — Import

- **High:** tombol Import aktif walaupun belum ada file; validasi baru terjadi setelah klik dan status disampaikan melalui satu pesan global; bukti: `import-page.ts:23-35`, `import-page.ts:124-129`.
- **High:** satu state `uploading()` menonaktifkan tombol Import pada kedua kartu, tetapi tidak menampilkan nama file, ukuran, progres, atau spinner per job; bukti: `import-page.ts:13-38`, `import-page.ts:113-143`.
- **Medium:** tabel riwayat tidak menampilkan waktu import, total baris, nomor/error preview, atau empty state; bukti: `import-page.ts:42-72`.
- **Medium:** status dan jenis menampilkan enum backend mentah; bukti: `import-page.ts:58-62`.

### `/dashboard/circulation` — Meja layanan

- **High:** pseudo-tabs adalah tombol biasa tanpa `role="tablist"`, `role="tab"`, `aria-selected`, hubungan ke panel, atau navigasi arrow-key; bukti: `operations-page.ts:34-40`.
- **High:** tab aktif tidak tersimpan di URL. Refresh/back/deep link selalu kembali ke peminjaman; bukti: `operations-page.ts:476-483`, `operations-page.ts:523-532`.
- **High:** approve, konversi reservasi, reject, dan pembayaran memakai `window.prompt`; bukti: `operations-page.ts:636-668`, `operations-page.ts:682-691`. Ini memutus ritme scanner/keyboard, tidak mendukung helper/error inline, dan sulit diakses.
- **High:** `.workspace` memakai `minmax(20rem, 1fr)`; pada breakpoint mobile padding konten menyisakan sekitar 288 px, lebih kecil dari track minimum 320 px, sehingga overflow pada viewport 320 px; bukti: `operations-page.ts:349-353`, `operations-page.ts:455-466`.
- **High:** `autofocus` HTML dipasang tanpa pembatasan desktop; bukti: `operations-page.ts:52-58`. Pada mobile ini dapat membuka keyboard dan menggeser layout saat halaman masuk.
- **High:** tabel reservasi/denda tidak memiliki empty state. Panel terlihat kosong tanpa menjelaskan apakah load selesai atau data memang tidak ada; bukti: `operations-page.ts:182-215`, `operations-page.ts:226-249`.
- **Medium:** semua kegagalan bisnis dipetakan ke pesan generik “Operasi gagal”; penyebab spesifik backend tidak terlihat dekat kontrol terkait; bukti: `operations-page.ts:736-749`.
- **Medium:** status/condition menampilkan istilah campuran Inggris dan Indonesia pada receipt/tabel; bukti: `operations-page.ts:166-170`, `operations-page.ts:199-209`, `operations-page.ts:240-244`.
- **Medium:** tab horizontal memakai `overflow:auto` tanpa affordance bahwa daftar dapat digeser; bukti: `operations-page.ts:323-338`.

### `/dashboard/member` — Portal anggota

- **High:** pembuatan reservasi meminta pengguna menyalin “ID judul buku” dari katalog; bukti: `member-portal-page.ts:67-79`. ID internal tidak terlihat pada katalog publik dan alur ini praktis tidak dapat diselesaikan secara natural. Reservasi seharusnya dimulai dari buku yang dipilih atau autocomplete judul.
- **High:** pembatalan reservasi dilakukan langsung tanpa konfirmasi/undo; bukti: `member-portal-page.ts:99-103`, `member-portal-page.ts:312-318`.
- **High:** error reservasi dan pembatalan tidak memberi feedback; handler error reservasi hanya mengubah `loading`, sedangkan pembatalan tidak memiliki error handler; bukti: `member-portal-page.ts:299-318`.
- **Medium:** tabel reservasi dan riwayat tidak memiliki empty state; hanya denda dan pinjaman aktif yang mendapat pesan kosong; bukti: `member-portal-page.ts:81-109`, `member-portal-page.ts:142-166`.
- **Medium:** tombol tabel kecil (`padding: 0.5rem`) tidak menjamin target 44×44 px; bukti: `member-portal-page.ts:243-248`.

### `/dashboard/digital-library` — Pengelolaan digital

- **High:** validasi form hanya memberi pesan agregat “Lengkapi field wajib...” tanpa error field, `aria-invalid`, helper MIME/ukuran dekat input, atau fokus ke error pertama; bukti: `digital-management-page.ts:23-89`, `digital-management-page.ts:293-297`.
- **High:** penghapusan memakai `confirm()` native walaupun aksi juga menghapus file utama dan cover; bukti: `digital-management-page.ts:355-360`.
- **Medium:** status “Published/Draft” dan enum media tetap berbahasa Inggris; bukti: `digital-management-page.ts:126-133`.
- **Medium:** tanggal dipotong menggunakan `.slice(0, 10)`, bukan `Intl.DateTimeFormat`; bukti: `digital-management-page.ts:133`.
- **Medium:** edit memanggil smooth scroll tanpa menghormati `prefers-reduced-motion`; bukti: `digital-management-page.ts:317-335`.
- **Medium:** tombol aksi tabel memakai padding `0.4rem`, di bawah target sentuh minimum; bukti: `digital-management-page.ts:204-207`.

### `/dashboard/reports` — Laporan

- **High:** tabel memakai nested scroll setinggi maksimal `34rem` dan semua sel `white-space: nowrap`; bukti: `reports-page.ts:208-223`. Pada mobile ini menciptakan scroll horizontal di dalam scroll vertikal dan menyulitkan orientasi.
- **High:** tabel tidak memiliki caption, `scope` pada header, sort affordance, atau alternatif card untuk mobile; bukti: `reports-page.ts:112-131`.
- **High:** filter kompleks tidak disimpan di URL sehingga konfigurasi laporan tidak dapat dibookmark/share dan back navigation tidak memulihkan state; bukti: `reports-page.ts:299-342`.
- **Medium:** label status menggunakan nilai enum mentah `unpaid/partial/paid`, `damaged/lost`, dan `view/play/download`; bukti: `reports-page.ts:368-378`.
- **Medium:** form identitas sekolah tidak memiliki error per field atau fokus error; bukti: `reports-page.ts:143-159`, `reports-page.ts:404-405`.
- **Medium:** loading export tidak mengubah label tombol, hanya disabled; bukti: `reports-page.ts:81-97`, `reports-page.ts:343-366`.

### `/dashboard/forbidden` dan route `**`

- **Low:** halaman memberi jalan keluar yang jelas dan heading benar; bukti: `forbidden-page.ts:8-13`, `not-found-page.ts:8-13`.
- **Medium:** tidak ada bantuan kontekstual atau link alternatif ke katalog/beranda sesuai role; pengguna hanya mendapat satu tombol generik.

## 4. Masalah komponen global

### Tombol

- **Addressed:** cascade C-01 pada `.button--secondary` sudah diperbaiki; bukti: `frontend/src/styles.scss:148-170`.
- `.button` global memiliki min-height 44 px, tetapi tombol lokal tabel/tab mengabaikan class tersebut dan memakai padding kecil; contoh: `member-portal-page.ts:243-248`, `digital-management-page.ts:204-207`, `operations-page.ts:329-339`.
- Tidak ada variant global untuk danger, icon button, loading spinner, compact desktop dengan hit-area tetap, atau button group.
- **Addressed untuk `.button`:** disabled dan `aria-disabled` kini memakai opacity serta cursor konsisten; bukti: `frontend/src/styles.scss:173-177`. Tombol lokal yang tidak memakai `.button` masih memiliki perilaku berbeda-beda.

### Form

- Style input/select/textarea diduplikasi dengan border `#9caf9f`, `#9dafa4`, atau `#aebdb4`, radius `0.4/0.45/0.5rem`, dan padding `0.65/0.7/0.72/0.75rem`.
- Border input `#9caf9f` terhadap putih hanya sekitar 2,32:1, di bawah 3:1 untuk boundary komponen; bukti utama: `login-page.ts:80-89`.
- Token `--color-border-strong`, `--radius-md`, dan `--control-height` sudah tersedia sebagai target migrasi, tetapi belum diterapkan ke primitive form global; bukti: `frontend/src/styles.scss:20-21`, `frontend/src/styles.scss:75`, dan `frontend/src/styles.scss:87`.
- Mayoritas form tidak memiliki helper, required marker, field error, error summary, dan focus-first-error. Login adalah satu-satunya implementasi yang cukup dekat dengan pola lengkap.
- Banyak input tidak memiliki `name`, `autocomplete`, `inputmode`, atau `spellcheck` eksplisit; contoh: katalog `catalog-page.ts:15-23` dan pengelolaan member `member-management-page.ts:28-55`.

### Tabel

- Markup dan style tabel diulang di member, master data, import, circulation, portal member, digital management, dan report.
- Tidak ada shared data-table contract untuk caption, header scope, loading row, empty row, error row, sticky header, responsive behavior, pagination, dan action column.
- Semua list dapat tumbuh tetapi frontend tidak menyediakan pagination/virtualization; service list tertentu memang mengirim limit, tetapi UX paging tidak terlihat di page component.

### Notification dan empty state

- `NotificationBanner` selalu berjudul “Terjadi kendala” dan memakai `role="alert"`; bukti: `notification-banner.ts:7-18`. Tidak dapat dipakai untuk success/info dan interruptive announcement dapat berlebihan.
- Tombol tutup berisi teks “Tutup” sekaligus `aria-label`, tetapi target sentuh tidak memiliki min-height/width; bukti: `notification-banner.ts:35-42`.
- `EmptyState` menggunakan ID statis `empty-title`; bila lebih dari satu instance dirender, ID duplikat; bukti: `empty-state.ts:5-9`.
- `EmptyState` tidak digunakan sehingga empty state aktual masih berupa `<p>` yang tidak konsisten.

### Layout dan navigasi

- Public dan dashboard layout menduplikasi skip-link style; bukti: `public-layout.ts:34-45` dan `dashboard-layout.ts:93-104`.
- Kedua shell sudah memakai token indigo/surface untuk header, sidebar, footer, identity text, dan navigation state; bukti: `public-layout.ts:40-49`, `public-layout.ts:76-80`, serta `dashboard-layout.ts:99-116`, `dashboard-layout.ts:128-150`. Adopsi ini belum mencakup style halaman fitur.
- Dashboard sidebar tidak sticky pada desktop dan tidak menjadi drawer/top navigation pada mobile; bukti: `dashboard-layout.ts:105-168`.
- Setelah route berubah, `<main tabindex="-1">` tersedia tetapi tidak ada kode yang memindahkan fokus ke main/heading; bukti: `public-layout.ts:30`, `dashboard-layout.ts:88`.
- Beberapa menu role menuju route yang sama dengan query `bagian`, tetapi halaman dashboard tidak membaca query tersebut untuk memfokuskan/menampilkan bagian. Contoh “Pengguna & role”, “Konfigurasi”, dan “Audit” semuanya ke `/dashboard/admin`; bukti: `dashboard-layout.ts:15-27` dibanding `dashboard-page.ts:164-258`.

## 5. Masalah responsive

### Breakpoint dan container

- Breakpoint implementasi masih tersebar: `34rem`, `36rem`, `40rem`, `42rem`, `48rem`, dan `55rem`. Design system sudah menetapkan baseline `36/48/64/80rem`, tetapi media query halaman belum dimigrasikan; bukti: `docs/design-system.md` bagian 7.
- `.page` sekarang memakai `--container-content`, `--page-gutter`, dan `--space-12`; bukti: `frontend/src/styles.scss:179-183`. Halaman dashboard lain masih memakai padding hardcoded 2rem atau 1rem pada mobile.
- Tidak ada pengujian orientasi landscape, safe-area inset, atau strategi viewport kecil di bawah 320 px.

### Overflow deterministik

- Navbar publik pada 320 px: `public-layout.ts:63-91`.
- Grid inventory minimum 18rem di konten sekitar 16rem: `inventory-page.ts:64-70`.
- Workspace circulation minimum 20rem di konten sekitar 18rem: `operations-page.ts:349-353`, `operations-page.ts:455-466`.
- Search member: min-width input + tombol melebihi area konten: `member-management-page.ts:99-117`.
- Tabel master data tanpa wrapper: `master-data-page.ts:49-71`, `master-data-page.ts:104-114`.

### Navigasi mobile dashboard

- Pada `max-width: 48rem`, sidebar hanya dipindahkan menjadi blok penuh di atas konten; bukti: `dashboard-layout.ts:161-168`.
- Master admin harus melewati hingga 11 link, identitas, brand, dan tombol logout sebelum konten. Ini bukan adaptive navigation dan sangat lambat pada mobile.
- Tidak ada open/close state, backdrop, focus trap, Escape handling, atau persistensi drawer.

### Tabel mobile

- Wrapper `overflow:auto` mencegah sebagian page-level overflow, tetapi tidak memberi indikator scroll, sticky first column, atau card alternative.
- Report menambah nested scroll dan `nowrap`, yang paling berisiko di mobile; bukti: `reports-page.ts:208-223`.

## 6. Masalah accessibility

### Kontras dan fokus

- **Addressed:** C-01 pada primitive `.button--secondary`; hover sekarang memakai pasangan brand-50/brand-950 di `frontend/src/styles.scss:162-166`.
- **Partially addressed:** C-02 sudah diperbaiki secara global dengan focus ring dua warna di `frontend/src/styles.scss:122-126`, tetapi outline kuning lama tetap mengoverride kontrol pada `operations-page.ts:386-391`.
- Boundary input login `#9caf9f` terhadap putih sekitar 2,32:1.
- Warna status hijau/merah sering menjadi satu-satunya pembeda visual tanpa icon/pattern; contoh `.published` di `digital-management-page.ts:208-215` dan `.summary.warning` di `operations-page.ts:393-403`.

### Keyboard dan focus management

- Skip link tersedia dan merupakan hal positif; bukti: `public-layout.ts:11`, `dashboard-layout.ts:63`.
- Route change tidak memindahkan fokus ke main/heading.
- Form invalid tidak fokus ke error pertama pada hampir semua halaman.
- Tabs circulation tidak mengikuti keyboard pattern ARIA tabs.
- Native prompt/confirm mengambil alih fokus dan tidak memberi struktur error/helper yang konsisten.

### Semantic structure

- Banyak tabel tidak memiliki `<caption>` dan `<th scope="col">`.
- Grafik dashboard tidak punya alternatif tekstual terstruktur.
- Empty state reusable memakai ID statis.
- Status async tersebar memakai `role="status"`, tetapi pesan yang sebenarnya error juga kadang masuk ke status non-assertive tanpa visual error; contoh `member-management-page.ts:65-67`, `member-management-page.ts:217-226`.

### Form accessibility

- Sebagian besar kontrol dibungkus label, yang positif.
- Required state tidak ditandai secara visual/semantik pada mayoritas form.
- Tidak ada error summary untuk form besar pengelolaan digital/member.
- Checkbox `.check` tidak menambahkan gap/hit-area minimum yang konsisten; contoh `member-management-page.ts:53-55`, `digital-management-page.ts:71-75`.
- File input belum memberi deskripsi format/ukuran melalui `aria-describedby` dekat kontrol.

### Motion dan media

- **Partially addressed:** baseline `@media (prefers-reduced-motion: reduce)` sudah menonaktifkan transisi `.button`; bukti: `frontend/src/styles.scss:206-210`.
- Smooth scroll eksplisit di editor koleksi digital belum menghormati preference tersebut; bukti: `digital-management-page.ts:334`.
- Cover image tidak mengikuti `NgOptimizedImage` dan tidak memiliki dimensi.
- Font Lora/Raleway dimuat dari Google Fonts melalui `frontend/src/index.html:8-13`. `display=swap` mengurangi risiko teks tidak terlihat, tetapi ketergantungan jaringan eksternal tetap berisiko pada jaringan sekolah/offline dan harus diganti self-hosted WOFF2 sebelum deployment final.

## 7. Masalah UX dan navigasi

- Alur reservasi terpecah: katalog menyediakan tombol reservasi langsung, tetapi portal member meminta ID internal yang tidak tersedia secara natural. Satu alur harus menjadi sumber utama.
- Dashboard menu memakai beberapa label berbeda yang menuju layar sama tanpa implementasi section: `dashboard-layout.ts:15-45`.
- Status backend banyak ditampilkan sebagai enum Inggris (`pending`, `approved`, `loaned`, `unpaid`, `published`) di UI Bahasa Indonesia.
- Dialog native untuk reservasi, pembayaran, dan delete tidak memberi konteks, validasi, maupun recovery yang memadai.
- Filter utama katalog, dashboard, dan laporan tidak deep-linkable; browser back tidak memulihkan state.
- Destructive action tidak konsisten: master data/digital memakai confirm, portal member membatalkan tanpa confirm, sirkulasi menolak melalui prompt.
- Loading, empty, success, dan error tidak memiliki pola konsisten. Beberapa halaman hanya menampilkan teks; beberapa mempertahankan data lama tanpa indikator refreshing; sebagian kegagalan tidak terlihat sama sekali.
- Tidak ada breadcrumbs pada hierarchy dashboard atau detail koleksi; detail hanya memiliki link kembali manual.
- Copy publik masih menyebut tahap fondasi, sementara aplikasi sudah memiliki fitur produksi/prototype yang lebih luas.

## 8. Technical debt styling

- Seluruh halaman besar menggunakan template dan style inline; `operations-page.ts` mencapai 752 baris, `reports-page.ts` 444 baris, `digital-management-page.ts` 375 baris, dan `member-portal-page.ts` 344 baris. Ini menyulitkan audit visual, reuse, dan konsistensi.
- Form control, panel, table, action button, notice, error, status, radius, dan spacing diulang di hampir setiap halaman.
- **Addressed pada fondasi:** semantic tokens warna, typography, weight, spacing, container, border/radius, shadow, icon, control, dan motion sudah tersedia di `frontend/src/styles.scss:1-94`; kontrak lengkapnya berada di `docs/design-system.md`.
- **Open pada adopsi:** sedikitnya 33 nilai hex lama dan radius `0.4rem`, `0.45rem`, `0.5rem`, `0.6rem`, `0.7rem`, `0.75rem`, `0.8rem`, serta `1rem` masih tersebar dalam style inline halaman. Keberadaan token belum menghapus duplikasi tersebut.
- **Addressed pada fondasi:** elevation scale `--shadow-none/sm/md/lg` tersedia di `frontend/src/styles.scss:79-82`; hero/login belum mengadopsinya.
- **Addressed pada fondasi:** scale `--text-xs` sampai `--text-4xl`, font weight, Raleway untuk UI, dan Lora untuk heading tersedia di `frontend/src/styles.scss:39-56`, `frontend/src/styles.scss:101-108`, dan `frontend/src/styles.scss:200-204`. Heading, table text, badge, KPI, dan helper lokal belum seluruhnya memakai scale tersebut.
- Breakpoint sudah didokumentasikan dalam design system tetapi tidak dapat berupa CSS custom property untuk media query; literal `36/48/64/80rem` harus diterapkan konsisten saat migrasi halaman.
- Tidak ada layer/component stylesheet bersama untuk form, table, badge, modal/drawer, dan feedback state. `docs/design-system.md` baru mendefinisikan kontrak, belum menyediakan implementasi Angular-nya.
- Font produksi masih bergantung pada Google Fonts. Selain risiko jaringan sekolah, jumlah weight yang dimuat perlu dikaji berdasarkan pemakaian aktual sebelum self-hosting.
- `EmptyState` adalah dead/redundant UI code sampai benar-benar dipakai.
- Tidak ada visual regression test, component harness/story, atau E2E accessibility test yang terlihat di package scripts.

## 9. Prioritas perbaikan: Critical, High, Medium, Low

### Critical

Tidak ada temuan global **Critical/Open** saat pembaruan ini.

- **Addressed:** C-01 cascade hover `.button--secondary`.
- **Partially addressed:** C-02 focus ring global; override lokal pada circulation dipindahkan ke prioritas High.

### High

1. Hapus override focus kuning lama di `operations-page.ts:386-391` agar circulation memakai focus treatment global.
2. Buat mobile navigation dashboard yang adaptif serta perbaiki navbar publik 320 px.
3. Hilangkan overflow deterministik pada inventory, circulation, member search, dan master-data table.
4. Bangun primitive form bersama: label, required, helper, inline error, summary, disabled/loading, focus-first-error.
5. Ganti input ID internal dengan select/autocomplete berlabel manusia.
6. Satukan alur reservasi dari katalog; jangan meminta member menyalin UUID/ID.
7. Ganti `prompt/confirm` dengan dialog/form aksesibel dan recovery/undo yang sesuai.
8. Terapkan semantic tabs + URL state pada circulation dan URL filter pada katalog/report/dashboard.
9. Bangun table pattern bersama dengan caption, scope, empty/loading/error, touch target, dan responsive strategy.
10. Tambahkan aksesibilitas grafik dan format tanggal lokal.
11. Terapkan `NgOptimizedImage`, dimensi/aspect ratio, lazy loading, dan responsive source untuk cover.

### Medium

1. Migrasikan hardcoded color, type, spacing, radius, dan shadow halaman ke token yang sudah tersedia; jangan menambah token baru tanpa kebutuhan semantic.
2. Lokalkan seluruh enum/status dan gunakan badge yang tidak bergantung pada warna saja.
3. Standardisasi state loading, refresh, empty, success, dan error.
4. Tambahkan focus-on-route-change, reduced motion menyeluruh, autocomplete/inputmode, password visibility, dan unsaved-change protection pada form besar.
5. Self-host Lora/Raleway WOFF2 dan kurangi weight berdasarkan pemakaian aktual untuk deployment sekolah.
6. Pisahkan page besar menjadi komponen fokus tanpa menciptakan abstraksi generik berlebihan.
7. Perbaiki copy publik dan footer agar mencerminkan produk/sekolah aktual.

### Low

1. Tambahkan breadcrumb pada hierarchy yang benar-benar dalam.
2. Konsolidasikan shadow/elevation dan polish visual setelah alur circulation stabil.
3. Tambahkan visual regression snapshot setelah primitive UI stabil.

## 10. Daftar file yang kemungkinan perlu diubah

### Fondasi global

- `docs/design-system.md` — sumber aturan visual dan interaction contract; update hanya bila keputusan sistem berubah.
- `frontend/src/styles.scss` — token sudah tersedia; pekerjaan tersisa adalah form/table/badge/feedback primitives, pengurangan override, dan utility responsive yang benar-benar diperlukan.
- `frontend/src/index.html` — ganti Google Fonts eksternal dengan asset self-hosted ketika font files tersedia.
- `frontend/src/app/layouts/public-layout/public-layout.ts` — navbar mobile, footer, skip-link reuse.
- `frontend/src/app/layouts/dashboard-layout/dashboard-layout.ts` — adaptive sidebar/drawer, focus route, navigasi section.
- `frontend/src/app/shared/components/notification-banner/notification-banner.ts` — variant, live-region, touch target.
- `frontend/src/app/shared/components/empty-state/empty-state.ts` — ID unik dan adopsi lintas halaman.

### Primitive/shared baru atau restrukturisasi yang mungkin diperlukan

- `frontend/src/app/shared/components/` — button state, form-field, status badge, data table, accessible dialog, loading/empty state. Buat hanya primitive yang langsung dipakai beberapa halaman.

### Halaman publik

- `frontend/src/app/features/public/pages/home-page/home-page.ts`
- `frontend/src/app/features/catalog/pages/catalog-page/catalog-page.ts`
- `frontend/src/app/features/digital-library/pages/digital-catalog-page/digital-catalog-page.ts`
- `frontend/src/app/features/digital-library/pages/digital-detail-page/digital-detail-page.ts`
- `frontend/src/app/features/auth/pages/login-page/login-page.ts`

### Dashboard dan operasional

- `frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.ts`
- `frontend/src/app/features/members/pages/member-management-page/member-management-page.ts`
- `frontend/src/app/features/inventory/pages/inventory-page/inventory-page.ts`
- `frontend/src/app/features/master-data/pages/master-data-page/master-data-page.ts`
- `frontend/src/app/features/imports/pages/import-page/import-page.ts`
- `frontend/src/app/features/circulation/pages/operations-page/operations-page.ts`
- `frontend/src/app/features/circulation/pages/member-portal-page/member-portal-page.ts`
- `frontend/src/app/features/digital-library/pages/digital-management-page/digital-management-page.ts`
- `frontend/src/app/features/reports/pages/reports-page/reports-page.ts`
- `frontend/src/app/app.routes.ts` — URL state/section/focus metadata bila dipilih dalam implementasi.

### Test yang kemungkinan perlu ditambah

- Spec layout public/dashboard untuk responsive nav dan focus route.
- Spec shared button/form/dialog/table untuk state dan ARIA.
- Spec per page untuk field error, disabled/loading, empty/error, dan deep-link filter.
- E2E viewport 320×568, 375×667, 768×1024, 1024×768, dan 1440×900.
- AXE route publik, login, dashboard, circulation, dan dialog.

## 11. Risiko regresi

- Primitive `.button` global kini memakai token indigo dan selector state baru; perubahan berikutnya dapat memengaruhi semua CTA sekaligus. Inventaris variant dan screenshot state harus dibuat sebelum refactor lanjutan.
- Mengubah sidebar menjadi drawer dapat merusak role-based navigation, logout, active route, skip link, dan keyboard focus.
- Mengubah filter menjadi URL state dapat memicu request ganda atau loop antara form dan query params.
- Mengganti ID text input dengan autocomplete membutuhkan contract API search/pagination yang stabil dan harus tetap mendukung scanner/manual fallback.
- Mengubah tabel menjadi card pada mobile dapat menyembunyikan kolom penting atau memutus print/export; tentukan prioritas kolom per report.
- Memecah komponen page besar berisiko mengganggu focus restoration scanner pada circulation.
- Menambahkan `NgOptimizedImage` membutuhkan dimensi/aspect metadata atau loader yang cocok dengan signed/public URL Supabase.
- Mengganti dialog native harus mempertahankan konfirmasi destructive, idempotency, alasan penolakan wajib, nominal maksimum, Escape, focus trap, dan focus return.
- Migrasi warna lama ke token indigo dapat mengubah contrast, hierarchy, dan arti status. Hijau harus tetap dibatasi untuk success/ketersediaan; semua pasangan surface/text perlu diuji, bukan sekadar mengganti hex.
- Menghapus style fokus lokal dapat mengubah cascade komponen besar seperti circulation; verifikasi keyboard pada setiap control setelah mengandalkan focus ring global.
- Self-host font dapat menimbulkan flash, perubahan metrics, atau asset path SSR yang salah; preload hanya subset yang benar-benar critical dan pertahankan fallback stack.

## 12. Rekomendasi urutan implementasi

1. **Baseline verifikasi visual:** jalankan browser/AXE pada URL yang diizinkan, ambil screenshot lima viewport, catat overflow dan tab order aktual. Ini menutup batas audit saat ini.
2. **Tutup baseline accessibility yang tersisa:** hapus override focus circulation, audit input boundary, dan pastikan tombol lokal memenuhi touch target serta disabled/loading contract.
3. **Migrasi shell responsif:** perbaiki public nav, ubah dashboard sidebar menjadi drawer/top bar mobile, lalu samakan container/gutter dengan token.
4. **Shared form pattern:** implementasikan field error/focus/helper/required menggunakan token yang sudah ada, lalu migrasikan login, member, inventory, master data, digital management, report, dan import bertahap.
5. **Alur sirkulasi:** buat tabs aksesibel/deep-link, ganti prompt pembayaran/reservasi, pertahankan autofocus scanner hanya pada desktop yang tepat, dan uji focus return.
6. **Alur member:** satukan reservasi dari katalog, hilangkan ID internal, tambah feedback cancel/error, dan lokalkan status.
7. **Shared data presentation:** standardisasi empty/loading/error, tabel responsif, status badge, angka tabular, dan tanggal `Intl`.
8. **Migrasi visual per vertical slice:** ganti hardcoded green/hex, spacing, radius, shadow, dan font size dengan token; mulai circulation, member/inventory, lalu halaman publik.
9. **Media, font, dan grafik:** self-host Lora/Raleway, optimalkan cover image, reserve layout space, dan sediakan data table/label aksesibel untuk grafik.
10. **Validasi regresi:** unit/component test, keyboard-only pass, AXE, screenshot regression, mobile landscape, slow network, data kosong, data panjang, serta production build.

Audit ini tidak merekomendasikan penggantian stack atau pemasangan UI framework besar. Perbaikan mengikuti `docs/design-system.md` dan dapat dilakukan dengan Angular, Reactive/Signal Forms, SCSS, serta komponen shared kecil yang sesuai struktur repository saat ini. Arah indigo–Lora/Raleway adalah keputusan aktif; style hijau lama bukan lagi acuan brand dan harus dimigrasikan tanpa mengubah makna hijau sebagai status success/ketersediaan.
