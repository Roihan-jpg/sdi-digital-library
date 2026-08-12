# Integrasi Website Sekolah

Katalog koleksi digital dapat dihubungkan tanpa membagikan kunci Supabase atau URL file privat.

## Tautan halaman

Tambahkan tautan menuju `https://DOMAIN-LIBRARY/koleksi-digital`. Pengunjung dapat melihat metadata published; file penuh tetap meminta login.

## Endpoint publik terbatas

Gunakan `GET https://DOMAIN-API/api/digital-library?limit=6&sort=latest`. Filter yang didukung: `search`, `categoryId`, `mediaType` (`ebook`, `module`, `video`), dan `sort` (`latest`, `popular`, `title`). Respons tidak memuat `file_path`, `preview_path`, ataupun signed URL.

Pastikan domain website sekolah tercantum dalam `APP_ORIGIN` backend agar diizinkan oleh CORS.

## Widget sederhana

```html
<section aria-labelledby="koleksi-digital-title">
  <h2 id="koleksi-digital-title">Koleksi digital terbaru</h2>
  <div id="sdi-digital-library-widget"></div>
</section>
<script
  src="https://DOMAIN-LIBRARY/widgets/sdi-digital-library.js"
  data-api="https://DOMAIN-API/api"
  data-catalog-url="https://DOMAIN-LIBRARY/koleksi-digital"
  data-target="sdi-digital-library-widget"
  defer
></script>
```

Widget hanya membaca enam metadata published terbaru. Login, pemutar media, download, dan pembuatan signed URL tetap berlangsung pada aplikasi library.
