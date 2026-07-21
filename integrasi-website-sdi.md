• Bisa. Berdasarkan struktur website sekolah saat ini, integrasi paling cocok dilakukan pada tiga tempat:

  1. Menu utama: tambahkan Perpustakaan Digital di antara “Berita” dan “Daftar”.
  2. Beranda: tampilkan widget Koleksi Digital Terbaru, idealnya setelah bagian “Program Unggulan” atau sebelum “Berita”.
  3. Halaman sarana Perpustakaan: tambahkan tombol “Buka Perpustakaan Digital”.

  Website sekolah saat ini memang sudah memiliki halaman fasilitas Perpustakaan di bagian Sarana dan Prasarana, sehingga integrasi
  ini terasa alami. Website SD Islam Tompokersan (https://www.sditompokersan.sch.id/)

  ## Struktur domain yang disarankan

  Gunakan subdomain khusus:

  Website sekolah:
  https://www.sditompokersan.sch.id

  Aplikasi perpustakaan:
  https://perpustakaan.sditompokersan.sch.id

  API:
  https://perpustakaan.sditompokersan.sch.id/api

  Saya lebih menyarankan frontend dan API berada pada satu subdomain. Server dapat:

  - melayani Angular pada /;
  - meneruskan /api ke Express;
  - membiarkan Supabase menangani database, Auth, dan Storage.

  Dengan demikian URL publiknya menjadi:

  https://perpustakaan.sditompokersan.sch.id/katalog
  https://perpustakaan.sditompokersan.sch.id/koleksi-digital
  https://perpustakaan.sditompokersan.sch.id/masuk

  ## 1. Menambahkan menu utama

  Tambahkan elemen ini pada template navbar website sekolah:

  <li>
    <a href="https://perpustakaan.sditompokersan.sch.id">
      Perpustakaan Digital
    </a>
  </li>

  Menu ini sebaiknya membuka halaman yang sama, bukan tab baru, karena masih bagian dari layanan sekolah.

  Dari pola URL /Landing/..., website sekolah tampaknya merupakan aplikasi web khusus, kemungkinan menggunakan pola MVC. Ini
  inferensi dari struktur URL; lokasi file pastinya perlu dilihat dari source code atau panel hosting.

  Biasanya template navbar berada pada file seperti:

  application/views/template/header.php
  application/views/layout/navbar.php
  application/views/landing/index.php

  Nama sebenarnya bisa berbeda.

  ## 2. Memasang widget di beranda

  Letakkan kode berikut setelah bagian “Program Unggulan” atau sebelum “Berita”:

  <section class="digital-library-section">
    <div class="container">
      <div class="digital-library-heading">
        <h2>Koleksi Digital Terbaru</h2>
        <p>
          Baca e-book, modul pembelajaran, serta materi video dan audio
          dari perpustakaan sekolah.
        </p>
      </div>

      <div id="sdi-digital-library-widget"></div>
    </div>
  </section>

  <script
    src="https://perpustakaan.sditompokersan.sch.id/widgets/sdi-digital-library.js"
    data-api="https://perpustakaan.sditompokersan.sch.id/api"
    data-catalog-url="https://perpustakaan.sditompokersan.sch.id/koleksi-digital"
    data-target="sdi-digital-library-widget"
    defer
  ></script>

  Tambahkan CSS berikut agar widget mengikuti tampilan card website:

  .digital-library-section {
    padding: 60px 0;
    background: #f5f8f6;
  }

  .digital-library-heading {
    margin-bottom: 24px;
    text-align: center;
  }

  .sdi-digital-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }

  .sdi-digital-grid article {
    padding: 20px;
    border: 1px solid #dce5df;
    border-radius: 12px;
    background: #fff;
  }

  .sdi-digital-grid small {
    color: #176b43;
    font-weight: 700;
    text-transform: uppercase;
  }

  .sdi-digital-grid h3 {
    margin: 8px 0;
  }

  .sdi-digital-grid a {
    color: #17452f;
  }

  @media (max-width: 768px) {
    .sdi-digital-grid {
      grid-template-columns: 1fr;
    }
  }

  Widget hanya menampilkan metadata published. File PDF, video, dan audio tetap privat dan baru mendapat signed URL setelah pengguna
  login.

  ## 3. Halaman fasilitas Perpustakaan

  Pada detail fasilitas “PERPUSTAKAAN”, tambahkan CTA:

  <a
    class="btn btn-success"
    href="https://perpustakaan.sditompokersan.sch.id"
  >
    Buka Perpustakaan Digital
  </a>

  Jika ingin lebih spesifik:

  aplikasi perpustakaan sudah berhasil di-deploy dan URL API produksinya tersedia.
