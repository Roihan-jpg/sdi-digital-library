import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection, DigitalMediaType } from '../../models/digital-collection.model';

@Component({
  selector: 'sdi-digital-catalog-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <p class="eyebrow">Koleksi digital</p>
      <h1>Baca, tonton, dan dengarkan materi belajar</h1>
      <p>Metadata dapat dilihat siapa saja. Masuk diperlukan untuk membuka file utama.</p>
      <form [formGroup]="filters" (ngSubmit)="load()" class="filters">
        <label
          >Pencarian <input formControlName="search" placeholder="Judul, penulis, atau penerbit"
        /></label>
        <label
          >Jenis media
          <select formControlName="mediaType">
            <option value="">Semua</option>
            <option value="ebook">E-book</option>
            <option value="module">Modul</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </label>
        <label
          >Urutkan
          <select formControlName="sort">
            <option value="latest">Terbaru</option>
            <option value="popular">Populer</option>
            <option value="title">Judul A–Z</option>
          </select>
        </label>
        <button class="button" type="submit">Terapkan</button>
      </form>
      @if (loading()) {
        <p role="status">Memuat koleksi digital…</p>
      }
      @if (error()) {
        <div class="state error" role="alert">
          <p>{{ error() }}</p>
          <button class="button button--secondary" type="button" (click)="load()">Coba lagi</button>
        </div>
      }
      @if (!loading() && !error() && items().length === 0) {
        <p class="state">Belum ada koleksi yang sesuai dengan filter.</p>
      }
      <div class="grid">
        @for (item of items(); track item.id) {
          <article>
            @if (item.coverUrl) {
              <img [src]="item.coverUrl" [alt]="'Cover ' + item.title" />
            } @else {
              <div class="placeholder" aria-hidden="true">{{ mediaLabel(item.media_type) }}</div>
            }
            <div class="body">
              <span class="badge">{{ mediaLabel(item.media_type) }}</span>
              <h2>
                <a [routerLink]="['/koleksi-digital', item.slug]">{{ item.title }}</a>
              </h2>
              <p>
                {{ item.author_text || 'Penulis tidak dicatat' }} ·
                {{ item.categories?.name || 'Tanpa kategori' }}
              </p>
              <small>{{ item.popularity }} aktivitas pembaca</small>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: 2fr repeat(2, minmax(9rem, 1fr)) auto;
      gap: 0.75rem;
      align-items: end;
      margin: 2rem 0;
    }
    .filters label {
      display: grid;
      gap: 0.35rem;
      font-weight: 700;
    }
    input,
    select {
      min-height: 2.75rem;
      padding: 0.65rem;
      border: 1px solid #9dafa4;
      border-radius: 0.5rem;
      background: #fff;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
      gap: 1rem;
    }
    article {
      overflow: hidden;
      border: 1px solid #d5dfd9;
      border-radius: 0.8rem;
      background: #fff;
    }
    img,
    .placeholder {
      width: 100%;
      aspect-ratio: 3/2;
      object-fit: cover;
    }
    .placeholder {
      display: grid;
      place-items: center;
      background: #dfece4;
      color: #145638;
      font-weight: 800;
    }
    .body {
      padding: 1rem;
    }
    .badge {
      color: #176b43;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    h2 {
      font-size: 1.15rem;
    }
    .state {
      padding: 1rem;
      border-radius: 0.6rem;
      background: #fff;
    }
    .error {
      color: #8f1d1d;
    }
    @media (max-width: 48rem) {
      .filters {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DigitalCatalogPage {
  private readonly api = inject(DigitalLibraryApiService);
  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    mediaType: new FormControl<DigitalMediaType | ''>('', { nonNullable: true }),
    sort: new FormControl<'latest' | 'popular' | 'title'>('latest', { nonNullable: true }),
  });
  protected readonly items = signal<DigitalCollection[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    this.load();
  }
  protected load() {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.filters.getRawValue()).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Koleksi digital belum dapat dimuat.');
        this.loading.set(false);
      },
    });
  }
  protected mediaLabel(type: DigitalMediaType) {
    return ({ ebook: 'E-book', module: 'Modul', video: 'Video', audio: 'Audio' } as const)[type];
  }
}
