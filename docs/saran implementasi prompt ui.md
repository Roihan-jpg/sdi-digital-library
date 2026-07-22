 Realistisnya: ini bukan task “tinggal eksekusi prompt” yang ringan, tapi juga tidak perlu model paling mahal untuk semua halaman.

  Tingkat kompleksitasnya menengah ke tinggi, karena AI harus:

  - membaca docs/ui-ux-audit.md, docs/design-system.md, page component, data-access, routing, dan style global;
  - menjaga business logic dan kontrak API tetap aman;
  - refactor UI tanpa merusak state/loading/error;
  - validasi responsive, accessibility, keyboard, browser console, dan build;
  - menghindari perubahan lintas halaman yang terlalu besar.

  Jadi iya, ini butuh context cukup panjang, tapi bukan harus “ingat seluruh repo sekaligus”. Cara paling sehat adalah eksekusi per
  halaman, satu prompt satu halaman. Dengan begitu model hanya perlu membaca dokumen global + file halaman terkait + data-access
  terkait.

  Rekomendasi model:

  1. Paling aman untuk kualitas: pakai model Codex/coding agent terbaru yang tersedia di tool Anda, terutama yang kuat untuk long-
     horizon coding dan browser validation. Dari info resmi OpenAI terbaru, model seperti GPT-5.6 Sol / model Codex terbaru
     diposisikan untuk coding agent dan workflow terminal kompleks. Cocok untuk halaman berat seperti /dashboard/circulation, /
     dashboard/reports, /dashboard/digital-library.

  2. Balanced terbaik: pakai model Codex kelas menengah-atas, misalnya GPT-5.3-Codex / GPT-5.4 / model “thinking” yang kuat di
     coding. Ini cukup untuk mayoritas halaman seperti dashboard overview, members, inventory, imports, catalog, login. Menurut saya
     ini sweet spot: cukup pintar, tidak terlalu boros.

  3. Model cepat/murah: pakai hanya untuk membuat prompt, merapikan dokumen, atau review ringan. Jangan pakai untuk implementasi UI/
     UX penuh yang perlu baca kode, edit banyak state, dan validasi browser.

  Strategi yang saya sarankan:

  - Untuk halaman sederhana: /, /masuk, /katalog, /koleksi-digital, forbidden/not-found pakai model balanced.
  - Untuk halaman sedang: /dashboard/members, /dashboard/inventory, /dashboard/imports, /dashboard/master-data pakai model balanced
    dengan reasoning agak tinggi.

  - Untuk halaman berat: /dashboard/circulation, /dashboard/reports, /dashboard/digital-library pakai model terbaik yang tersedia,
    karena risiko regresinya tinggi.

  Kesimpulan saya: jangan eksekusi semua prompt sekaligus dan jangan pakai model kecil untuk implementasi. Gunakan model coding agent
  yang kuat, tapi hemat dengan cara membagi per halaman. Ini lebih penting daripada sekadar memilih model paling mahal.
