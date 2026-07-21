# Design System SDI Digital Library

Status: baseline v1  
Tanggal: 21 Juli 2026  
Sumber implementasi token: `frontend/src/styles.scss`

### Cakupan baseline yang sudah diterapkan

- CSS variables untuk warna, type, spacing, container, border, radius, shadow, icon, control, dan motion.
- Lora untuk heading serta Raleway untuk body/UI dengan fallback sistem.
- Canvas, teks global, focus indicator dua warna, button primary/secondary, `.page`, dan `.eyebrow`.
- Warna shell pada public header dan dashboard sidebar.

Style inline pada feature page belum dimigrasikan secara massal. Hardcoded value lama harus diganti bertahap saat page terkait dikerjakan agar regresi mudah dilacak; jangan membuat refactor visual lintas seluruh halaman dalam satu perubahan.

## 1. Tujuan dan arah desain

SDI Digital Library melayani dua konteks yang berbeda dalam satu produk:

- siswa, guru, orang tua, dan tamu yang menjelajah katalog publik;
- dua petugas perpustakaan yang membutuhkan layar operasional cepat, padat, dan stabil untuk scanner serta keyboard.

Arah visualnya adalah **perpustakaan sekolah digital yang tenang, cerdas, dan tertib seperti katalog kartu**. Digital indigo menjadi identitas utama; hijau dipertahankan secara lebih terarah untuk ketersediaan dan keberhasilan. Permukaan terang seperti kertas menjaga pengalaman membaca, sedangkan Lora memberi karakter editorial dan Raleway menjaga UI tetap modern. Area publik boleh lebih lega; area operasional lebih padat, langsung, dan mengutamakan data.

### Prinsip

1. **Cepat dibaca sebelum terlihat dekoratif.** Status, kode inventaris, tanggal, dan aksi utama harus dapat dipindai dalam hitungan detik.
2. **Ramah tanpa kekanak-kanakan.** Indigo memberi rasa digital dan tepercaya; hijau serta amber dipakai sebagai aksen fungsional, bukan gradient dekoratif.
3. **Satu layar, satu aksi utama.** Aksi sekunder dan destructive harus jelas lebih rendah hierarkinya.
4. **State tidak bergantung pada warna.** Gunakan label, ikon, dan teks bersama warna.
5. **Scanner dan keyboard adalah first-class input.** Focus state, urutan tab, dan pengembalian fokus tidak boleh dianggap polish tambahan.
6. **Matte, bukan glass.** Surface solid, border terukur, dan shadow ringan lebih cocok untuk jaringan/perangkat sekolah daripada blur atau efek berat.

### Elemen khas: garis indeks katalog

Elemen visual pembeda adalah **garis indeks katalog digital**: garis vertikal atau top rule indigo setebal 3–4 px yang menandai langkah aktif, hasil scan, atau kelompok informasi penting. Tab hijau menandai item tersedia/berhasil; amber hanya untuk due date yang mendekat atau perhatian non-error.

Motif ini harus membawa informasi. Jangan menambahkan garis indeks pada setiap card dan jangan menggunakannya sebagai dekorasi kosong.

## 2. Color tokens

### Palet dasar

| Token | Nilai | Peran |
|---|---:|---|
| `--color-brand-950` | `#1e1b4b` | Sidebar, header, surface brand gelap |
| `--color-brand-800` | `#3730a3` | Active primary |
| `--color-brand-700` | `#4f46e5` | Primary action dan link penting |
| `--color-brand-100` | `#e0e7ff` | Selected surface |
| `--color-brand-50` | `#eef2ff` | Brand surface lembut |
| `--color-accent` | `#16a34a` | Indicator ketersediaan non-text |
| `--color-accent-strong` | `#15803d` | Teks/aksi success |
| `--color-accent-surface` | `#dcfce7` | Surface success |
| `--color-amber-700` | `#b45309` | Aksen katalog di atas putih |
| `--color-amber-900` | `#92400e` | Teks warning pada surface amber |
| `--color-amber-100` | `#fef3c7` | Surface warning |
| `--color-canvas` | `#eef2ff` | Background aplikasi |
| `--color-surface` | `#ffffff` | Card, panel, form, modal |
| `--color-surface-subtle` | `#ebeff9` | Header tabel, readonly, grouping |
| `--color-text` | `#312e81` | Teks utama |
| `--color-text-muted` | `#565a7d` | Teks pendukung |
| `--color-text-inverse` | `#ffffff` | Teks di surface gelap |
| `--color-border` | `#c7d2fe` | Divider dan border struktural |
| `--color-border-strong` | `#6366f1` | Boundary input/control |
| `--color-info` | `#4f46e5` | Informasi dan outer focus ring |
| `--color-info-surface` | `#eef2ff` | Surface informasi |
| `--color-danger` | `#b91c1c` | Error dan destructive action |
| `--color-danger-strong` | `#7f1d1d` | Teks error pada surface lembut |
| `--color-danger-surface` | `#fef2f2` | Surface error |

### Token semantik

Gunakan token semantik dalam komponen; token palet hanya dipakai untuk mendefinisikan tema.

| Token | Alias |
|---|---|
| `--color-action-primary` | `--color-brand-700` |
| `--color-action-primary-hover` | `--color-brand-800` |
| `--color-action-secondary` | `--color-surface` |
| `--color-action-secondary-hover` | `--color-brand-50` |
| `--color-focus-outer` | `--color-info` |
| `--color-focus-inner` | `--color-surface` |
| `--color-success` | `--color-accent-strong` |
| `--color-success-surface` | `--color-accent-surface` |
| `--color-warning` | `--color-amber-900` |
| `--color-warning-surface` | `--color-amber-100` |
| `--color-error` | `--color-danger` |
| `--color-error-surface` | `--color-danger-surface` |

### Kontras minimum yang menjadi baseline

- Primary `#4f46e5` terhadap putih: sekitar 6,29:1.
- Primary hover `#3730a3` terhadap putih: sekitar 9,93:1.
- Teks utama `#312e81` terhadap canvas: sekitar 10,22:1.
- Teks muted `#565a7d` terhadap canvas: sekitar 5,95:1.
- Border control `#6366f1` terhadap putih: sekitar 4,47:1.
- Success `#15803d` terhadap success surface: sekitar 4,57:1.
- Warning `#92400e` terhadap warning surface: sekitar 6,37:1.

Jangan menurunkan kontras normal text di bawah 4,5:1, large text di bawah 3:1, atau boundary/focus indicator di bawah 3:1.

## 3. Typography

### Font family

| Peran | Stack | Penggunaan |
|---|---|---|
| UI/body | `Raleway, Aptos, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Seluruh kontrol, body, dashboard, tabel |
| Editorial/display | `Lora, Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif` | Heading dan judul card; gunakan lebih ringkas pada meja sirkulasi |
| Data/code | `ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace` | `inventory_code`, NIS/NISN, nomor transaksi, kode member |

Baseline memuat Lora dan Raleway melalui Google Fonts dengan `display=swap` serta fallback sistem. Sebelum deployment jaringan sekolah, pertimbangkan self-host file WOFF2 agar UI tidak bergantung pada akses Google Fonts; ukur CLS setelah perubahan sumber font.

### Type scale

| Token | Ukuran | Line-height | Penggunaan |
|---|---:|---:|---|
| `--text-xs` | `0.75rem` / 12 px | 1.5 | Metadata sangat singkat; bukan body utama |
| `--text-sm` | `0.875rem` / 14 px | 1.5 | Helper, table secondary text |
| `--text-base` | `1rem` / 16 px | 1.6 | Body dan input |
| `--text-lg` | `1.125rem` / 18 px | 1.55 | Lead dan subheading |
| `--text-xl` | `1.25rem` / 20 px | 1.4 | Card/section title |
| `--text-2xl` | `1.5rem` / 24 px | 1.3 | Heading section utama |
| `--text-3xl` | `1.875rem` / 30 px | 1.2 | Page title dashboard |
| `--text-4xl` | `clamp(2.25rem, 5vw, 4.5rem)` | 1.05 | Hero publik saja |

Aturan:

- Body mobile tetap minimal 16 px.
- Teks 12 px hanya untuk metadata non-kritis dengan kontras memadai.
- Heading memakai `text-wrap: balance`; body memakai `text-wrap: pretty` bila dukungan browser tersedia.
- Nilai uang, jumlah, tanggal pendek, dan kolom angka memakai `font-variant-numeric: tabular-nums`.
- Panjang baris body dibatasi 60–75 karakter pada desktop dan 35–60 pada mobile.

## 4. Font weight

| Token | Nilai | Penggunaan |
|---|---:|---|
| `--weight-regular` | 400 | Body |
| `--weight-medium` | 500 | Navigation dan helper penting |
| `--weight-semibold` | 600 | Label form dan heading kecil |
| `--weight-bold` | 700 | Button, heading, KPI |
| `--weight-extrabold` | 800 | Eyebrow/brand; gunakan terbatas |

Jangan membuat body panjang lebih tebal dari 500. Hierarki sebaiknya dibentuk oleh kombinasi ukuran, spacing, dan weight, bukan weight saja.

## 5. Spacing scale

Skala memakai basis 4 px dengan ritme utama 8 px.

| Token | Nilai |
|---|---:|
| `--space-0` | `0` |
| `--space-1` | `0.25rem` / 4 px |
| `--space-2` | `0.5rem` / 8 px |
| `--space-3` | `0.75rem` / 12 px |
| `--space-4` | `1rem` / 16 px |
| `--space-5` | `1.25rem` / 20 px |
| `--space-6` | `1.5rem` / 24 px |
| `--space-8` | `2rem` / 32 px |
| `--space-10` | `2.5rem` / 40 px |
| `--space-12` | `3rem` / 48 px |
| `--space-16` | `4rem` / 64 px |

Aturan penggunaan:

- Gap label ke control: `--space-2`.
- Gap control ke helper/error: `--space-1` atau `--space-2`.
- Gap antar field: `--space-4` untuk operasional, `--space-6` untuk form publik.
- Padding card: `--space-4` sampai `--space-6`.
- Jarak antar section: `--space-8` sampai `--space-12`.
- Hindari nilai baru di luar skala kecuali untuk alignment satu piksel atau ukuran intrinsik media.

## 6. Container dan grid

### Container

| Token | Nilai | Penggunaan |
|---|---:|---|
| `--container-reading` | `42rem` | Form login, teks panjang |
| `--container-content` | `72rem` | Katalog dan halaman umum |
| `--container-wide` | `90rem` | Circulation, laporan, tabel operasional |
| `--page-gutter` | `clamp(1rem, 3vw, 2rem)` | Gutter horizontal responsif |

Pola container:

```scss
width: min(var(--container-content), calc(100% - 2 * var(--page-gutter)));
margin-inline: auto;
```

### Grid

- Grid harus dimulai dari satu kolom lalu bertambah pada breakpoint, bukan bergantung pada track minimum yang lebih lebar dari viewport.
- Catalog grid: 1 kolom mobile, 2 kolom tablet, 3–4 kolom desktop.
- Form grid: 1 kolom mobile; 2 kolom mulai tablet bila label dan input tetap terbaca.
- Operational workspace: 1 kolom sampai 64rem; 2 kolom bila kedua panel punya lebar efektif minimal 20rem.
- KPI grid memakai `minmax(min(100%, 12rem), 1fr)` untuk mencegah overflow.

## 7. Breakpoint responsive

SCSS media query tetap menggunakan nilai literal karena CSS custom property tidak dapat dipakai sebagai breakpoint.

| Nama | Nilai | Tujuan |
|---|---:|---|
| Small | `36rem` / 576 px | Mobile besar; public nav mulai berubah |
| Medium | `48rem` / 768 px | Tablet portrait; form dua kolom |
| Large | `64rem` / 1024 px | Sidebar permanen dan workspace dua kolom |
| Extra large | `80rem` / 1280 px | Tabel/report lebar dan container wide |

Baseline test: 320×568, 375×667, 768×1024, 1024×768, dan 1440×900. Tidak boleh ada page-level horizontal scroll pada 320 px.

## 8. Border dan radius

| Token | Nilai | Penggunaan |
|---|---:|---|
| `--border-width` | `1px` | Border default |
| `--border-width-accent` | `4px` | Garis indeks katalog |
| `--radius-sm` | `0.375rem` | Badge, compact control |
| `--radius-md` | `0.5rem` | Input, button |
| `--radius-lg` | `0.75rem` | Card, panel |
| `--radius-xl` | `1rem` | Hero card atau modal; gunakan terbatas |
| `--radius-pill` | `999px` | Badge/status saja |

Gunakan `--color-border` untuk divider struktural dan `--color-border-strong` untuk input/control boundary. Jangan menciptakan radius per halaman.

## 9. Elevation dan shadow

| Token | Nilai | Penggunaan |
|---|---|---|
| `--shadow-none` | `none` | Mayoritas card operasional |
| `--shadow-sm` | `0 1px 2px rgb(49 46 129 / 8%)` | Hover card/interaktif |
| `--shadow-md` | `0 8px 24px rgb(49 46 129 / 10%)` | Dropdown, sticky toolbar |
| `--shadow-lg` | `0 20px 48px rgb(49 46 129 / 14%)` | Modal/drawer |

Card biasa mengandalkan border, bukan shadow. Jangan memakai shadow besar pada setiap card dan jangan menggabungkan blur/transparency sebagai gaya utama.

## 10. Ukuran icon

| Token | Nilai | Penggunaan |
|---|---:|---|
| `--icon-sm` | `1rem` / 16 px | Inline metadata |
| `--icon-md` | `1.25rem` / 20 px | Button dan input |
| `--icon-lg` | `1.5rem` / 24 px | Navigation |
| `--icon-xl` | `2rem` / 32 px | Empty state |

Gunakan satu keluarga SVG outline dengan stroke konsisten 1.75–2 px. Icon decorative memakai `aria-hidden="true"`; icon-only button wajib `aria-label` dan touch target minimal 44×44 px. Jangan memakai emoji sebagai icon UI.

## 11. Button variants

### Primary

- Untuk satu aksi utama layar: Simpan, Proses peminjaman, Cari member.
- Digital indigo, teks putih, min-height 44 px.
- Hover memakai brand-800; active harus lebih kuat dari hover.

### Secondary

- Surface putih, border kuat, teks brand gelap.
- Hover memakai brand-50; jangan pernah mewarisi background primary tanpa mengganti warna teks.

### Tertiary/ghost

- Untuk aksi ringan dalam toolbar. Background transparan, teks/link brand, hover brand-50.
- Tetap mempunyai border/focus treatment bila konteksnya padat.

### Danger

- Untuk delete/reject yang irreversible atau berisiko.
- Gunakan danger sebagai teks/border atau filled hanya pada konfirmasi akhir.
- Pisahkan secara visual dari primary action.

### Icon button

- Visual icon 20–24 px, hit area minimal 44×44 px.
- Wajib tooltip untuk istilah yang tidak jelas dan accessible name.

### State

- `hover`: perubahan background/border/color selama 150 ms.
- `active`: feedback langsung tanpa layout shift.
- `disabled`: opacity 0,5, `cursor: not-allowed`; jangan pakai disabled untuk menjelaskan prasyarat yang belum terpenuhi tanpa helper.
- `loading`: label tetap spesifik, spinner 16–20 px, cegah double submit.

## 12. Form controls

### Anatomy

1. Label terlihat.
2. Required marker dan teks screen-reader bila wajib.
3. Input/select/textarea minimal 44 px.
4. Helper untuk format atau konsekuensi.
5. Error inline setelah blur/submit.

Control menggunakan `--color-border-strong`, `--radius-md`, surface putih, dan type base. Hover meningkatkan kontras border. Focus memakai focus treatment global dua warna. Invalid state menggunakan danger border **dan** pesan; warna saja tidak cukup.

Aturan:

- Gunakan type, `inputmode`, `autocomplete`, `name`, dan `spellcheck` yang tepat.
- ID database internal tidak boleh menjadi input kerja manusia; gunakan select/autocomplete berlabel nama/kode yang dikenali.
- Scanner field boleh auto-focus pada desktop operasional, tetapi hindari `autofocus` mobile yang membuka keyboard tanpa permintaan.
- Form besar harus fokus ke error pertama dan menampilkan summary bila error lebih dari satu.
- Readonly dan disabled harus terlihat serta bermakna berbeda.

## 13. Card

### Catalog card

- Cover/aspect ratio tetap untuk mencegah CLS.
- Judul menjadi link utama; seluruh card boleh clickable hanya bila aksi tunggal.
- Metadata maksimal 2–3 baris dan status stok terlihat tanpa hover.

### Operational panel

- Border default, tanpa shadow, padding 16–24 px.
- Heading dan aksi panel sejajar; pada mobile aksi turun ke baris baru.
- Garis indeks katalog boleh menandai langkah aktif atau hasil scan.

### KPI card

- Label, angka tabular, dan konteks periode.
- Jangan mengandalkan warna untuk naik/turun atau warning.

### Interactive card

- Hover, focus-within, dan active state harus konsisten.
- Jangan membuat card terlihat clickable bila di dalamnya ada beberapa aksi terpisah.

## 14. Table

- Gunakan `<caption>` yang dapat terlihat atau `sr-only`, `<th scope="col">`, dan heading tabel.
- Angka rata kanan dan tabular; teks rata kiri; action column tidak boleh menyempitkan label.
- Header sticky hanya di scroll container yang jelas.
- Loading memakai skeleton row atau status row; empty/error berada di dalam konteks tabel.
- Tabel di bawah 48rem harus memilih salah satu: horizontal scroll dengan affordance, priority columns, atau card list. Jangan membiarkan page-level overflow.
- Touch action minimal 44×44 px walaupun icon visual kecil.
- Pagination muncul saat data nyata melewati page size; jangan render >50 row tanpa pagination/virtualization.
- Status tidak ditampilkan sebagai enum mentah; gunakan label Bahasa Indonesia dan badge semantic.

## 15. Modal dan drawer

### Modal

- Hanya untuk konfirmasi atau task singkat, bukan primary navigation.
- Memiliki heading, close/cancel, focus trap, Escape, focus return, dan konfirmasi unsaved changes.
- Destructive modal menyebut objek dan dampaknya. Primary destructive action diletakkan paling akhir.
- Lebar default `min(32rem, calc(100vw - 2rem))`; form kompleks memakai page/drawer, bukan modal sempit.

### Drawer

- Dashboard mobile memakai drawer navigation; desktop ≥64rem memakai sidebar.
- Drawer memiliki backdrop, close button, Escape, focus trap, scroll containment, dan mengembalikan fokus ke trigger.
- Lebar maksimum 20rem dan tidak menutup seluruh konteks tanpa alasan.

Hindari `window.prompt` dan `window.confirm` untuk alur produksi karena tidak mendukung helper, validation, dan hierarchy sistem ini.

## 16. Navigation

- Public navigation: brand, Beranda, Katalog, Koleksi digital, dan satu CTA akun. Pada mobile gunakan menu yang tidak overflow.
- Dashboard: sidebar pada large screen, drawer/top bar pada small screen.
- Active state memakai weight + indicator, bukan warna saja.
- Route state penting—filter, tab circulation, periode report—ditulis ke query parameter.
- Setelah route berubah, fokus dipindahkan ke `main` atau `h1` tanpa mengganggu scanner workflow.
- Breadcrumb hanya untuk hierarchy 3 tingkat atau lebih.
- Logout/destructive action dipisahkan dari navigation normal.

## 17. Badge dan status

Badge terdiri dari label, optional icon, semantic background, dan border. Gunakan radius pill hanya untuk badge.

| Kelompok | Contoh | Treatment |
|---|---|---|
| Success | Tersedia, Aktif, Lunas, Selesai | Accent green strong + accent surface + check icon |
| Info | Dipinjam, Disetujui, Sedang diproses | Info text + info surface + info icon |
| Warning | Pending, Jatuh tempo dekat, Partial | Amber-900 + amber-100 + warning/clock icon |
| Danger | Terlambat, Rusak, Hilang, Ditolak | Danger strong + danger surface + alert icon |
| Neutral | Draft, Dibatalkan, Kedaluwarsa | Muted text + surface subtle + neutral icon |

Semua enum backend dipetakan ke label Bahasa Indonesia. Jangan menampilkan `pending`, `loaned`, atau `partial` mentah.

## 18. Feedback dan content state

### Loading

- Di bawah 300 ms tidak perlu skeleton yang berkedip.
- Di atas 300 ms gunakan skeleton yang mempertahankan ukuran konten atau progress yang jelas.
- Refresh data yang sudah ada tidak menghapus konten; tampilkan indikator “Memperbarui…”.

### Skeleton

- Bentuk mengikuti konten akhir dan tidak memakai animasi agresif.
- Hentikan shimmer pada `prefers-reduced-motion`.
- Jangan gunakan skeleton untuk submit singkat; gunakan loading button.

### Empty

- Jelaskan apa yang kosong, mengapa jika diketahui, dan satu aksi berikutnya.
- Contoh: “Belum ada buku yang dipindai. Scan kode inventaris untuk menambah buku ke transaksi.”

### Error

- Nyatakan masalah dan cara memperbaiki atau mencoba ulang.
- Error field berada dekat field; error halaman menyediakan retry bila aman.
- Request ID boleh ditampilkan sebagai referensi, bukan pesan utama.

### Success

- Gunakan active voice dan nama aksi yang sama: “Simpan koleksi” → “Koleksi disimpan.”
- Success transaksi penting harus bertahan sampai petugas memulai transaksi berikutnya.

### Notice/toast

- `role="status"`/`aria-live="polite"` untuk info dan success.
- `role="alert"` hanya untuk error yang perlu perhatian segera.
- Toast tidak mengambil fokus; modal error hanya untuk kondisi yang benar-benar memblokir.

## 19. Aturan accessibility

1. WCAG AA minimum: normal text 4,5:1; large text dan control boundary 3:1.
2. Focus indicator terlihat di surface terang dan gelap; jangan menghapus outline tanpa pengganti.
3. Semua fungsi dapat dilakukan dengan keyboard dan urutan tab mengikuti visual.
4. Touch target minimal 44×44 px dengan jarak minimal 8 px bila berdekatan.
5. Heading berurutan; satu `h1` per page utama.
6. Gunakan semantic HTML sebelum ARIA.
7. Icon-only button memiliki accessible name; decorative icon `aria-hidden="true"`.
8. Gambar bermakna memiliki alt; gambar dekoratif `alt=""`; dimensi/aspect ratio selalu dicadangkan.
9. Form memiliki label, helper/error association, required state, dan focus-first-error.
10. Dynamic update diumumkan melalui live region yang sesuai.
11. Status dan chart tidak bergantung pada warna saja; chart punya tabel/summary alternatif.
12. Hormati zoom, text scaling, `prefers-reduced-motion`, dan landscape.
13. Modal/drawer memiliki focus trap, Escape, focus return, dan scroll containment.
14. Setelah navigation, fokus masuk ke konten utama kecuali workflow scanner memerlukan pengecualian eksplisit.
15. Jalankan AXE dan keyboard-only pass pada route publik, login, dashboard, circulation, dan setiap dialog baru.

## 20. Aturan penggunaan komponen

### Pilih shared component bila

- pola dipakai pada sedikitnya tiga tempat;
- accessibility behavior harus identik, seperti dialog, form field, table state, atau icon button;
- variasi dapat dijelaskan oleh input semantic, bukan kumpulan class acak.

### Biarkan lokal bila

- pola hanya sekali dan sangat terkait dengan domain;
- abstraksi akan menyembunyikan aturan bisnis atau scanner focus;
- hanya tiga baris markup/style yang kebetulan mirip.

### Aturan implementasi Angular

- Pertahankan standalone component, signals, Reactive/Signal Forms, dan lazy route.
- Shared UI tinggal di `frontend/src/app/shared/components`.
- Data access tetap di feature `data-access`; komponen UI tidak memanggil Supabase langsung.
- Gunakan class/attribute binding, bukan `ngClass`/`ngStyle`.
- Static image memakai `NgOptimizedImage`; remote dynamic cover tetap harus memiliki dimensi/aspect ratio dan strategi lazy loading.
- Jangan menambahkan UI framework hanya untuk mengganti primitive yang dapat dibuat kecil dan aksesibel.

### Urutan adopsi

1. Token dan focus/button baseline.
2. Button, form field, feedback state.
3. Adaptive navigation dan dialog.
4. Table/status badge.
5. Migrasi page per vertical slice, mulai circulation lalu member/inventory.

Setiap migrasi page harus menyertakan keyboard test, responsive test, loading/empty/error test, serta production build. Design system ini adalah kontrak; page-specific exception harus didokumentasikan, bukan dibuat sebagai hardcoded value baru.
