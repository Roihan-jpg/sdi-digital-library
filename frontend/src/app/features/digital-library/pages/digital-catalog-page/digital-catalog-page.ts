import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, type ParamMap } from '@angular/router';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection, DigitalMediaType } from '../../models/digital-collection.model';

type DigitalSort = 'latest' | 'popular' | 'title';

interface DigitalCatalogFilters {
  search: string;
  mediaType: DigitalMediaType | '';
  sort: DigitalSort;
}

@Component({
  selector: 'sdi-digital-catalog-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="catalog-hero">
        <p class="eyebrow">Koleksi digital</p>
        <h1>Baca, tonton, dan dengarkan materi belajar</h1>
        <p>
          Metadata koleksi terbit dapat dilihat publik. Masuk diperlukan untuk membuka file utama
          melalui akses aman.
        </p>
      </header>

      <form [formGroup]="filters" (ngSubmit)="applyFilters($event)" class="filters" novalidate>
        <div class="field field--search">
          <label for="digital-search">Pencarian</label>
          <input
            id="digital-search"
            name="q"
            formControlName="search"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Judul, penulis, atau penerbit"
          />
        </div>
        <div class="field">
          <label for="digital-media">Jenis media</label>
          <select id="digital-media" name="media" formControlName="mediaType">
            <option value="">Semua media</option>
            <option value="ebook">E-book</option>
            <option value="module">Modul</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
        <div class="field">
          <label for="digital-sort">Urutkan</label>
          <select id="digital-sort" name="sort" formControlName="sort">
            <option value="latest">Terbaru</option>
            <option value="popular">Paling populer</option>
            <option value="title">Judul A-Z</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="button" type="submit" [disabled]="loading()">Terapkan</button>
          @if (hasActiveFilters()) {
            <button class="button button--secondary" type="button" (click)="clearFilters()">
              Hapus
            </button>
          }
        </div>
        <p class="filter-helper">
          Filter tersimpan di alamat halaman agar hasil mudah dibuka kembali.
        </p>
      </form>

      @if (loading()) {
        <div class="loading-state" role="status" aria-live="polite">
          <span>Memuat koleksi digital...</span>
        </div>
      }

      @if (error()) {
        <div class="feedback feedback--error" role="alert">
          <strong>Koleksi digital belum dapat dimuat.</strong>
          <span>{{ error() }}</span>
          <button class="button button--secondary" type="button" (click)="load()">Coba lagi</button>
        </div>
      }

      @if (!loading() && !error() && items().length > 0) {
        <div class="result-summary" role="status" aria-live="polite">
          <strong>{{ items().length }} koleksi ditemukan</strong>
          <span>{{ resultContext() }}</span>
        </div>
      }

      <div class="grid" [class.is-loading]="loading()">
        @for (item of items(); track item.id) {
          <article class="collection-card">
            <a
              class="cover-link"
              [routerLink]="['/koleksi-digital', item.slug]"
              [attr.aria-label]="'Buka detail ' + item.title"
            >
              @if (item.coverUrl) {
                <img
                  [src]="item.coverUrl"
                  [alt]="'Cover ' + item.title"
                  width="480"
                  height="640"
                  loading="lazy"
                  decoding="async"
                />
              } @else {
                <span class="placeholder" aria-hidden="true">{{
                  mediaLabel(item.media_type)
                }}</span>
              }
            </a>
            <div class="body">
              <div class="card-topline">
                <span class="badge">{{ mediaLabel(item.media_type) }}</span>
                <span class="access-badge">{{ downloadLabel(item) }}</span>
              </div>
              <h2>
                <a [routerLink]="['/koleksi-digital', item.slug]">{{ item.title }}</a>
              </h2>
              <dl class="metadata">
                <div>
                  <dt>Penulis</dt>
                  <dd>{{ item.author_text || 'Penulis tidak dicatat' }}</dd>
                </div>
                <div>
                  <dt>Kategori</dt>
                  <dd>{{ item.categories?.name || 'Tanpa kategori' }}</dd>
                </div>
              </dl>
              <small>{{ item.popularity }} aktivitas pembaca</small>
            </div>
          </article>
        }
      </div>

      @if (!loading() && !error() && items().length === 0) {
        <section class="empty-state" aria-labelledby="digital-empty-title">
          <h2 id="digital-empty-title">{{ emptyTitle() }}</h2>
          <p>{{ emptyMessage() }}</p>
          @if (hasActiveFilters()) {
            <button class="button button--secondary" type="button" (click)="clearFilters()">
              Tampilkan semua koleksi
            </button>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .page {
      width: min(var(--container-content), calc(100% - 2 * var(--page-gutter)));
      margin-inline: auto;
    }
    .catalog-hero {
      max-width: 48rem;
      margin-block-end: var(--space-8);
    }
    .catalog-hero h1 {
      margin: var(--space-2) 0 var(--space-4);
      font-family: var(--font-family-display);
      font-size: var(--text-4xl);
      text-wrap: balance;
    }
    .catalog-hero p:not(.eyebrow) {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-lg);
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(14rem, 2fr) repeat(2, minmax(10rem, 1fr)) auto;
      gap: var(--space-4);
      align-items: end;
      margin-block-end: var(--space-6);
      padding: var(--space-5);
      border: var(--border-width) solid var(--color-border);
      border-left: var(--border-width-accent) solid var(--color-brand-700);
      background: var(--color-surface);
    }
    .field {
      display: grid;
      gap: var(--space-2);
    }
    label {
      color: var(--color-text);
      font-weight: var(--weight-bold);
    }
    input,
    select {
      width: 100%;
      min-height: var(--control-height);
      padding: 0.65rem var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .filter-actions {
      display: flex;
      gap: var(--space-2);
    }
    .filter-helper {
      grid-column: 1 / -1;
      margin: calc(-1 * var(--space-1)) 0 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
    .collection-card {
      overflow: hidden;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .collection-card:focus-within,
    .collection-card:hover {
      border-color: var(--color-border-strong);
      box-shadow: var(--shadow-sm);
    }
    .cover-link {
      display: block;
      color: inherit;
      text-decoration: none;
    }
    .cover-link img,
    .placeholder {
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: cover;
    }
    .placeholder {
      display: grid;
      min-height: 11rem;
      place-items: center;
      background: linear-gradient(135deg, var(--color-brand-50), var(--color-surface-subtle));
      color: var(--color-brand-800);
      font-family: var(--font-family-display);
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
    }
    .body {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
    }
    .card-topline {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }
    .badge,
    .access-badge {
      display: inline-flex;
      min-height: 1.75rem;
      align-items: center;
      border-radius: var(--radius-pill);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      line-height: 1.2;
    }
    .badge {
      padding: 0 var(--space-3);
      border: var(--border-width) solid var(--color-border);
      background: var(--color-brand-50);
      color: var(--color-brand-800);
    }
    .access-badge {
      color: var(--color-text-muted);
    }
    h2 {
      margin: 0;
      font-family: var(--font-family-display);
      font-size: var(--text-xl);
      line-height: var(--leading-heading);
      text-wrap: balance;
    }
    h2 a {
      display: inline-flex;
      min-height: var(--control-height);
      align-items: center;
      color: var(--color-text);
      text-underline-offset: 0.18em;
    }
    h2 a:hover {
      color: var(--color-brand-800);
    }
    .metadata {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      color: var(--color-text-muted);
    }
    dt {
      color: var(--color-text);
      font-size: var(--text-xs);
      font-weight: var(--weight-bold);
    }
    dd {
      margin: 0;
    }
    small {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-variant-numeric: tabular-nums;
    }
    .loading-state,
    .feedback,
    .result-summary,
    .empty-state {
      margin-block: var(--space-5);
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    .loading-state,
    .feedback,
    .result-summary {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }
    .feedback--error {
      border-color: var(--color-danger);
      background: var(--color-danger-surface);
      color: var(--color-danger-strong);
    }
    .result-summary strong {
      color: var(--color-text);
    }
    .empty-state {
      display: grid;
      gap: var(--space-3);
      justify-items: start;
      margin-block-start: var(--space-6);
    }
    .empty-state h2,
    .empty-state p {
      margin: 0;
    }
    .empty-state h2 {
      font-family: var(--font-family-display);
    }
    @media (min-width: 64rem) {
      .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    @media (max-width: 48rem) {
      .filters {
        grid-template-columns: 1fr;
      }
      .filter-actions {
        align-items: stretch;
        flex-direction: column;
      }
      .filter-actions .button {
        width: 100%;
      }
    }
  `,
})
export class DigitalCatalogPage {
  private readonly api = inject(DigitalLibraryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    mediaType: new FormControl<DigitalMediaType | ''>('', { nonNullable: true }),
    sort: new FormControl<DigitalSort>('latest', { nonNullable: true }),
  });
  protected readonly items = signal<DigitalCollection[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly activeFilters = signal<DigitalCatalogFilters>({
    search: '',
    mediaType: '',
    sort: 'latest',
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const nextFilters = filtersFromParams(params);
      if (!sameFilters(this.filters.getRawValue(), nextFilters)) {
        this.filters.setValue(nextFilters, { emitEvent: false });
      }
      this.activeFilters.set(nextFilters);
      this.load(nextFilters);
    });
  }

  protected applyFilters(event?: Event) {
    event?.preventDefault();
    const nextFilters = normalizeFilters(this.filters.getRawValue());
    const currentFilters = filtersFromParams(this.route.snapshot.queryParamMap);
    if (sameFilters(currentFilters, nextFilters)) {
      this.activeFilters.set(nextFilters);
      this.load(nextFilters);
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParamsFromFilters(nextFilters),
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters() {
    const nextFilters: DigitalCatalogFilters = { search: '', mediaType: '', sort: 'latest' };
    this.filters.setValue(nextFilters, { emitEvent: false });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, media: null, sort: null },
      queryParamsHandling: 'merge',
    });
  }

  protected load(value: DigitalCatalogFilters = normalizeFilters(this.filters.getRawValue())) {
    const filters = normalizeFilters(value);
    this.loading.set(true);
    this.error.set('');
    this.api.list(filters).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.error.set('Periksa koneksi atau coba lagi dalam beberapa saat.');
        this.loading.set(false);
      },
    });
  }

  protected hasActiveFilters() {
    return !sameFilters(this.activeFilters(), { search: '', mediaType: '', sort: 'latest' });
  }

  protected resultContext() {
    const filters = this.activeFilters();
    const parts: string[] = [];
    if (filters.search) parts.push(`untuk "${filters.search}"`);
    if (filters.mediaType) parts.push(`jenis ${this.mediaLabel(filters.mediaType)}`);
    if (filters.sort === 'popular') parts.push('diurutkan paling populer');
    if (filters.sort === 'title') parts.push('diurutkan judul A-Z');
    return parts.length ? parts.join(', ') : 'di katalog digital';
  }

  protected emptyTitle() {
    return this.hasActiveFilters() ? 'Tidak ada hasil yang cocok' : 'Belum ada koleksi digital';
  }

  protected emptyMessage() {
    return this.hasActiveFilters()
      ? 'Ubah kata kunci, jenis media, atau urutan untuk memperluas hasil.'
      : 'Koleksi digital terbit akan tampil di sini setelah tersedia.';
  }

  protected mediaLabel(type: DigitalMediaType) {
    return ({ ebook: 'E-book', module: 'Modul', video: 'Video', audio: 'Audio' } as const)[type];
  }

  protected downloadLabel(item: DigitalCollection) {
    return item.is_downloadable ? 'Bisa diunduh setelah masuk' : 'Baca atau putar setelah masuk';
  }
}

function filtersFromParams(params: ParamMap): DigitalCatalogFilters {
  return normalizeFilters({
    search: params.get('q') ?? '',
    mediaType: params.get('media') ?? '',
    sort: params.get('sort') ?? 'latest',
  });
}

function normalizeFilters(value: {
  search: string;
  mediaType: string;
  sort: string;
}): DigitalCatalogFilters {
  return {
    search: value.search.trim(),
    mediaType: isMediaType(value.mediaType) ? value.mediaType : '',
    sort: isSort(value.sort) ? value.sort : 'latest',
  };
}

function queryParamsFromFilters(filters: DigitalCatalogFilters) {
  return {
    q: filters.search || null,
    media: filters.mediaType || null,
    sort: filters.sort === 'latest' ? null : filters.sort,
  };
}

function sameFilters(a: DigitalCatalogFilters, b: DigitalCatalogFilters) {
  return a.search === b.search && a.mediaType === b.mediaType && a.sort === b.sort;
}

function isMediaType(value: string): value is DigitalMediaType {
  return ['ebook', 'module', 'video', 'audio'].includes(value);
}

function isSort(value: string): value is DigitalSort {
  return ['latest', 'popular', 'title'].includes(value);
}
