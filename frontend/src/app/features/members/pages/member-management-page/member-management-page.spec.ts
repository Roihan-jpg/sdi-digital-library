import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MasterDataApiService } from '../../../master-data/data-access/master-data-api.service';
import { MemberApiService, type Member } from '../../data-access/member-api.service';
import { MemberManagementPage } from './member-management-page';

const members: Member[] = [
  {
    id: 'member-1',
    member_code: 'MEM-001',
    card_number: 'PERPUS-001',
    student_card_number: 'PEL-001',
    is_student: true,
    nis: '12345',
    nisn: '0099887766',
    full_name: 'Alya Putri',
    gender: 'female',
    class_id: 'class-1',
    study_group_id: 'group-1',
    classes: { name: '4A' },
    study_groups: { name: 'Rombel A' },
    is_active: true,
  },
];

function setup(overrides: Partial<Record<'list' | 'create' | 'update', unknown>> = {}) {
  const list = vi.fn(() => of({ data: members, pagination: { total: members.length } }));
  const create = vi.fn(() => of({ data: members[0] }));
  const update = vi.fn(() => of({ data: members[0] }));
  const masterList = vi.fn((kind: string) =>
    of({
      data:
        kind === 'classes'
          ? [{ id: 'class-1', name: '4A', grade_level: 4, is_active: true }]
          : [{ id: 'group-1', name: 'Rombel A', class_id: 'class-1', is_active: true }],
    }),
  );

  TestBed.configureTestingModule({
    imports: [MemberManagementPage],
    providers: [
      {
        provide: MemberApiService,
        useValue: {
          list: overrides.list ?? list,
          create: overrides.create ?? create,
          update: overrides.update ?? update,
        },
      },
      { provide: MasterDataApiService, useValue: { list: masterList } },
    ],
  });

  const fixture = TestBed.createComponent(MemberManagementPage);
  fixture.detectChanges();
  return { fixture, list, create, update, masterList };
}

describe('MemberManagementPage', () => {
  it('renders contextual table headers, semantic status, and full identity values', () => {
    const { fixture } = setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('caption')?.textContent).toContain('Daftar member perpustakaan');
    expect(element.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(element.textContent).toContain('MEM-001');
    expect(element.textContent).toContain('NIS: 12345');
    expect(element.textContent).toContain('NISN: 0099887766');
    expect(element.textContent).toContain('Perpus: PERPUS-001');
    expect(element.textContent).toContain('Pelajar: PEL-001');
    expect(element.querySelector('.status-badge')?.textContent?.trim()).toBe('Aktif');
  });

  it('sends existing backend filters without exposing internal class IDs in the UI label', () => {
    const { fixture, list } = setup();
    const component = fixture.componentInstance as unknown as {
      filters: {
        setValue(value: {
          search: string;
          isStudent: '' | 'true' | 'false';
          isActive: '' | 'true' | 'false';
          classId: string;
        }): void;
      };
      search(): void;
    };

    component.filters.setValue({
      search: 'Alya',
      isStudent: 'true',
      isActive: 'true',
      classId: 'class-1',
    });
    component.search();

    expect(list).toHaveBeenLastCalledWith({
      search: 'Alya',
      isStudent: 'true',
      isActive: 'true',
      classId: 'class-1',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('4A - tingkat 4');
  });

  it('focuses the first invalid field and shows inline errors on invalid submit', async () => {
    const { fixture, create } = setup();
    const component = fixture.componentInstance as unknown as {
      startCreate(): void;
      save(): void;
    };

    component.startCreate();
    fixture.detectChanges();
    component.save();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#member-code') as HTMLInputElement,
    );
    expect(fixture.nativeElement.textContent).toContain('Periksa');
    expect(fixture.nativeElement.textContent).toContain('Kode member wajib diisi');
  });

  it('loads selected member values into the editor for edit actions', async () => {
    const { fixture } = setup();
    const button = fixture.nativeElement.querySelector('.table-action') as HTMLButtonElement;

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#member-code') as HTMLInputElement).value).toBe(
      'MEM-001',
    );
    expect((fixture.nativeElement.querySelector('#class-id') as HTMLSelectElement).value).toContain(
      'class-1',
    );
    expect(fixture.nativeElement.textContent).toContain('Ubah data member');
  });

  it('renders table error and retry action when the member list cannot load', () => {
    const { fixture } = setup({ list: vi.fn(() => throwError(() => new Error('offline'))) });
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Daftar member belum dapat dimuat');
    expect(element.textContent).toContain('Coba lagi');
  });
});
