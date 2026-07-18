import { Component } from '@angular/core';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'sdi-catalog-page',
  imports: [EmptyState],
  template: `
    <section class="page">
      <p class="eyebrow">Katalog publik</p>
      <h1>Temukan koleksi perpustakaan</h1>
      <p>Halaman ini telah disiapkan untuk pencarian dan daftar koleksi pada tahap data katalog.</p>
      <sdi-empty-state
        title="Katalog belum terhubung"
        description="Data buku akan tampil setelah API katalog diimplementasikan."
      />
    </section>
  `,
  styles: `
    sdi-empty-state {
      display: block;
      margin-top: 2rem;
    }
  `,
})
export class CatalogPage {}
