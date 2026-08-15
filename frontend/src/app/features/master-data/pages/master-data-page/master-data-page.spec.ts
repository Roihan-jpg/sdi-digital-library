import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { MasterDataApiService, type MasterRow } from '../../data-access/master-data-api.service';
import { MasterDataPage } from './master-data-page';

const rows: MasterRow[] = [
  { id: 'category-1', name: 'Pelajaran', is_active: true },
  { id: 'category-2', name: 'Arsip lama', is_active: false },
];

function setup(overrides: Partial<Record<'list' | 'create' | 'update' | 'remove', unknown>> = {}) {
  const list = vi.fn(() => of({ data: rows }));
  const create = vi.fn(() => of({ data: rows[0] }));
  const update = vi.fn(() => of({ data: rows[0] }));
  const remove = vi.fn(() => of({}));
  const effectiveList = overrides.list ?? list;
  const effectiveCreate = overrides.create ?? create;
  const effectiveUpdate = overrides.update ?? update;
  const effectiveRemove = overrides.remove ?? remove;

  TestBed.configureTestingModule({
    imports: [MasterDataPage],
    providers: [
      { provide: AuthStore, useValue: { currentRole: () => 'librarian' } },
      {
        provide: MasterDataApiService,
        useValue: {
          list: effectiveList,
          create: effectiveCreate,
          update: effectiveUpdate,
          remove: effectiveRemove,
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(MasterDataPage);
  fixture.detectChanges();
  return {
    fixture,
    list: effectiveList,
    create: effectiveCreate,
    update: effectiveUpdate,
    remove: effectiveRemove,
  };
}

function waitForScheduledFocus() {
  return new Promise((resolve) => setTimeout(resolve));
}

describe('MasterDataPage', () => {
  it('renders responsive table semantics, status labels, and separated actions', () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.table-wrap')).not.toBeNull();
    expect(element.querySelector('caption')?.textContent).toContain('Daftar tahun ajaran');
    expect(element.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(element.textContent).toContain('Pelajaran');
    expect(element.textContent).toContain('Aktif');
    expect(element.textContent).toContain('Nonaktif');
    expect(element.querySelector('.table-action--danger')?.textContent?.trim()).toBe('Hapus');
  });

  it('changes the dynamic form helper without clearing focus from the kind selector', async () => {
    const { fixture, list } = setup();
    const select = fixture.nativeElement.querySelector('#master-kind') as HTMLSelectElement;

    select.focus();
    select.value = 'shelves';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.activeElement).toBe(select);
    expect(list).toHaveBeenLastCalledWith('shelves');
    expect(fixture.nativeElement.textContent).toContain('Kode rak');
    expect(fixture.nativeElement.textContent).toContain('Kode ini membantu petugas');
  });

  it('focuses the first invalid visible field and shows inline field errors', async () => {
    const { fixture, create } = setup();
    const component = fixture.componentInstance as unknown as { save(): void };

    component.save();
    await fixture.whenStable();
    fixture.detectChanges();
    await waitForScheduledFocus();

    expect(create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#master-name') as HTMLInputElement,
    );
    expect(fixture.nativeElement.textContent).toContain('Nama wajib diisi.');
    expect(fixture.nativeElement.textContent).toContain('Periksa field yang wajib diisi');
  });

  it('requires code only for shelf data and keeps the API payload contract', async () => {
    const { fixture, create } = setup();
    const component = fixture.componentInstance as unknown as {
      kind: { setValue(value: 'shelves'): void };
      changeKind(): void;
      form: {
        controls: {
          name: { setValue(value: string): void };
          code: { setValue(value: string): void };
        };
      };
      save(): void;
    };

    component.kind.setValue('shelves');
    component.changeKind();
    component.form.controls.name.setValue('Rak A1');
    component.form.controls.code.setValue('RAK-A1');
    component.save();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith('shelves', {
      name: 'Rak A1',
      isActive: true,
      code: 'RAK-A1',
    });
  });

  it('creates a new school year inactive when another active period may already exist', async () => {
    const { fixture, create } = setup();
    const component = fixture.componentInstance as unknown as {
      form: { controls: { name: { setValue(value: string): void } } };
      save(): void;
    };

    component.form.controls.name.setValue('2027/2028');
    component.save();
    await fixture.whenStable();

    expect(create).toHaveBeenCalledWith('school-years', {
      name: '2027/2028',
      isActive: false,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Master data berhasil disimpan.');
  });

  it('edits a school year from the table and sends the selected row id', async () => {
    const { fixture, update } = setup();
    const editButton = fixture.nativeElement.querySelector('.table-action') as HTMLButtonElement;

    editButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { controls: { name: { setValue(value: string): void } } };
      save(): void;
    };
    component.form.controls.name.setValue('Pelajaran diperbarui');
    component.save();
    await fixture.whenStable();

    expect(update).toHaveBeenCalledWith('school-years', 'category-1', {
      name: 'Pelajaran diperbarui',
      isActive: true,
    });
  });

  it('opens an accessible delete dialog and does not call the API before confirmation', async () => {
    const { fixture, remove } = setup();
    const nativeConfirm = vi.spyOn(window, 'confirm');
    const deleteButton = fixture.nativeElement.querySelector(
      '.table-action--danger',
    ) as HTMLButtonElement;

    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    await waitForScheduledFocus();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Hapus Pelajaran?');
    expect(dialog.textContent).toContain('sistem akan menolak penghapusan');
    expect(document.activeElement?.textContent?.trim()).toBe('x');

    nativeConfirm.mockRestore();
  });

  it('returns focus after Escape closes the delete dialog', async () => {
    const { fixture } = setup();
    const deleteButton = fixture.nativeElement.querySelector(
      '.table-action--danger',
    ) as HTMLButtonElement;

    deleteButton.focus();
    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.modal-backdrop')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    fixture.detectChanges();
    await waitForScheduledFocus();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(deleteButton);
  });

  it('shows the next step when delete is rejected because data is still used', async () => {
    const { fixture, remove } = setup({
      remove: vi.fn(() => throwError(() => new Error('still used'))),
    });
    const deleteButton = fixture.nativeElement.querySelector(
      '.table-action--danger',
    ) as HTMLButtonElement;

    deleteButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    await waitForScheduledFocus();
    const confirmButton = (
      Array.from(
        fixture.nativeElement.querySelectorAll('.delete-dialog .button'),
      ) as HTMLButtonElement[]
    ).find((button) => button.textContent?.includes('Hapus data')) as HTMLButtonElement;
    confirmButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(remove).toHaveBeenCalledWith('school-years', 'category-1');
    expect(fixture.nativeElement.textContent).toContain('masih digunakan oleh data lain');
    expect(fixture.nativeElement.textContent).toContain('Nonaktifkan data ini');
  });

  it('renders table error and retry action when the list cannot load', () => {
    const { fixture } = setup({ list: vi.fn(() => throwError(() => new Error('offline'))) });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Daftar belum dapat dimuat');
    expect(element.textContent).toContain('Coba lagi');
  });
});
