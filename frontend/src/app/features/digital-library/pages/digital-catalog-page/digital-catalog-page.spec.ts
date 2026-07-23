import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection } from '../../models/digital-collection.model';
import { DigitalCatalogPage } from './digital-catalog-page';

const collections: DigitalCollection[] = [
  {
    id: 'digital-1',
    category_id: 'category-1',
    title: 'Modul Matematika Kelas 4',
    slug: 'modul-matematika-kelas-4',
    description: null,
    media_type: 'module',
    author_text: 'Tim Guru',
    publisher_text: 'SDI',
    publication_year: 2026,
    mime_type: 'application/pdf',
    file_size_bytes: null,
    duration_seconds: null,
    is_downloadable: true,
    is_published: true,
    published_at: '2026-07-01T00:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    categories: { name: 'Matematika' },
    coverUrl: 'https://storage.example.test/public-cover.jpg',
    popularity: 12,
  },
];

describe('DigitalCatalogPage', () => {
  it('loads filters from query params and renders stable cover metadata', async () => {
    const queryParamMap = new BehaviorSubject(
      convertToParamMap({ q: 'matematika', media: 'module', sort: 'popular' }),
    );
    const list = vi.fn(() =>
      of({ data: collections, pagination: { page: 1, limit: 50, total: 1 } }),
    );

    await TestBed.configureTestingModule({
      imports: [DigitalCatalogPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap.asObservable(),
            snapshot: { queryParamMap: queryParamMap.value },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
        { provide: DigitalLibraryApiService, useValue: { list } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DigitalCatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const cover = element.querySelector('.cover-link img') as HTMLImageElement;
    const titleLink = element.querySelector('h2 a') as HTMLAnchorElement;
    const coverLink = element.querySelector('.cover-link') as HTMLAnchorElement;

    expect(list).toHaveBeenCalledWith({
      search: 'matematika',
      mediaType: 'module',
      sort: 'popular',
    });
    expect(fixture.componentInstance.filters.getRawValue()).toEqual({
      search: 'matematika',
      mediaType: 'module',
      sort: 'popular',
    });
    expect(cover.getAttribute('width')).toBe('480');
    expect(cover.getAttribute('height')).toBe('640');
    expect(cover.getAttribute('loading')).toBe('lazy');
    expect(element.textContent).toContain('Modul');
    expect(element.textContent).toContain('Bisa diunduh setelah masuk');
    expect(titleLink.textContent).toContain('Modul Matematika Kelas 4');
    expect(coverLink.getAttribute('aria-label')).toBe('Buka detail Modul Matematika Kelas 4');
  });

  it('writes filters to query params on submit without exposing access URLs', async () => {
    const queryParamMap = convertToParamMap({});
    const navigate = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [DigitalCatalogPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(queryParamMap),
            snapshot: { queryParamMap },
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: DigitalLibraryApiService,
          useValue: {
            list: vi.fn(() => of({ data: [], pagination: { page: 1, limit: 50, total: 0 } })),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DigitalCatalogPage);
    fixture.detectChanges();
    fixture.componentInstance.filters.setValue({
      search: 'video sains',
      mediaType: 'video',
      sort: 'title',
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.any(Object),
      queryParams: { q: 'video sains', media: 'video', sort: 'title' },
      queryParamsHandling: 'merge',
    });
    expect(fixture.nativeElement.textContent).toContain('Belum ada koleksi digital');
    expect(fixture.nativeElement.innerHTML).not.toContain('/access');
  });
});
