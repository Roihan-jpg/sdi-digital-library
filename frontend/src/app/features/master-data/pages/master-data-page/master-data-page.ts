import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MasterDataApiService,
  type MasterKind,
  type MasterRow,
} from '../../data-access/master-data-api.service';
@Component({
  selector: 'sdi-master-data-page',
  imports: [ReactiveFormsModule],
  template: `<section>
    <p class="eyebrow">Referensi operasional</p>
    <h1>Master data</h1>
    <label
      >Jenis data<select [formControl]="kind" (change)="load()">
        @for (option of kinds; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select></label
    >
    <form [formGroup]="form" (ngSubmit)="save()">
      <h2>{{ editingId() ? 'Ubah' : 'Tambah' }} data</h2>
      <label>Nama<input formControlName="name" /></label>
      @if (kind.value === 'shelves') {
        <label>Kode rak<input formControlName="code" /></label>
      }
      @if (kind.value === 'categories') {
        <label>Slug<input formControlName="slug" /></label>
      }
      @if (kind.value === 'classes') {
        <label>Tingkat kelas (1–6)<input type="number" formControlName="gradeLevel" /></label
        ><label>ID tahun ajaran<input formControlName="schoolYearId" /></label>
      }
      @if (kind.value === 'study-groups') {
        <label>ID kelas<input formControlName="classId" /></label
        ><label>Wali kelas<input formControlName="homeroomTeacherName" /></label>
      }
      <label class="check"><input type="checkbox" formControlName="isActive" /> Aktif</label>
      <div>
        <button class="button">Simpan</button>
        @if (editingId()) {
          <button class="button button--secondary" type="button" (click)="reset()">Batal</button>
        }
      </div>
    </form>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    <table>
      <thead>
        <tr>
          <th>Nama</th>
          <th>Kode/tingkat</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.id) {
          <tr>
            <td>{{ row.name }}</td>
            <td>{{ row.code ?? row.grade_level ?? '—' }}</td>
            <td>{{ row.is_active === false ? 'Nonaktif' : 'Aktif' }}</td>
            <td>
              <button type="button" (click)="edit(row)">Ubah</button>
              <button type="button" (click)="remove(row)">Hapus</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </section>`,
  styles: `
    section {
      padding: 2rem;
      display: grid;
      gap: 1rem;
    }
    label,
    form {
      display: grid;
      gap: 0.4rem;
    }
    select,
    input {
      padding: 0.65rem;
      border: 1px solid #aebdb4;
      border-radius: 0.4rem;
    }
    form {
      max-width: 36rem;
      padding: 1rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
    }
    .check {
      display: flex;
    }
    form div {
      display: flex;
      gap: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    th,
    td {
      padding: 0.7rem;
      border-bottom: 1px solid #d5dfd9;
      text-align: left;
    }
  `,
})
export class MasterDataPage {
  private readonly api = inject(MasterDataApiService);
  protected readonly kinds: readonly { value: MasterKind; label: string }[] = [
    { value: 'school-years', label: 'Tahun ajaran' },
    { value: 'classes', label: 'Kelas' },
    { value: 'study-groups', label: 'Rombongan belajar' },
    { value: 'categories', label: 'Kategori' },
    { value: 'authors', label: 'Pengarang' },
    { value: 'publishers', label: 'Penerbit' },
    { value: 'shelves', label: 'Rak' },
    { value: 'replacement-cost-categories', label: 'Kategori biaya penggantian' },
  ];
  protected readonly kind = new FormControl<MasterKind>('school-years', { nonNullable: true });
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    slug: new FormControl('', { nonNullable: true }),
    gradeLevel: new FormControl(1, { nonNullable: true }),
    schoolYearId: new FormControl<string | null>(null),
    classId: new FormControl<string | null>(null),
    homeroomTeacherName: new FormControl<string | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    this.load();
  }
  protected load() {
    this.reset();
    this.api.list(this.kind.value).subscribe({
      next: (r) => this.rows.set(r.data),
      error: () => this.message.set('Master data belum dapat dimuat.'),
    });
  }
  protected save() {
    if (this.form.controls.name.invalid) return;
    const v = this.form.getRawValue();
    let body: Record<string, unknown> = { name: v.name, isActive: v.isActive };
    switch (this.kind.value) {
      case 'shelves':
        body = { ...body, code: v.code };
        break;
      case 'categories':
        body = { ...body, slug: v.slug };
        break;
      case 'classes':
        body = { ...body, gradeLevel: v.gradeLevel, schoolYearId: v.schoolYearId };
        break;
      case 'study-groups':
        body = { ...body, classId: v.classId, homeroomTeacherName: v.homeroomTeacherName };
        break;
      case 'replacement-cost-categories':
        body = {
          ...body,
          lostChargeMode: 'full_book_price',
          damagedChargeMode: 'percentage_of_price',
          damagedPercentage: 50,
        };
        break;
    }
    const id = this.editingId();
    const request = id
      ? this.api.update(this.kind.value, id, body)
      : this.api.create(this.kind.value, body);
    request.subscribe({
      next: () => {
        this.message.set('Master data berhasil disimpan.');
        this.load();
      },
      error: () =>
        this.message.set('Data tidak dapat disimpan. Periksa field wajib atau duplikasi.'),
    });
  }
  protected edit(row: MasterRow) {
    this.editingId.set(row.id);
    this.form.patchValue({
      name: row.name,
      code: row.code ?? '',
      gradeLevel: row.grade_level ?? 1,
      isActive: row.is_active ?? true,
    });
  }
  protected remove(row: MasterRow) {
    if (!confirm(`Hapus ${row.name}?`)) return;
    this.api.remove(this.kind.value, row.id).subscribe({
      next: () => this.load(),
      error: () => this.message.set('Data masih digunakan dan tidak dapat dihapus.'),
    });
  }
  protected reset() {
    this.editingId.set(null);
    this.form.reset({ gradeLevel: 1, isActive: true });
  }
}
