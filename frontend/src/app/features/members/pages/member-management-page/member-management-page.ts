import { Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../../core/auth/auth.store';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  FeedbackBanner,
  type FeedbackMessage,
} from '../../../../shared/components/feedback-banner/feedback-banner';
import { forkJoin } from 'rxjs';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import {
  MemberApiService,
  type Member,
  type MemberPayload,
} from '../../data-access/member-api.service';

@Component({
  selector: 'sdi-member-management-page',
  imports: [ReactiveFormsModule, FeedbackBanner],
  template: `
    <section class="page page--wide member-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Data utama</p>
          <h1>Manajemen member</h1>
        </div>
        @if (canWrite()) {
          <button class="button" type="button" (click)="startCreate()">Tambah member</button>
        }
      </header>

      <section class="card toolbar-panel" aria-labelledby="member-filter-title">
        <div class="panel-heading">
          <div>
            <h2 id="member-filter-title">Pencarian dan filter</h2>
          </div>
          @if (loading()) {
            <span class="loading-state" role="status">Memperbarui daftar</span>
          }
        </div>
        <form class="filters" [formGroup]="filters" (ngSubmit)="search()">
          <label class="field search-field" for="member-search">
            <span class="field__label">Cari member</span>
            <input
              id="member-search"
              name="member-search"
              formControlName="search"
              autocomplete="off"
              placeholder="Nama, NIS, NISN, kode, atau kartu"
            />
          </label>
          <label class="field" for="member-type-filter">
            <span class="field__label">Jenis</span>
            <select id="member-type-filter" formControlName="isStudent">
              <option value="">Semua</option>
              <option value="true">Siswa</option>
              <option value="false">Non-siswa</option>
            </select>
          </label>
          <label class="field" for="member-status-filter">
            <span class="field__label">Status</span>
            <select id="member-status-filter" formControlName="isActive">
              <option value="">Semua</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </label>
          <label class="field" for="member-class-filter">
            <span class="field__label">Kelas</span>
            <select id="member-class-filter" formControlName="classId">
              <option value="">Semua kelas</option>
              @for (item of activeClasses(); track item.id) {
                <option [value]="item.id">{{ classLabel(item) }}</option>
              }
            </select>
          </label>
          <div class="filter-actions">
            <button class="button" type="submit" [disabled]="loading()">Cari</button>
            <button
              class="button button--secondary"
              type="button"
              [disabled]="loading()"
              (click)="resetFilters()"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      @if (canWrite() && showForm()) {
        <form
          class="card card--indexed editor"
          [formGroup]="form"
          (ngSubmit)="save()"
          novalidate
        >
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Editor member</p>
              <h2>{{ editingId() ? 'Ubah data member' : 'Tambah member baru' }}</h2>
            </div>
            <button class="button button--secondary" type="button" (click)="closeForm()">
              Tutup
            </button>
          </div>

          @if (formSubmitted() && invalidFieldLabels().length) {
            <div class="alert alert--error error-summary" role="alert" tabindex="-1">
              <div>
                <strong>Periksa {{ invalidFieldLabels().length }} field wajib.</strong>
                <p>Lengkapi: {{ invalidFieldLabels().join(', ') }}.</p>
              </div>
            </div>
          }

          <div class="form-grid">
            <label class="field" for="member-code">
              <span class="field__label">Kode member <span aria-hidden="true">*</span></span>
              <input
                id="member-code"
                name="memberCode"
                formControlName="memberCode"
                autocomplete="off"
                spellcheck="false"
                [attr.aria-invalid]="isInvalid('memberCode')"
                [attr.aria-describedby]="isInvalid('memberCode') ? 'member-code-error' : null"
              />
              @if (isInvalid('memberCode')) {
                <p id="member-code-error" class="validation-message">Kode member wajib diisi.</p>
              }
            </label>

            <label class="field" for="library-card-number">
              <span class="field__label"
                >Nomor kartu perpustakaan <span aria-hidden="true">*</span></span
              >
              <input
                id="library-card-number"
                name="libraryCardNumber"
                formControlName="libraryCardNumber"
                autocomplete="off"
                spellcheck="false"
                [attr.aria-invalid]="isInvalid('libraryCardNumber')"
                [attr.aria-describedby]="
                  isInvalid('libraryCardNumber') ? 'library-card-error' : null
                "
              />
              @if (isInvalid('libraryCardNumber')) {
                <p id="library-card-error" class="validation-message">
                  Nomor kartu perpustakaan wajib diisi.
                </p>
              }
            </label>

            <label class="field field--wide" for="full-name">
              <span class="field__label">Nama lengkap <span aria-hidden="true">*</span></span>
              <input
                id="full-name"
                name="fullName"
                formControlName="fullName"
                autocomplete="name"
                [attr.aria-invalid]="isInvalid('fullName')"
                [attr.aria-describedby]="isInvalid('fullName') ? 'full-name-error' : null"
              />
              @if (isInvalid('fullName')) {
                <p id="full-name-error" class="validation-message">Nama lengkap wajib diisi.</p>
              }
            </label>

            <label class="field" for="member-kind">
              <span class="field__label">Jenis member <span aria-hidden="true">*</span></span>
              <select id="member-kind" name="isStudent" formControlName="isStudent">
                <option [ngValue]="true">Siswa</option>
                <option [ngValue]="false">Non-siswa</option>
              </select>
            </label>

            <label class="field" for="gender">
              <span class="field__label">Jenis kelamin</span>
              <select id="gender" name="gender" formControlName="gender">
                <option value="unknown">Tidak dicatat</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </label>
          </div>

          <fieldset class="student-section">
            <legend>Identitas siswa</legend>
            <div class="form-grid">
              <label class="field" for="nis">
                <span class="field__label"
                  >NIS
                  @if (form.controls.isStudent.value) {
                    <span aria-hidden="true">*</span>
                  }
                </span>
                <input
                  id="nis"
                  name="nis"
                  formControlName="nis"
                  inputmode="numeric"
                  autocomplete="off"
                  spellcheck="false"
                  [attr.aria-invalid]="isInvalid('nis')"
                  [attr.aria-describedby]="isInvalid('nis') ? 'nis-error' : null"
                />
                @if (isInvalid('nis')) {
                  <p id="nis-error" class="validation-message">NIS wajib diisi untuk siswa.</p>
                }
              </label>

              <label class="field" for="nisn">
                <span class="field__label"
                  >NISN
                  @if (form.controls.isStudent.value) {
                    <span aria-hidden="true">*</span>
                  }
                </span>
                <input
                  id="nisn"
                  name="nisn"
                  formControlName="nisn"
                  inputmode="numeric"
                  autocomplete="off"
                  spellcheck="false"
                  [attr.aria-invalid]="isInvalid('nisn')"
                  [attr.aria-describedby]="isInvalid('nisn') ? 'nisn-error' : null"
                />
                @if (isInvalid('nisn')) {
                  <p id="nisn-error" class="validation-message">NISN wajib diisi untuk siswa.</p>
                }
              </label>

              <label class="field" for="student-card-number">
                <span class="field__label"
                  >Nomor kartu pelajar
                  @if (form.controls.isStudent.value) {
                    <span aria-hidden="true">*</span>
                  }
                </span>
                <input
                  id="student-card-number"
                  name="studentCardNumber"
                  formControlName="studentCardNumber"
                  autocomplete="off"
                  spellcheck="false"
                  [attr.aria-invalid]="isInvalid('studentCardNumber')"
                  [attr.aria-describedby]="
                    isInvalid('studentCardNumber') ? 'student-card-error' : null
                  "
                />
                @if (isInvalid('studentCardNumber')) {
                  <p id="student-card-error" class="validation-message">
                    Nomor kartu pelajar wajib diisi untuk siswa.
                  </p>
                }
              </label>

              <label class="field" for="class-id">
                <span class="field__label"
                  >Kelas
                  @if (form.controls.isStudent.value) {
                    <span aria-hidden="true">*</span>
                  }
                </span>
                <select
                  id="class-id"
                  name="classId"
                  formControlName="classId"
                  [attr.aria-invalid]="isInvalid('classId')"
                  [attr.aria-describedby]="isInvalid('classId') ? 'class-id-error' : null"
                >
                  <option [ngValue]="null">Pilih kelas</option>
                  @for (item of activeClasses(); track item.id) {
                    <option [ngValue]="item.id">{{ classLabel(item) }}</option>
                  }
                </select>
                @if (isInvalid('classId')) {
                  <p id="class-id-error" class="validation-message">
                    Kelas wajib dipilih untuk siswa.
                  </p>
                }
              </label>

              <label class="field" for="study-group-id">
                <span class="field__label"
                  >Rombel
                  @if (form.controls.isStudent.value) {
                    <span aria-hidden="true">*</span>
                  }
                </span>
                <select
                  id="study-group-id"
                  name="studyGroupId"
                  formControlName="studyGroupId"
                  [attr.aria-invalid]="isInvalid('studyGroupId')"
                  [attr.aria-describedby]="
                    isInvalid('studyGroupId')
                      ? 'study-group-id-hint study-group-id-error'
                      : 'study-group-id-hint'
                  "
                >
                  <option [ngValue]="null">Pilih rombel</option>
                  @for (item of formStudyGroups(); track item.id) {
                    <option [ngValue]="item.id">{{ studyGroupLabel(item) }}</option>
                  }
                </select>
                <span id="study-group-id-hint" class="field__hint"
                  >Pilih kelas terlebih dahulu untuk mempersempit daftar rombel.</span
                >
                @if (isInvalid('studyGroupId')) {
                  <p id="study-group-id-error" class="validation-message">
                    Rombel wajib dipilih untuk siswa.
                  </p>
                }
              </label>
            </div>
          </fieldset>

          <label class="check-field" for="is-active">
            <input id="is-active" type="checkbox" formControlName="isActive" />
            <span>
              <strong>Member aktif</strong>
              <span class="field__hint">Member nonaktif tidak boleh melakukan transaksi baru.</span>
            </span>
          </label>

          <div class="actions">
            <button class="button" type="submit" [disabled]="saving()" [attr.aria-busy]="saving()">
              {{ saving() ? 'Menyimpan data' : 'Simpan member' }}
            </button>
            <button
              type="button"
              class="button button--secondary"
              [disabled]="saving()"
              (click)="closeForm()"
            >
              Batal
            </button>
          </div>
        </form>
      }

      @if (notice(); as currentNotice) {
        <sdi-feedback-banner
          [tone]="currentNotice.tone"
          [message]="currentNotice.message"
          [requestId]="currentNotice.requestId"
          [dismissible]="true"
          (dismissed)="notice.set(null)"
        />
      }

      <section class="members-section" aria-labelledby="members-table-title">
        <div class="panel-heading">
          <div>
            <h2 id="members-table-title">Daftar member</h2>
            <p>
              {{ totalMembers() }} data ditemukan. Tabel dapat digeser ke samping pada layar kecil.
            </p>
          </div>
        </div>
        <div class="table-wrap members-table" tabindex="0" aria-label="Tabel daftar member">
          <table>
            <caption>
            </caption>
            <thead>
              <tr>
                <th scope="col">Kode member</th>
                <th scope="col">Nama</th>
                <th scope="col">Jenis</th>
                <th scope="col">NIS / NISN</th>
                <th scope="col">Kelas / Rombel</th>
                <th scope="col">Kartu</th>
                <th scope="col">Status</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="8">
                    <span class="loading-state">Memuat daftar member</span>
                  </td>
                </tr>
              } @else if (loadError()) {
                <tr>
                  <td colspan="8">
                    <div class="table-state table-state--error">
                      <strong>Daftar member belum dapat dimuat.</strong>
                      <span>{{ loadError() }}</span>
                      <button class="button button--secondary" type="button" (click)="load()">
                        Coba lagi
                      </button>
                    </div>
                  </td>
                </tr>
              } @else if (members().length === 0) {
                <tr>
                  <td colspan="8">
                    <div class="table-state">
                      <strong>Belum ada member yang cocok.</strong>
                      <span>Ubah kata kunci atau filter, lalu cari kembali.</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (member of members(); track member.id) {
                  <tr>
                    <td>
                      <span class="data-code">{{ member.member_code }}</span>
                    </td>
                    <td>
                      <strong>{{ member.full_name }}</strong>
                    </td>
                    <td>{{ member.is_student ? 'Siswa' : 'Non-siswa' }}</td>
                    <td>
                      <span class="data-pair">
                        <span>NIS: {{ valueOrDash(member.nis) }}</span>
                        <span>NISN: {{ valueOrDash(member.nisn) }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="data-pair">
                        <span>Kelas: {{ memberClass(member) }}</span>
                        <span>Rombel: {{ memberStudyGroup(member) }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="data-pair">
                        <span>Perpus: {{ valueOrDash(member.card_number) }}</span>
                        <span>Pelajar: {{ valueOrDash(member.student_card_number) }}</span>
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [class.status-badge--inactive]="!member.is_active">
                        {{ member.is_active ? 'Aktif' : 'Nonaktif' }}
                      </span>
                    </td>
                    <td>
                      @if (canWrite()) {
                        <button
                          class="button button--secondary table-action"
                          type="button"
                          (click)="edit(member)"
                        >
                          Ubah
                        </button>
                      } @else {
                        <span class="field__hint">Mode baca</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: `
    .member-page {
      display: grid;
      gap: var(--space-6);
    }

    .page-header,
    .panel-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .page-header h1,
    .panel-heading h2,
    .page-header p,
    .panel-heading p {
      margin: 0;
    }

    .page-header p,
    .panel-heading p {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .toolbar-panel,
    .editor,
    .members-section {
      display: grid;
      gap: var(--space-4);
    }

    .filters {
      display: grid;
      grid-template-columns: minmax(0, 2fr) repeat(3, minmax(9rem, 1fr)) auto;
      gap: var(--space-3);
      align-items: end;
    }

    .filter-actions,
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .filter-actions .button,
    .actions .button {
      min-width: 7.5rem;
    }

    .editor {
      min-width: 0;
      max-width: var(--container-content);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
      min-width: 0;
    }

    .field--wide {
      grid-column: 1 / -1;
    }

    .student-section {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
      margin: 0;
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-brand-50);
    }

    .student-section legend {
      padding-inline: var(--space-2);
      color: var(--color-brand-950);
      font-family: var(--font-family-display);
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
    }

    .student-section p,
    .error-summary p,
    .alert p {
      margin: 0;
    }

    .member-page .field,
    .member-page .field__label,
    .member-page .check-field {
      color: var(--color-text);
      font-size: 0.8rem;
      font-weight: var(--weight-regular);
    }

    .member-page :is(input, select, textarea),
    .member-page :is(input, textarea)::placeholder {
      font-weight: var(--weight-regular);
    }

    .member-page .field__hint,
    .member-page .validation-message,
    .student-section > p {
      font-size: 0.8rem;
      font-weight: var(--weight-regular);
      line-height: 1.5;
    }

    .student-section > p {
      color: var(--color-text-muted);
    }

    .check-field span {
      display: grid;
      gap: var(--space-1);
    }

    .check-field strong {
      font-weight: var(--weight-regular);
    }

    .members-table table {
      min-width: 76rem;
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      text-align: left;
    }

    .data-code,
    .data-pair {
      font-family: var(--font-family-data);
      overflow-wrap: anywhere;
    }

    .data-pair {
      display: grid;
      gap: var(--space-1);
      font-size: var(--text-sm);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: var(--space-1) var(--space-3);
      border: var(--border-width) solid var(--color-accent);
      border-radius: var(--radius-pill);
      background: var(--color-success-surface);
      color: var(--color-success);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      white-space: nowrap;
    }

    .status-badge::before {
      width: 0.5rem;
      height: 0.5rem;
      margin-inline-end: var(--space-2);
      border-radius: var(--radius-pill);
      background: currentColor;
      content: '';
    }

    .status-badge--inactive {
      border-color: var(--color-border);
      background: var(--color-surface-subtle);
      color: var(--color-text-muted);
    }

    .table-action {
      min-width: 4.75rem;
    }

    .table-state {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
      padding: var(--space-4);
      color: var(--color-text-muted);
    }

    .table-state strong {
      color: var(--color-brand-950);
    }

    .table-state--error strong {
      color: var(--color-danger-strong);
    }

    @media (max-width: 64rem) {
      .page-header,
      .panel-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .search-field,
      .filter-actions {
        grid-column: 1 / -1;
      }

      .form-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .field--wide {
        grid-column: auto;
      }
    }

    @media (max-width: 36rem) {
      .filters,
      .form-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .filter-actions .button,
      .actions .button,
      .page-header .button {
        width: 100%;
      }

      .student-section {
        padding: var(--space-3);
      }
    }
  `,
})
export class MemberManagementPage {
  private readonly api = inject(MemberApiService);
  private readonly auth = inject(AuthStore);
  protected readonly canWrite = computed(() => this.auth.currentRole() === 'librarian');
  private readonly master = inject(MasterDataApiService);

  protected readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    isStudent: new FormControl<'' | 'true' | 'false'>('', { nonNullable: true }),
    isActive: new FormControl<'' | 'true' | 'false'>('', { nonNullable: true }),
    classId: new FormControl('', { nonNullable: true }),
  });
  protected readonly members = signal<Member[]>([]);
  protected readonly classes = signal<MasterRow[]>([]);
  protected readonly studyGroups = signal<MasterRow[]>([]);
  protected readonly totalMembers = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formSubmitted = signal(false);
  protected readonly loadError = signal('');
  protected readonly notice = signal<FeedbackMessage | null>(null);
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

  protected readonly activeClasses = computed(() =>
    this.classes().filter((item) => item.is_active !== false),
  );

  constructor() {
    this.updateStudentValidators(this.form.controls.isStudent.value);
    this.form.controls.isStudent.valueChanges.subscribe((isStudent) => {
      this.updateStudentValidators(isStudent);
    });
    this.form.controls.classId.valueChanges.subscribe(() => {
      const selectedGroup = this.form.controls.studyGroupId.value;
      if (selectedGroup && !this.formStudyGroups().some((item) => item.id === selectedGroup)) {
        this.form.controls.studyGroupId.setValue(null);
      }
    });
    this.load();
    forkJoin({
      classes: this.master.list('classes'),
      studyGroups: this.master.list('study-groups'),
    }).subscribe({
      next: ({ classes, studyGroups }) => {
        this.classes.set(classes.data);
        this.studyGroups.set(studyGroups.data);
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Pilihan kelas dan rombel belum dapat dimuat. Coba muat ulang halaman.',
        );
        this.notice.set(feedbackFromError(details));
      },
    });
  }

  protected search() {
    this.load();
  }

  protected resetFilters() {
    this.filters.reset({ search: '', isStudent: '', isActive: '', classId: '' });
    this.load();
  }

  protected startCreate() {
    this.editingId.set(null);
    this.formSubmitted.set(false);
    this.form.reset({
      memberCode: '',
      libraryCardNumber: '',
      studentCardNumber: null,
      isStudent: true,
      nis: null,
      nisn: null,
      fullName: '',
      gender: 'unknown',
      classId: null,
      studyGroupId: null,
      isActive: true,
    });
    this.showForm.set(true);
    this.notice.set(null);
    queueMicrotask(() => document.getElementById('member-code')?.focus());
  }

  protected edit(member: Member) {
    this.editingId.set(member.id);
    this.formSubmitted.set(false);
    this.form.reset({
      memberCode: member.member_code,
      libraryCardNumber: member.card_number,
      studentCardNumber: member.student_card_number,
      isStudent: member.is_student,
      nis: member.nis,
      nisn: member.nisn,
      fullName: member.full_name,
      gender: member.gender,
      classId: member.class_id,
      studyGroupId: member.study_group_id,
      isActive: member.is_active,
    });
    this.showForm.set(true);
    this.notice.set(null);
    queueMicrotask(() => document.getElementById('member-code')?.focus());
  }

  protected closeForm() {
    this.showForm.set(false);
    this.formSubmitted.set(false);
  }

  protected save() {
    this.formSubmitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalidField();
      return;
    }

    this.saving.set(true);
    this.notice.set(null);
    const raw = this.form.getRawValue();
    const payload: MemberPayload = {
      ...raw,
      nis: normalizeNullable(raw.nis),
      nisn: normalizeNullable(raw.nisn),
      studentCardNumber: normalizeNullable(raw.studentCardNumber),
      classId: raw.classId,
      studyGroupId: raw.studyGroupId,
    };
    const request = this.editingId()
      ? this.api.update(this.editingId()!, payload)
      : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.notice.set({ tone: 'success', message: 'Data member berhasil disimpan.' });
        this.saving.set(false);
        this.showForm.set(false);
        this.formSubmitted.set(false);
        this.load();
      },
      error: (error) => {
        this.notice.set(
          feedbackFromError(
            parseApiError(
              error,
              'Data member tidak dapat disimpan. Periksa field wajib dan pastikan NIS, NISN, kode member, serta nomor kartu belum digunakan.',
            ),
          ),
        );
        this.saving.set(false);
      },
    });
  }

  protected isInvalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.formSubmitted()) ? 'true' : null;
  }

  protected formStudyGroups() {
    return this.activeStudyGroups(this.form.controls.classId.value);
  }

  protected invalidFieldLabels() {
    return fieldOrder
      .filter(({ key }) => this.form.controls[key].invalid)
      .map(({ label }) => label);
  }

  protected classLabel(item: MasterRow) {
    return item.grade_level ? `${item.name} - tingkat ${item.grade_level}` : item.name;
  }

  protected studyGroupLabel(item: MasterRow) {
    const className = this.classes().find((klass) => klass.id === item.class_id)?.name;
    return className ? `${className} / ${item.name}` : item.name;
  }

  protected memberClass(member: Member) {
    return (
      member.classes?.name ??
      this.classes().find((item) => item.id === member.class_id)?.name ??
      '—'
    );
  }

  protected memberStudyGroup(member: Member) {
    return (
      member.study_groups?.name ??
      this.studyGroups().find((item) => item.id === member.study_group_id)?.name ??
      '—'
    );
  }

  protected valueOrDash(value: string | null | undefined) {
    return value?.trim() ? value : '—';
  }

  protected load() {
    this.loading.set(true);
    this.loadError.set('');
    const filters = this.filters.getRawValue();
    this.api.list(filters).subscribe({
      next: (response) => {
        this.members.set(response.data);
        this.totalMembers.set(response.pagination.total);
        this.loading.set(false);
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Daftar member belum dapat dimuat. Periksa koneksi lalu coba lagi.',
        );
        this.loadError.set(
          details.requestId
            ? `${details.message} Referensi: ${details.requestId}`
            : details.message,
        );
        this.loading.set(false);
      },
    });
  }

  private activeStudyGroups(classId: string | null) {
    return this.studyGroups().filter((item) => {
      if (item.is_active === false) return false;
      return !classId || item.class_id === classId;
    });
  }

  private updateStudentValidators(isStudent: boolean) {
    const studentControls: AbstractControl[] = [
      this.form.controls.nis,
      this.form.controls.nisn,
      this.form.controls.studentCardNumber,
      this.form.controls.classId,
      this.form.controls.studyGroupId,
    ];
    for (const control of studentControls) {
      control.setValidators(isStudent ? [Validators.required] : []);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private focusFirstInvalidField() {
    const firstInvalid = fieldOrder.find(({ key }) => this.form.controls[key].invalid);
    if (!firstInvalid) return;
    queueMicrotask(() => {
      const element = document.getElementById(firstInvalid.id);
      if (element instanceof HTMLElement) element.focus();
    });
  }
}

function feedbackFromError(details: ReturnType<typeof parseApiError>): FeedbackMessage {
  return {
    tone: 'error',
    message: details.message,
    ...(details.requestId ? { requestId: details.requestId } : {}),
  };
}

const fieldOrder: {
  key: keyof MemberManagementPage['form']['controls'];
  id: string;
  label: string;
}[] = [
  { key: 'memberCode', id: 'member-code', label: 'kode member' },
  { key: 'libraryCardNumber', id: 'library-card-number', label: 'nomor kartu perpustakaan' },
  { key: 'fullName', id: 'full-name', label: 'nama lengkap' },
  { key: 'nis', id: 'nis', label: 'NIS' },
  { key: 'nisn', id: 'nisn', label: 'NISN' },
  { key: 'studentCardNumber', id: 'student-card-number', label: 'nomor kartu pelajar' },
  { key: 'classId', id: 'class-id', label: 'kelas' },
  { key: 'studyGroupId', id: 'study-group-id', label: 'rombel' },
];

function normalizeNullable(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
