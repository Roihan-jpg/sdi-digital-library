import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CatalogApiService, type CatalogBook } from '../../data-access/catalog-api.service';

@Component({
  selector: 'sdi-catalog-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Katalog publik</p>
      <h1>Temukan koleksi perpustakaan</h1>
      <p>Cari judul, ISBN, atau kode katalog. Ketersediaan diperbarui dari data eksemplar.</p>
      <form (submit)="search($event)">
        <label for="catalog-search">Pencarian</label>
        <div>
          <input
            id="catalog-search"
            [formControl]="query"
            placeholder="Contoh: cerita rakyat"
          /><button class="button" type="submit">Cari</button>
        </div>
      </form>
      @if (loading()) {
        <p role="status">Memuat katalog…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="grid">
        @for (book of books(); track book.id) {
          <article>
            <span class="stock"
              >{{ book.stock.available }} tersedia / {{ book.stock.total }} eksemplar</span
            >
            <h2>{{ book.title }}</h2>
            <p>
              {{ book.categories?.name ?? 'Tanpa kategori' }} ·
              {{ book.publishers?.name ?? 'Penerbit tidak dicatat' }}
            </p>
            <small>ISBN {{ book.isbn ?? '—' }}</small>
          </article>
        }
      </div>
      @if (!loading() && books().length === 0) {
        <p>Belum ada koleksi yang cocok.</p>
      }
    </section>
  `,
  styles: `
    form {
      margin: 2rem 0;
      display: grid;
      gap: 0.5rem;
    }
    form div {
      display: flex;
      gap: 0.5rem;
    }
    input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #9dafa4;
      border-radius: 0.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      gap: 1rem;
    }
    article {
      padding: 1.25rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.75rem;
      background: #fff;
    }
    .stock {
      color: #176b43;
      font-weight: 700;
    }
    .error {
      color: #9b1c1c;
    }
  `,
})
export class CatalogPage {
  private readonly api = inject(CatalogApiService);
  readonly query = new FormControl('', { nonNullable: true });
  protected readonly books = signal<CatalogBook[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    this.load();
  }
  protected search(event: Event) {
    event.preventDefault();
    this.load();
  }
  private load() {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.query.value).subscribe({
      next: (response) => {
        this.books.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Katalog belum dapat dimuat. Silakan coba lagi.');
        this.loading.set(false);
      },
    });
  }
}
