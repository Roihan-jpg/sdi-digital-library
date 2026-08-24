import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import { DigitalUploadService } from '../../data-access/digital-upload.service';
import { DigitalManagementPage } from './digital-management-page';

const masterData: Record<'categories' | 'authors' | 'publishers', MasterRow[]> = {
  categories: [
    { id: 'category-1', name: 'Pelajaran', slug: 'pelajaran' },
    { id: 'category-2', name: 'Modul', slug: 'modul' },
  ],
  authors: [{ id: 'author-1', name: 'Siti Aminah' }],
  publishers: [{ id: 'publisher-1', name: 'Penerbit Sekolah' }],
};

function setup() {
  TestBed.configureTestingModule({
    imports: [DigitalManagementPage],
    providers: [
      { provide: AuthStore, useValue: { currentRole: () => 'librarian' } },
      {
        provide: DigitalLibraryApiService,
        useValue: { management: vi.fn(() => of({ data: [] })) },
      },
      { provide: DigitalUploadService, useValue: {} },
      {
        provide: MasterDataApiService,
        useValue: {
          list: vi.fn((kind: keyof typeof masterData) => of({ data: masterData[kind] ?? [] })),
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(DigitalManagementPage);
  fixture.detectChanges();
  return fixture;
}

describe('DigitalManagementPage', () => {
  it('renders author and publisher dropdowns from master data and preserves legacy values', () => {
    const fixture = setup();
    const component = fixture.componentInstance as unknown as {
      form: { controls: { authorText: { setValue(value: string): void } } };
    };

    component.form.controls.authorText.setValue('Penulis Lama');
    fixture.detectChanges();

    const author = fixture.nativeElement.querySelector(
      '[formControlName="authorText"]',
    ) as HTMLSelectElement;
    const publisher = fixture.nativeElement.querySelector(
      '[formControlName="publisherText"]',
    ) as HTMLSelectElement;

    expect(author.tagName).toBe('SELECT');
    expect(author.textContent).toContain('Siti Aminah');
    expect(author.textContent).toContain('Penulis Lama');
    expect(publisher.tagName).toBe('SELECT');
    expect(publisher.textContent).toContain('Penerbit Sekolah');
  });

  it('prefixes an automatic slug with the selected category and preserves a manual slug', () => {
    const fixture = setup();
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          categoryId: { setValue(value: string): void };
          title: { setValue(value: string): void };
          slug: { setValue(value: string): void; value: string };
        };
      };
      suggestSlug(): void;
      markSlugEdited(): void;
    };

    component.form.controls.categoryId.setValue('category-1');
    component.form.controls.title.setValue('Modul Matematika');
    component.suggestSlug();

    expect(component.form.controls.slug.value).toBe('pelajaran-modul-matematika');

    component.form.controls.slug.setValue('modul-pilihan');
    component.markSlugEdited();
    component.form.controls.categoryId.setValue('category-2');
    component.suggestSlug();

    expect(component.form.controls.slug.value).toBe('modul-pilihan');
  });
});
