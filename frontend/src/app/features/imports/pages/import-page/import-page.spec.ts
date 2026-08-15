import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ImportApiService, type ImportJob } from '../../data-access/import-api.service';
import { ImportPage } from './import-page';

const jobs: ImportJob[] = [
  {
    id: 'job-1',
    import_type: 'members',
    file_name: 'member-juli.xlsx',
    status: 'completed_with_errors',
    total_rows: 10,
    success_rows: 8,
    failed_rows: 2,
    created_at: '2026-07-22T03:30:00.000Z',
  },
  {
    id: 'job-2',
    import_type: 'books',
    file_name: 'buku-juli.csv',
    status: 'completed',
    total_rows: 5,
    success_rows: 5,
    failed_rows: 0,
    created_at: '2026-07-21T08:00:00.000Z',
  },
];

function setup(
  overrides: Partial<Record<'list' | 'upload' | 'template' | 'errors', unknown>> = {},
) {
  const list = vi.fn(() => of({ data: jobs }));
  const upload = vi.fn(() =>
    of({
      data: {
        id: 'job-new',
        import_type: 'members',
        file_name: 'member.xlsx',
        status: 'completed',
        total_rows: 3,
        success_rows: 3,
        failed_rows: 0,
        created_at: '2026-07-22T04:00:00.000Z',
      },
    }),
  );
  const template = vi.fn(() => of(new Blob(['template'])));
  const errors = vi.fn(() => of(new Blob(['row_number,error_message'])));
  const effectiveList = overrides.list ?? list;
  const effectiveUpload = overrides.upload ?? upload;
  const effectiveTemplate = overrides.template ?? template;
  const effectiveErrors = overrides.errors ?? errors;

  TestBed.configureTestingModule({
    imports: [ImportPage],
    providers: [
      { provide: AuthStore, useValue: { currentRole: () => 'librarian' } },
      {
        provide: ImportApiService,
        useValue: {
          list: effectiveList,
          upload: effectiveUpload,
          template: effectiveTemplate,
          errors: effectiveErrors,
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(ImportPage);
  fixture.detectChanges();
  return {
    fixture,
    list: effectiveList,
    upload: effectiveUpload,
    template: effectiveTemplate,
    errors: effectiveErrors,
  };
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  input.dispatchEvent(new Event('change'));
}

describe('ImportPage', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:import-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders consistent import panels and disables Import until a file is selected', () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(element.querySelectorAll('button')) as HTMLButtonElement[];

    expect(element.textContent).toContain('Import member dan buku');
    expect(element.textContent).toContain('Unduh template');
    expect(element.textContent).toContain('Pilih file member');
    expect(element.textContent).toContain('Belum ada file dipilih');
    expect(buttons.find((button) => button.textContent?.trim() === 'Import Member')?.disabled).toBe(
      true,
    );
    expect(
      buttons.find((button) => button.textContent?.trim() === 'Import Buku dan eksemplar')
        ?.disabled,
    ).toBe(true);
  });

  it('shows selected file name, size, type, and enables only that import action', async () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;
    const file = new File(['nis,full_name'], 'member-import.csv', { type: 'text/csv' });

    selectFile(element.querySelector('#import-members-file') as HTMLInputElement, file);
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(element.querySelectorAll('button')) as HTMLButtonElement[];
    expect(element.textContent).toContain('member-import.csv');
    expect(element.textContent).toContain('text/csv');
    expect(element.textContent).toContain('siap diimport');
    expect(buttons.find((button) => button.textContent?.trim() === 'Import Member')?.disabled).toBe(
      false,
    );
    expect(
      buttons.find((button) => button.textContent?.trim() === 'Import Buku dan eksemplar')
        ?.disabled,
    ).toBe(true);
  });

  it('shows upload failure near the related import panel without hiding the selected file', async () => {
    const { fixture, upload } = setup({
      upload: vi.fn(() => throwError(() => new Error('bad file'))),
    });
    const element: HTMLElement = fixture.nativeElement;
    const file = new File(['bad'], 'member-rusak.csv', { type: 'text/csv' });

    selectFile(element.querySelector('#import-members-file') as HTMLInputElement, file);
    fixture.detectChanges();
    (Array.from(element.querySelectorAll('button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.trim() === 'Import Member')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(upload).toHaveBeenCalledWith('members', file);
    expect(element.textContent).toContain('Import gagal dijalankan');
    expect(element.textContent).toContain('member-rusak.csv');
  });

  it('keeps partial failures visible and directs staff to CSV errors', async () => {
    const partialJob: ImportJob = {
      id: 'job-partial',
      import_type: 'members',
      file_name: 'member-partial.csv',
      status: 'completed_with_errors',
      total_rows: 4,
      success_rows: 2,
      failed_rows: 2,
      created_at: '2026-07-22T04:00:00.000Z',
    };
    const { fixture, upload } = setup({
      upload: vi.fn(() => of({ data: partialJob })),
    });
    const element: HTMLElement = fixture.nativeElement;
    const file = new File(['partial'], 'member-partial.csv', { type: 'text/csv' });

    selectFile(element.querySelector('#import-members-file') as HTMLInputElement, file);
    fixture.detectChanges();
    (Array.from(element.querySelectorAll('button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.trim() === 'Import Member')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(upload).toHaveBeenCalledWith('members', file);
    expect(element.textContent).toContain('selesai sebagian');
    expect(element.textContent).toContain('Unduh CSV error');
    expect(element.textContent?.match(/selesai sebagian/g)).toHaveLength(1);
  });

  it('renders history table semantics, localized status, counts, date, and CSV error action', () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.table-wrap')).not.toBeNull();
    expect(element.querySelector('caption')?.textContent).toContain(
      'Riwayat import member dan buku',
    );
    expect(element.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(element.textContent).toContain('Selesai sebagian');
    expect(element.textContent).toContain('Selesai');
    expect(element.textContent).toContain('Member');
    expect(element.textContent).toContain('Buku dan eksemplar');
    expect(element.textContent).toContain('8');
    expect(element.textContent).toContain('2');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-07-22T03:30:00.000Z',
    );
    expect(element.querySelector('.status-badge--warning')).not.toBeNull();
    expect(element.textContent).toContain('Tidak ada baris gagal');
  });

  it('downloads template and CSV error with clear job action', () => {
    const { fixture, template, errors } = setup();
    const element: HTMLElement = fixture.nativeElement;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    (Array.from(element.querySelectorAll('button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.includes('Unduh template'))
      ?.click();
    (Array.from(element.querySelectorAll('button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.includes('Unduh CSV error'))
      ?.click();

    expect(template).toHaveBeenCalledWith('members');
    expect(errors).toHaveBeenCalledWith('job-1');
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it('renders empty history state with next steps', () => {
    const empty = setup({ list: vi.fn(() => of({ data: [] })) });
    expect((empty.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Belum ada riwayat import',
    );
    expect((empty.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Unduh template, pilih file',
    );
  });

  it('renders history error state with retry action', () => {
    const failed = setup({ list: vi.fn(() => throwError(() => new Error('offline'))) });
    expect((failed.fixture.nativeElement as HTMLElement).textContent).toContain(
      'Riwayat import belum dapat dimuat',
    );
    expect((failed.fixture.nativeElement as HTMLElement).textContent).toContain('Coba lagi');
  });
});
