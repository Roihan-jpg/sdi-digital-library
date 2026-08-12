import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CatalogApiService } from '../../../catalog/data-access/catalog-api.service';
import { DigitalLibraryApiService } from '../../../digital-library/data-access/digital-library-api.service';
import { HomePage } from './home-page';
import { axeViolations } from '../../../../../testing/axe-testing';

describe('HomePage', () => {
  it('renders the five-chapter bookstage from real catalog responses', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: CatalogApiService,
          useValue: {
            list: () =>
              of({
                data: [
                  {
                    id: 'book-1',
                    title: 'Atlas Nusantara',
                    subtitle: null,
                    isbn: null,
                    publication_year: 2025,
                    categories: { name: 'Pengetahuan' },
                    publishers: { name: 'Penerbit Sekolah' },
                    stock: { total: 3, available: 2 },
                  },
                ],
                pagination: { page: 1, limit: 20, total: 1 },
              }),
          },
        },
        {
          provide: DigitalLibraryApiService,
          useValue: { list: () => of({ data: [], pagination: { page: 1, limit: 50, total: 0 } }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('[data-chapter]')).toHaveLength(5);
    expect(element.textContent).toContain('Atlas Nusantara');
    expect(element.textContent).not.toContain('3.240+');
    expect(element.textContent).not.toContain('Siswa Terdaftar');
    expect(element.querySelector('.perspective-shelf')).toBeNull();
    expect(element.querySelectorAll('.hero-discovery__routes a')).toHaveLength(3);
    expect(element.textContent).toContain('Ruang baca terpadu');
    expect(await axeViolations(element)).toEqual([]);
  }, 15_000);
});
