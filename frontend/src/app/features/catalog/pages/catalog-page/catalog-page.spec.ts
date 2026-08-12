import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { CirculationApiService } from '../../../circulation/data-access/circulation-api.service';
import { CatalogApiService, type CatalogBook } from '../../data-access/catalog-api.service';
import { CatalogPage } from './catalog-page';
import { axeViolations } from '../../../../../testing/axe-testing';

const books: CatalogBook[] = [
  {
    id: 'book-1',
    title: 'Petualangan di Hutan Tosca',
    subtitle: 'Cerita untuk pembaca muda',
    isbn: '978000000001',
    publication_year: 2026,
    categories: { name: 'Cerita Anak' },
    publishers: { name: 'Pustaka SDI' },
    stock: { total: 3, available: 2 },
  },
];

describe('CatalogPage', () => {
  it('loads the server search from query params and preserves the guest reservation path', async () => {
    const params = new BehaviorSubject(convertToParamMap({ q: 'hutan', category: 'Cerita Anak' }));
    const list = vi.fn(() => of({ data: books, pagination: { page: 1, limit: 20, total: 1 } }));

    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: params.asObservable(),
            snapshot: { queryParamMap: params.value },
          },
        },
        { provide: CatalogApiService, useValue: { list } },
        { provide: CirculationApiService, useValue: { createReservation: vi.fn() } },
        {
          provide: AuthStore,
          useValue: { currentRole: () => null, isAuthenticated: () => false },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(list).toHaveBeenCalledWith('hutan');
    expect(element.textContent).toContain('Petualangan di Hutan Tosca');
    expect(element.textContent).toContain('2 dari 3 eksemplar');
    expect(element.textContent).toContain('Masuk untuk reservasi');
    expect(element.querySelector('.chip.active')?.textContent).toContain('Cerita Anak');
    expect(await axeViolations(element)).toEqual([]);
  }, 15_000);

  it('keeps member reservation feedback inline and prevents duplicate submission', async () => {
    const params = convertToParamMap({});
    const createReservation = vi.fn(() => of({ data: { id: 'reservation-1' } }));

    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(params), snapshot: { queryParamMap: params } },
        },
        {
          provide: CatalogApiService,
          useValue: {
            list: vi.fn(() => of({ data: books, pagination: { page: 1, limit: 20, total: 1 } })),
          },
        },
        { provide: CirculationApiService, useValue: { createReservation } },
        {
          provide: AuthStore,
          useValue: { currentRole: () => 'member', isAuthenticated: () => true },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.reserve') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(createReservation).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Reservasi dibuat.');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('writes search and view mode back to the existing query-param interface', async () => {
    const params = convertToParamMap({});

    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(params), snapshot: { queryParamMap: params } },
        },
        {
          provide: CatalogApiService,
          useValue: {
            list: vi.fn(() => of({ data: books, pagination: { page: 1, limit: 20, total: 1 } })),
          },
        },
        { provide: CirculationApiService, useValue: { createReservation: vi.fn() } },
        { provide: AuthStore, useValue: { currentRole: () => null, isAuthenticated: () => false } },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    fixture.componentInstance.query.setValue('sains');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.nativeElement.querySelector('[aria-label="Tampilan daftar"]').click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { q: 'sains' } }),
    );
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { view: 'list' }, replaceUrl: true }),
    );
  });
});
