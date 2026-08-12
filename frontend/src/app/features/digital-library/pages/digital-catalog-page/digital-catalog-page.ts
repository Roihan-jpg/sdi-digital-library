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
  templateUrl: './digital-catalog-page.html',
  styleUrl: './digital-catalog-page.css',
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
    return ({ ebook: 'E-book', module: 'Modul', video: 'Video' } as const)[type];
  }

  protected downloadLabel(item: DigitalCollection) {
    return item.is_downloadable ? 'Bisa diunduh setelah masuk' : 'Baca atau tonton setelah masuk';
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
  return ['ebook', 'module', 'video'].includes(value);
}

function isSort(value: string): value is DigitalSort {
  return ['latest', 'popular', 'title'].includes(value);
}
