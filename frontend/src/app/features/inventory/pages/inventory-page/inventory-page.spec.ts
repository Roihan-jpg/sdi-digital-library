import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { MasterDataApiService } from '../../../master-data/data-access/master-data-api.service';
import { InventoryApiService } from '../../data-access/inventory-api.service';
import { InventoryPage } from './inventory-page';

const titleOption = {
  id: 'title-1',
  catalog_code: 'KAT-001',
  isbn: '978602000001',
  title: 'Matematika Kelas 4',
  subtitle: null,
  publication_year: 2024,
  categories: { name: 'Pelajaran' },
  publishers: { name: 'Penerbit Sekolah' },
  stock: { total: 2, available: 1 },
};

function setup(overrides: Partial<Record<'createTitle' | 'createCopy', unknown>> = {}) {
  const createTitle = vi.fn(() => of({ data: { id: 'title-new' } }));
  const createCopy = vi.fn(() => of({ data: { id: 'copy-1', inventory_code: 'INV-SDI-001' } }));
  const masterList = vi.fn((kind: string) =>
    of({
      data: [
        {
          id: `${kind}-1`,
          code: kind === 'shelves' ? 'RAK-A1' : undefined,
          name:
            kind === 'categories'
              ? 'Pelajaran'
              : kind === 'authors'
                ? 'Siti Aminah'
                : kind === 'publishers'
                  ? 'Penerbit Sekolah'
                  : 'Rak A1',
          is_active: true,
        },
      ],
    }),
  );
  const listTitles = vi.fn(() =>
    of({
      data: [titleOption],
      pagination: { page: 1, limit: 100, total: 1 },
    }),
  );

  TestBed.configureTestingModule({
    imports: [InventoryPage],
    providers: [
      { provide: AuthStore, useValue: { currentRole: () => 'librarian' } },
      {
        provide: InventoryApiService,
        useValue: {
          listTitles,
          createTitle: overrides.createTitle ?? createTitle,
          createCopy: overrides.createCopy ?? createCopy,
          print: vi.fn(() => of('<html></html>')),
        },
      },
      { provide: MasterDataApiService, useValue: { list: masterList } },
    ],
  });

  const fixture = TestBed.createComponent(InventoryPage);
  fixture.detectChanges();
  return { fixture, createTitle, createCopy, listTitles, masterList };
}

describe('InventoryPage', () => {
  it('renders human labels for master data, titles, condition, and status', () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Pelajaran');
    expect(element.textContent).toContain('Siti Aminah');
    expect(element.textContent).toContain('Penerbit Sekolah');
    expect(element.textContent).toContain('RAK-A1 - Rak A1');
    expect(element.textContent).toContain(
      'Matematika Kelas 4 (KAT-001 | 978602000001 | Pelajaran)',
    );
    expect(element.textContent).toContain('Direservasi');
    expect(element.textContent).toContain('Dipinjam');
    expect(element.textContent).toContain('Kode ini adalah payload barcode/QR persis');
  });

  it('focuses the first invalid title field and shows inline errors', async () => {
    const { fixture, createTitle } = setup();
    const component = fixture.componentInstance as unknown as { saveTitle(): void };

    component.saveTitle();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(createTitle).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#title-title') as HTMLInputElement,
    );
    expect(fixture.nativeElement.textContent).toContain('Judul wajib diisi.');
  });

  it('focuses the first invalid copy field and preserves inventory code as a data field', async () => {
    const { fixture, createCopy } = setup();
    const component = fixture.componentInstance as unknown as { saveCopy(): void };

    component.saveCopy();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(createCopy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#copy-book-title') as HTMLSelectElement,
    );
    expect(fixture.nativeElement.textContent).toContain('Judul buku wajib diisi.');
    expect(
      (fixture.nativeElement.querySelector('#copy-inventory-code') as HTMLInputElement).className,
    ).toContain('data-input');
  });

  it('does not lock the copy form while a title save is in progress', () => {
    const pendingTitle = new Subject<{ data: { id: string } }>();
    const { fixture } = setup({ createTitle: vi.fn(() => pendingTitle.asObservable()) });
    const component = fixture.componentInstance as unknown as {
      titleForm: {
        controls: {
          title: { setValue(value: string): void };
        };
      };
      saveTitle(): void;
    };

    component.titleForm.controls.title.setValue('Bahasa Indonesia Kelas 5');
    component.saveTitle();
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const titleButton = buttons.find((button) => button.textContent?.includes('Menyimpan judul'));
    const copyButton = buttons.find((button) => button.textContent?.includes('Simpan eksemplar'));

    expect(titleButton?.disabled).toBe(true);
    expect(copyButton?.disabled).toBe(false);
  });

  it('submits copy payload without changing the inventory code value', () => {
    const { fixture, createCopy } = setup();
    const component = fixture.componentInstance as unknown as {
      copyForm: {
        setValue(value: {
          bookTitleId: string;
          inventoryCode: string;
          shelfId: string | null;
          condition: 'new' | 'good' | 'fair' | 'damaged' | 'lost';
          status:
            'available' | 'reserved' | 'loaned' | 'damaged' | 'lost' | 'maintenance' | 'inactive';
        }): void;
      };
      saveCopy(): void;
    };

    component.copyForm.setValue({
      bookTitleId: 'title-1',
      inventoryCode: 'INV/SDI/2026/001',
      shelfId: 'shelves-1',
      condition: 'good',
      status: 'available',
    });
    component.saveCopy();

    expect(createCopy).toHaveBeenCalledWith({
      bookTitleId: 'title-1',
      inventoryCode: 'INV/SDI/2026/001',
      shelfId: 'shelves-1',
      condition: 'good',
      status: 'available',
      isActive: true,
    });
  });
});
