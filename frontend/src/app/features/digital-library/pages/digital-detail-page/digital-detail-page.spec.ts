import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection } from '../../models/digital-collection.model';
import { DigitalDetailPage } from './digital-detail-page';
import { axeViolations } from '../../../../../testing/axe-testing';

const collection: DigitalCollection = {
  id: 'digital-1',
  category_id: 'category-1',
  title: 'Modul Matematika Kelas 4',
  slug: 'modul-matematika-kelas-4',
  description: 'Materi belajar pecahan untuk kelas empat.',
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
  coverUrl: null,
  popularity: 12,
};

describe('DigitalDetailPage', () => {
  it('shows a media-aware cover fallback and protects file access for guests', async () => {
    const detail = vi.fn(() => of({ data: collection }));

    await TestBed.configureTestingModule({
      imports: [DigitalDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: collection.slug }) } },
        },
        { provide: AuthStore, useValue: { isAuthenticated: () => false } },
        { provide: DigitalLibraryApiService, useValue: { detail, access: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DigitalDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(detail).toHaveBeenCalledWith(collection.slug);
    expect(element.querySelector('.detail-cover-fallback')).not.toBeNull();
    expect(element.textContent).toContain('Modul');
    expect(element.textContent).toContain('Silakan masuk untuk membuka file penuh.');
    expect(element.querySelector('.viewer')).toBeNull();
    expect(await axeViolations(element)).toEqual([]);
  }, 15_000);
});
