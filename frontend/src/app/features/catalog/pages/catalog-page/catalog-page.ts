import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CatalogApiService, type CatalogBook } from '../../data-access/catalog-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { parseApiError } from '../../../../core/errors/api-error';
import { CirculationApiService } from '../../../circulation/data-access/circulation-api.service';

@Component({
  selector: 'sdi-catalog-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
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
  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  /** Purely presentational view state — safe client-side additions from the new design. */
  protected readonly viewMode = signal<'grid' | 'list'>('grid');
  protected readonly selectedCategory = signal<string | null>(null);

  /** Category chips are derived from books actually returned by the API — never fabricated. */
  protected readonly categories = computed(() => {
    const names = new Set<string>();
    for (const book of this.books()) {
      if (book.categories?.name) names.add(book.categories.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  });

  /** Client-side category narrowing on top of the server-side text search. */
  protected readonly filteredBooks = computed(() => {
    const category = this.selectedCategory();
    const list = this.books();
    if (!category) return list;
    return list.filter((book) => book.categories?.name === category);
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const search = params.get('q')?.trim() ?? '';
      const category = params.get('category')?.trim() || null;
      const view = params.get('view');
      if (this.query.value !== search) {
        this.query.setValue(search, { emitEvent: false });
      }
      this.selectedCategory.set(category);
      this.viewMode.set(view === 'list' ? 'list' : 'grid');
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

  protected clearFilters() {
    this.query.setValue('', { emitEvent: false });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, category: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setViewMode(mode: 'grid' | 'list') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: mode === 'list' ? 'list' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setCategory(category: string | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category || null },
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

  protected hasActiveFilters() {
    return this.hasActiveSearch() || this.selectedCategory() !== null;
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

  /** Deterministic cover accent (0-5) from the book id, since the API has no cover art. */
  protected coverVariant(book: CatalogBook): number {
    let hash = 0;
    for (let i = 0; i < book.id.length; i++) {
      hash = (hash * 31 + book.id.charCodeAt(i)) % 6;
    }
    return hash;
  }

  private removeReservingId(bookId: string) {
    this.reservingIds.update((current) => {
      const next = new Set(current);
      next.delete(bookId);
      return next;
    });
  }

  private errorText(error: unknown, fallback: string) {
    return parseApiError(error, fallback).message;
  }
}
