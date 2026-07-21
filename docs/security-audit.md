# Audit Keamanan Prompt 7

Audit dilakukan terhadap frontend Angular, Express, Supabase Database/RLS, Storage, upload, environment, dan transaksi sirkulasi. Ini audit kode dan konfigurasi lokal, bukan penetration test infrastruktur production.

## Temuan yang diperbaiki

### SEC-001 — High — Direct read file private melewati aturan download

- Lokasi: `supabase/migrations/20260721130000_harden_storage_rpc_and_checkout_idempotency.sql`
- Risiko: policy authenticated pada `storage.objects` dan hak baca kolom path memungkinkan user yang mengetahui path meminta file tanpa pemeriksaan `published`/`is_downloadable` backend.
- Perbaikan: hapus seluruh policy client Storage (bucket cover public tidak memerlukan policy listing), cabut select kolom path untuk anon/authenticated, dan wajibkan signed URL backend.

### SEC-002 — High — Direct write tabel operasional melewati RPC transaksi

- Lokasi: migration hardening yang sama.
- Risiko: policy write tabel loan/reservasi/denda/kunjungan memungkinkan state kritis berubah tanpa locking dan validasi RPC.
- Perbaikan: hapus policy write langsung; operasi tetap melalui backend dan RPC terotorisasi.

### SEC-003 — High — Checkout retry/race belum memiliki idempotency key

- Lokasi: migration hardening, `backend/src/modules/circulation/`, dan data-access Angular.
- Risiko: timeout/retry dapat membuat loan ganda atau hasil ambigu.
- Perbaikan: `Idempotency-Key` UUID wajib, fingerprint payload, unique partial index, transaction advisory lock, serta reuse hasil hanya untuk actor/key/payload yang sama.

### SEC-004 — Medium — Upload memercayai MIME/extension

- Lokasi: `backend/src/modules/digital-library/digital-library.service.ts` dan `backend/src/modules/imports/import.routes.ts`.
- Risiko: file spoofed dapat disimpan/diproses sebagai tipe yang diizinkan.
- Perbaikan: validasi magic bytes media; validasi signature ZIP XLSX dan UTF-8 CSV tanpa NUL, selain allowlist MIME/extension/size/path.

### SEC-005 — Medium — Storage mutation dapat melewati validasi backend

- Lokasi: migration hardening.
- Risiko: staf authenticated dapat upload/delete langsung ke bucket.
- Perbaikan: policy mutation client dihapus; backend service role menjadi satu jalur upload/delete normal dan tetap diaudit.

### SEC-006 — Medium — API tidak dibatasi dan proxy tidak eksplisit

- Lokasi: `backend/src/app.ts`, `backend/src/config/env.ts`, dan `backend/src/server.ts`.
- Risiko: abuse request dan slow request menghabiskan resource; IP rate limit salah jika proxy hops tidak benar.
- Perbaikan: global rate limit, request/header/keep-alive timeout, `TRUST_PROXY_HOPS` tervalidasi, serta CORS tanpa credential cookie yang tidak dipakai.

### SEC-007 — Medium — Katalog publik membocorkan identifier eksemplar

- Lokasi: `backend/src/modules/catalog/catalog.service.ts`.
- Risiko: anon memperoleh UUID dan kode inventaris per copy meskipun hanya memerlukan ketersediaan.
- Perbaikan: DTO publik hanya metadata judul dan agregat stok.

### SEC-008 — Medium — Hak EXECUTE helper SECURITY DEFINER terlalu luas

- Lokasi: migration hardening.
- Risiko: helper internal dapat dipanggil role yang tidak memerlukan.
- Perbaikan: cabut PUBLIC EXECUTE dan grant hanya helper/role yang diperlukan.

## Risiko tersisa

- Advisory transitif ExcelJS/`uuid` perlu dipantau; downgrade otomatis yang breaking tidak dipaksakan tanpa pengganti export yang teruji.
- Rate limit proses tunggal bersifat in-memory. Jika backend dinaikkan ke multi-instance, gunakan shared store tepercaya dan pertahankan idempotency database.
- CSP Nginx perlu diuji pada domain production dan diperketat setelah seluruh origin media final diketahui.
- Keamanan VPS, firewall, DNS, SMTP, MFA, Supabase organization, dan backup Storage memerlukan verifikasi operator saat go-live.
- Smoke UAT destruktif hanya boleh berjalan di local/staging dengan akun fixture; bukan production.
