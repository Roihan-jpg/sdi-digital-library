import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CatalogApiService, type CatalogBook } from '../../data-access/catalog-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { CirculationApiService } from '../../../circulation/data-access/circulation-api.service';

@Component({
  selector: 'sdi-catalog-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="catalog-hero">
        <div>
          <p class="eyebrow">Katalog publik</p>
          <h1>Temukan buku fisik perpustakaan</h1>
          <p>
            Cari judul, ISBN, kategori, atau penerbit. Katalog menampilkan ketersediaan ringkas
            tanpa membuka data eksemplar.
          </p>
        </div>
      </header>

      <form class="search-panel" (submit)="search($event)" novalidate>
        <label for="catalog-search">Cari buku</label>
        <div class="search-row">
          <input
            id="catalog-search"
            name="q"
            [formControl]="query"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Contoh: cerita rakyat..."
          />
          <button class="button" type="submit" [disabled]="loading()">Cari</button>
        </div>
        <p class="helper" id="catalog-search-helper">
          Pencarian tersimpan di alamat halaman agar mudah dibuka kembali.
        </p>
        @if (hasActiveSearch()) {
          <button class="link-button" type="button" (click)="clearSearch()">Hapus pencarian</button>
        }
      </form>

      @if (loading()) {
        <div
          class="grid skeleton-grid"
          role="status"
          aria-live="polite"
          aria-label="Memuat katalog"
        >
          @for (item of skeletonItems; track item) {
            <article class="book-card skeleton-card" aria-hidden="true">
              <span class="skeleton-line skeleton-badge"></span>
              <span class="skeleton-line skeleton-title"></span>
              <span class="skeleton-line"></span>
              <span class="skeleton-line skeleton-short"></span>
              <span class="skeleton-action"></span>
            </article>
          }
        </div>
      }

      @if (error()) {
        <div class="feedback feedback--error" role="alert">
          <strong>Katalog belum dapat dimuat.</strong>
          <span>{{ error() }}</span>
          <button class="button button--secondary" type="button" (click)="load()">Coba lagi</button>
        </div>
      }

      @if (!loading() && !error() && books().length > 0) {
        <div class="result-summary" role="status" aria-live="polite">
          <strong>{{ books().length }} buku ditemukan</strong>
          @if (hasActiveSearch()) {
            <span>untuk "{{ activeSearch() }}"</span>
          } @else {
            <span>di katalog publik</span>
          }
        </div>
      }

      <div class="grid" [class.is-loading]="loading()">
        @for (book of books(); track book.id) {
          <article class="book-card">
            <div class="card-topline">
              <span class="badge" [class.badge--available]="book.stock.available > 0">
                {{ stockStatusLabel(book) }}
              </span>
              <span class="copy-count">{{ stockCountLabel(book) }}</span>
            </div>

            <h2>{{ book.title }}</h2>
            @if (book.subtitle) {
              <p class="subtitle">{{ book.subtitle }}</p>
            }

            <dl class="metadata">
              <div>
                <dt>Kategori</dt>
                <dd>{{ book.categories?.name ?? 'Tanpa kategori' }}</dd>
              </div>
              <div>
                <dt>Penerbit</dt>
                <dd>{{ book.publishers?.name ?? 'Penerbit tidak dicatat' }}</dd>
              </div>
              <div>
                <dt>Tahun</dt>
                <dd>{{ book.publication_year ?? 'Tidak dicatat' }}</dd>
              </div>
              <div>
                <dt>ISBN</dt>
                <dd>{{ book.isbn ?? 'Tidak dicatat' }}</dd>
              </div>
            </dl>

            @if (authStore.currentRole() === 'member') {
              @if (reservationMessage(book.id); as message) {
                <p class="feedback-inline feedback-inline--success" role="status">
                  {{ message }}
                </p>
              }
              @if (reservationError(book.id); as reserveError) {
                <p class="feedback-inline feedback-inline--error" role="alert">
                  {{ reserveError }}
                </p>
              }
              <button
                class="button reserve"
                type="button"
                [disabled]="book.stock.available === 0 || isReserving(book.id)"
                [attr.aria-busy]="isReserving(book.id)"
                (click)="reserve(book)"
              >
                {{ isReserving(book.id) ? 'Memproses...' : reserveButtonLabel(book) }}
              </button>
            } @else if (!authStore.isAuthenticated()) {
              <p class="guest-note">Masuk sebagai member untuk mengajukan reservasi buku ini.</p>
              <a
                class="button button--secondary reserve"
                routerLink="/masuk"
                [queryParams]="{ redirect: currentPath() }"
                >Masuk untuk reservasi</a
              >
            } @else {
              <p class="guest-note">
                Reservasi hanya tersedia untuk akun member. Petugas tetap dapat membantu di
                perpustakaan.
              </p>
            }
          </article>
        }
      </div>

      @if (!loading() && !error() && books().length === 0) {
        <section class="empty-state" aria-labelledby="catalog-empty-title">
          <p class="eyebrow">Tidak ada hasil</p>
          <h2 id="catalog-empty-title">
            @if (hasActiveSearch()) {
              Belum ada buku yang cocok dengan "{{ activeSearch() }}"
            } @else {
              Katalog publik belum berisi buku
            }
          </h2>
          <p>Periksa ejaan, coba kata yang lebih umum, atau cari berdasarkan ISBN/kategori buku.</p>
          @if (hasActiveSearch()) {
            <button class="button button--secondary" type="button" (click)="clearSearch()">
              Lihat semua buku
            </button>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .catalog-hero h1 {
      max-width: 46rem;
      margin-bottom: var(--space-3, 0.75rem);
      font-family: var(--font-display, Lora, Georgia, serif);
    }
    .catalog-hero p {
      max-width: 48rem;
      color: var(--color-text-muted, #565a7d);
    }
    form {
      margin: var(--space-8, 2rem) 0;
      display: grid;
      gap: var(--space-2, 0.5rem);
    }
    .search-panel {
      position: sticky;
      top: var(--space-3, 0.75rem);
      z-index: 2;
      padding: var(--space-4, 1rem);
      border: var(--border-width-accent, 4px) solid var(--color-brand-700, #4f46e5);
      border-width: 0 0 0 var(--border-width-accent, 4px);
      border-radius: var(--radius-lg, 0.75rem);
      background: var(--color-surface, #ffffff);
      box-shadow: var(--shadow-sm, 0 1px 2px rgb(49 46 129 / 8%));
    }
    .search-row {
      display: flex;
      gap: var(--space-2, 0.5rem);
    }
    input {
      flex: 1;
      min-width: 0;
      min-height: 2.75rem;
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border: 1px solid var(--color-border-strong, #6366f1);
      border-radius: var(--radius-md, 0.5rem);
      color: var(--color-text, #312e81);
      font: inherit;
    }
    .helper,
    .guest-note,
    .copy-count,
    .subtitle {
      color: var(--color-text-muted, #565a7d);
    }
    .helper,
    .guest-note {
      margin: 0;
    }
    .link-button {
      justify-self: start;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-brand-700, #4f46e5);
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
      gap: var(--space-4, 1rem);
    }
    .book-card {
      display: flex;
      min-height: 20rem;
      flex-direction: column;
      gap: var(--space-4, 1rem);
      padding: var(--space-5, 1.25rem);
      border: 1px solid var(--color-border, #c7d2fe);
      border-radius: var(--radius-lg, 0.75rem);
      background: var(--color-surface, #ffffff);
    }
    .card-topline {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
      align-items: center;
      justify-content: space-between;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--space-3, 0.75rem);
      border: 1px solid var(--color-warning, #92400e);
      border-radius: 999px;
      background: var(--color-warning-surface, #fef3c7);
      color: var(--color-warning, #92400e);
      font-weight: 800;
    }
    .badge--available {
      border-color: var(--color-success, #15803d);
      background: var(--color-success-surface, #dcfce7);
      color: var(--color-success, #15803d);
    }
    h2 {
      margin: 0;
      color: var(--color-text, #312e81);
      font-family: var(--font-display, Lora, Georgia, serif);
      font-size: var(--text-xl, 1.25rem);
    }
    .metadata {
      display: grid;
      gap: var(--space-3, 0.75rem);
      margin: 0;
    }
    dt {
      color: var(--color-text-muted, #565a7d);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    dd {
      margin: 0;
      color: var(--color-text, #312e81);
      overflow-wrap: anywhere;
    }
    .reserve {
      width: 100%;
      min-height: 2.75rem;
      margin-top: auto;
    }
    .feedback,
    .empty-state {
      display: grid;
      gap: var(--space-3, 0.75rem);
      margin-block: var(--space-6, 1.5rem);
      padding: var(--space-5, 1.25rem);
      border: 1px solid var(--color-border, #c7d2fe);
      border-radius: var(--radius-lg, 0.75rem);
      background: var(--color-surface, #ffffff);
    }
    .feedback--error {
      border-color: var(--color-error, #b91c1c);
      background: var(--color-error-surface, #fef2f2);
      color: var(--color-danger-strong, #7f1d1d);
    }
    .feedback-inline {
      margin: 0;
      padding: var(--space-3, 0.75rem);
      border-radius: var(--radius-md, 0.5rem);
      font-weight: 700;
    }
    .feedback-inline--success {
      background: var(--color-success-surface, #dcfce7);
      color: var(--color-success, #15803d);
    }
    .feedback-inline--error {
      background: var(--color-error-surface, #fef2f2);
      color: var(--color-danger-strong, #7f1d1d);
    }
    .result-summary {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
      margin-bottom: var(--space-4, 1rem);
      color: var(--color-text-muted, #565a7d);
    }
    .result-summary strong {
      color: var(--color-text, #312e81);
    }
    .empty-state {
      max-width: 42rem;
    }
    .empty-state h2,
    .empty-state p {
      margin: 0;
    }
    .skeleton-card {
      pointer-events: none;
    }
    .skeleton-line,
    .skeleton-action {
      display: block;
      border-radius: var(--radius-md, 0.5rem);
      background: var(--color-surface-subtle, #ebeff9);
    }
    .skeleton-line {
      height: 0.9rem;
    }
    .skeleton-badge {
      width: 8rem;
      border-radius: 999px;
    }
    .skeleton-title {
      width: 75%;
      height: 1.4rem;
    }
    .skeleton-short {
      width: 55%;
    }
    .skeleton-action {
      width: 100%;
      height: 2.75rem;
      margin-top: auto;
    }
    @media (max-width: 40rem) {
      .search-panel {
        position: static;
      }
      .search-row {
        flex-direction: column;
      }
      .search-row .button {
        width: 100%;
      }
      .book-card {
        min-height: 0;
      }
    }
  `,
})
export class CatalogPage {
  private readonly api = inject(CatalogApiService);
  private readonly circulation = inject(CirculationApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);
  readonly query = new FormControl('', { nonNullable: true });
  protected readonly books = signal<CatalogBook[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly activeSearch = signal('');
  protected readonly reservingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly reservationErrors = signal<Record<string, string>>({});
  protected readonly reservationMessages = signal<Record<string, string>>({});
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6] as const;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const search = params.get('q')?.trim() ?? '';
      if (this.query.value !== search) {
        this.query.setValue(search, { emitEvent: false });
      }
      this.load();
    });
  }

  protected search(event: Event) {
    event.preventDefault();
    const search = this.query.value.trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: search || null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearSearch() {
    this.query.setValue('', { emitEvent: false });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  protected reserve(book: CatalogBook) {
    if (book.stock.available === 0 || this.isReserving(book.id)) return;
    this.reservingIds.update((current) => new Set(current).add(book.id));
    this.reservationErrors.update(({ [book.id]: _removed, ...rest }) => rest);
    this.reservationMessages.update(({ [book.id]: _removed, ...rest }) => rest);
    this.circulation
      .createReservation(book.id)
      .pipe(finalize(() => this.removeReservingId(book.id)))
      .subscribe({
        next: () => {
          this.reservationMessages.update((current) => ({
            ...current,
            [book.id]: 'Reservasi dibuat. Datang ke perpustakaan untuk diproses petugas.',
          }));
        },
        error: (error: unknown) => {
          this.reservationErrors.update((current) => ({
            ...current,
            [book.id]: this.errorText(error, 'Reservasi belum dapat dibuat.'),
          }));
        },
      });
  }

  protected load() {
    const search = this.query.value.trim();
    this.loading.set(true);
    this.error.set('');
    this.activeSearch.set(search);
    this.api.list(search).subscribe({
      next: (response) => {
        this.books.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Periksa koneksi atau coba muat ulang halaman.');
        this.loading.set(false);
      },
    });
  }

  protected hasActiveSearch() {
    return this.activeSearch().length > 0;
  }

  protected isReserving(bookId: string) {
    return this.reservingIds().has(bookId);
  }

  protected reservationError(bookId: string) {
    return this.reservationErrors()[bookId] ?? '';
  }

  protected reservationMessage(bookId: string) {
    return this.reservationMessages()[bookId] ?? '';
  }

  protected reserveButtonLabel(book: CatalogBook) {
    return book.stock.available === 0 ? 'Belum tersedia' : 'Reservasi buku';
  }

  protected stockStatusLabel(book: CatalogBook) {
    if (book.stock.available > 0) return 'Tersedia';
    return book.stock.total > 0 ? 'Sedang dipinjam' : 'Belum ada stok';
  }

  protected stockCountLabel(book: CatalogBook) {
    return `${book.stock.available} dari ${book.stock.total} eksemplar`;
  }

  protected currentPath() {
    const search = this.activeSearch();
    return search ? `/katalog?q=${encodeURIComponent(search)}` : '/katalog';
  }

  private removeReservingId(bookId: string) {
    this.reservingIds.update((current) => {
      const next = new Set(current);
      next.delete(bookId);
      return next;
    });
  }

  private errorText(error: unknown, fallback: string) {
    if (error instanceof HttpErrorResponse) {
      const message = this.responseMessage(error.error);
      if (message) return message;
    }
    return fallback;
  }

  private responseMessage(value: unknown) {
    if (!isRecord(value)) return '';
    const message = value['message'];
    return typeof message === 'string' && message.trim() ? message : '';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
