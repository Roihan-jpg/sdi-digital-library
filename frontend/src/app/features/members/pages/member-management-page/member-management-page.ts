import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MemberApiService,
  type Member,
  type MemberPayload,
} from '../../data-access/member-api.service';
@Component({
  selector: 'sdi-member-management-page',
  imports: [ReactiveFormsModule],
  template: `<section>
    <p class="eyebrow">Data utama</p>
    <h1>Member</h1>
    <form class="search" (submit)="search($event)">
      <label for="member-search">Cari member</label>
      <div>
        <input
          id="member-search"
          [formControl]="searchControl"
          placeholder="Nama, NIS, atau nomor kartu"
        /><button class="button">Cari</button>
      </div>
    </form>
    <button class="button button--secondary" type="button" (click)="startCreate()">
      Tambah member
    </button>
    @if (showForm()) {
      <form class="editor" [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editingId() ? 'Ubah' : 'Tambah' }} member</h2>
        <label>Kode member<input formControlName="memberCode" /></label
        ><label>Nomor kartu perpustakaan<input formControlName="libraryCardNumber" /></label
        ><label>Nama lengkap<input formControlName="fullName" /></label
        ><label
          >Jenis member<select formControlName="isStudent">
            <option [ngValue]="true">Siswa</option>
            <option [ngValue]="false">Non-siswa</option>
          </select></label
        ><label
          >Jenis kelamin<select formControlName="gender">
            <option value="unknown">Tidak dicatat</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select></label
        >
        @if (form.controls.isStudent.value) {
          <label>NIS<input formControlName="nis" /></label
          ><label>NISN<input formControlName="nisn" /></label
          ><label>Nomor kartu pelajar<input formControlName="studentCardNumber" /></label
          ><label
            >ID kelas<input formControlName="classId" placeholder="Pilih dari master data" /></label
          ><label>ID rombongan belajar<input formControlName="studyGroupId" /></label>
        }
        <label class="check"
          ><input type="checkbox" formControlName="isActive" /> Member aktif</label
        >
        <div class="actions">
          <button class="button" [disabled]="saving()">
            {{ saving() ? 'Menyimpan…' : 'Simpan' }}</button
          ><button type="button" class="button button--secondary" (click)="showForm.set(false)">
            Batal
          </button>
        </div>
      </form>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    <div class="table">
      <table>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>NIS/NISN</th>
            <th>Kartu</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          @for (member of members(); track member.id) {
            <tr>
              <td>{{ member.member_code }}</td>
              <td>{{ member.full_name }}</td>
              <td>{{ member.nis ?? '—' }} / {{ member.nisn ?? '—' }}</td>
              <td>{{ member.card_number }}</td>
              <td>{{ member.is_active ? 'Aktif' : 'Nonaktif' }}</td>
              <td><button type="button" (click)="edit(member)">Ubah</button></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </section>`,
  styles: `
    section {
      padding: 2rem;
    }
    .search,
    .editor {
      display: grid;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .search div,
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .search input {
      min-width: min(28rem, 70vw);
    }
    input,
    select {
      padding: 0.65rem;
      border: 1px solid #aebdb4;
      border-radius: 0.4rem;
    }
    .editor {
      max-width: 42rem;
      padding: 1rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
    }
    .editor label {
      display: grid;
      gap: 0.3rem;
    }
    .check {
      display: flex !important;
    }
    .table {
      overflow: auto;
      margin-top: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    th,
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #d5dfd9;
      text-align: left;
    }
  `,
})
export class MemberManagementPage {
  private readonly api = inject(MemberApiService);
  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly members = signal<Member[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly form = new FormGroup({
    memberCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    libraryCardNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    studentCardNumber: new FormControl<string | null>(null),
    isStudent: new FormControl(true, { nonNullable: true }),
    nis: new FormControl<string | null>(null),
    nisn: new FormControl<string | null>(null),
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    gender: new FormControl<'male' | 'female' | 'unknown'>('unknown', { nonNullable: true }),
    classId: new FormControl<string | null>(null),
    studyGroupId: new FormControl<string | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    this.load();
  }
  protected search(e: Event) {
    e.preventDefault();
    this.load();
  }
  protected startCreate() {
    this.editingId.set(null);
    this.form.reset({ isStudent: true, gender: 'unknown', isActive: true });
    this.showForm.set(true);
  }
  protected edit(m: Member) {
    this.editingId.set(m.id);
    this.form.reset({
      memberCode: m.member_code,
      libraryCardNumber: m.card_number,
      studentCardNumber: m.student_card_number,
      isStudent: m.is_student,
      nis: m.nis,
      nisn: m.nisn,
      fullName: m.full_name,
      gender: m.gender,
      classId: m.class_id,
      studyGroupId: m.study_group_id,
      isActive: m.is_active,
    });
    this.showForm.set(true);
  }
  protected save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.getRawValue() as MemberPayload;
    const request = this.editingId()
      ? this.api.update(this.editingId()!, payload)
      : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.message.set('Data member berhasil disimpan.');
        this.saving.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: () => {
        this.message.set('Data member tidak dapat disimpan. Periksa field wajib dan duplikasi.');
        this.saving.set(false);
      },
    });
  }
  private load() {
    this.api.list(this.searchControl.value).subscribe({
      next: (r) => this.members.set(r.data),
      error: () => this.message.set('Daftar member belum dapat dimuat.'),
    });
  }
}
