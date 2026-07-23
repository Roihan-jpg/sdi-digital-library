import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MasterDataApiService,
  type MasterKind,
  type MasterRow,
} from '../../data-access/master-data-api.service';

type MessageTone = 'success' | 'error' | 'info';
type FieldName = keyof MasterDataPage['form']['controls'];

interface PageMessage {
  tone: MessageTone;
  text: string;
}

interface FieldConfig {
  name: FieldName;
  label: string;
  helper: string;
  required: boolean;
  type?: 'text' | 'number';
}

@Component({
  selector: 'sdi-master-data-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page page--wide master-page" aria-labelledby="master-data-title">
      <header class="page-header">
        <div>
          <p class="eyebrow">Referensi operasional</p>
          <h1 id="master-data-title">Master data</h1>
          <p>
            Kelola kategori, rak, penerbit, pengarang, kelas, rombel, dan referensi lain yang
            dipakai oleh katalog, inventaris, member, dan sirkulasi.
          </p>
        </div>
      </header>

      <div class="workspace">
        <aside class="kind-panel card card--indexed" aria-labelledby="master-kind-title">
          <div class="panel-heading">
            <p class="eyebrow">Jenis data</p>
            <h2 id="master-kind-title">Pilih referensi</h2>
            <p>
              Form di sebelah kanan akan menyesuaikan jenis data. Fokus tetap berada di pilihan ini
              setelah jenis diganti.
            </p>
          </div>

          <label class="field" for="master-kind">
            <span class="field__label">Jenis master data</span>
            <select
              id="master-kind"
              name="master-kind"
              [formControl]="kind"
              aria-describedby="master-kind-help"
              (change)="changeKind($event)"
            >
              @for (option of kinds; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            <span id="master-kind-help" class="field__hint">{{ selectedKindDescription() }}</span>
          </label>

          <div class="impact-note" role="note">
            <strong>Perlu hati-hati saat menghapus.</strong>
            Data master dapat dipakai oleh buku, eksemplar, member, laporan, atau transaksi lama.
          </div>
        </aside>

        <form
          class="card editor-card"
          [formGroup]="form"
          aria-describedby="form-helper form-feedback"
          (ngSubmit)="save()"
        >
          <div class="panel-heading">
            <p class="eyebrow">{{ selectedKindLabel() }}</p>
            <h2>{{ editingId() ? 'Ubah data referensi' : 'Tambah data referensi' }}</h2>
            <p id="form-helper">
              Isi field yang ditandai wajib. Perubahan akan dipakai oleh fitur lain setelah
              disimpan.
            </p>
          </div>

          @if (submitted() && hasFormErrors()) {
            <div class="alert alert--error" role="alert">
              <p>
                Periksa field yang wajib diisi. Fokus sudah dipindahkan ke field pertama yang perlu
                diperbaiki.
              </p>
            </div>
          }

          <div class="form-grid">
            @for (field of visibleFields(); track field.name) {
              <label class="field" [for]="fieldId(field.name)">
                <span class="field__label">
                  {{ field.label }}
                  @if (field.required) {
                    <span class="required-marker" aria-hidden="true">*</span>
                    <span class="sr-only">wajib diisi</span>
                  }
                </span>
                <input
                  [id]="fieldId(field.name)"
                  [name]="field.name"
                  [type]="field.type ?? 'text'"
                  [formControlName]="field.name"
                  [attr.inputmode]="field.type === 'number' ? 'numeric' : null"
                  [attr.aria-describedby]="fieldDescribedBy(field)"
                  [attr.aria-invalid]="isInvalid(field.name)"
                  [attr.min]="field.name === 'gradeLevel' ? 1 : null"
                  [attr.max]="field.name === 'gradeLevel' ? 6 : null"
                  autocomplete="off"
                  spellcheck="false"
                />
                <span [id]="fieldHelpId(field.name)" class="field__hint">{{ field.helper }}</span>
                @if (isInvalid(field.name)) {
                  <span [id]="fieldErrorId(field.name)" class="validation-message" role="alert">
                    {{ errorMessage(field.name) }}
                  </span>
                }
              </label>
            }
          </div>

          <label class="check-field" for="master-is-active">
            <input id="master-is-active" type="checkbox" formControlName="isActive" />
            <span>
              <strong>Aktif</strong>
              <span>Ditampilkan sebagai pilihan di fitur lain.</span>
            </span>
          </label>

          <div id="form-feedback" class="form-actions" aria-live="polite">
            <button class="button" type="submit" [disabled]="saving()" [attr.aria-busy]="saving()">
              {{ saving() ? 'Menyimpan data' : editingId() ? 'Simpan perubahan' : 'Simpan data' }}
            </button>
            @if (editingId()) {
              <button class="button button--secondary" type="button" (click)="reset()">
                Batal ubah
              </button>
            }
          </div>
        </form>
      </div>

      @if (message()) {
        <div
          class="alert"
          [class.alert--success]="message()?.tone === 'success'"
          [class.alert--error]="message()?.tone === 'error'"
          [attr.role]="message()?.tone === 'error' ? 'alert' : 'status'"
        >
          <p>{{ message()?.text }}</p>
        </div>
      }

      <section class="card table-card" aria-labelledby="master-table-title">
        <div class="table-heading">
          <div>
            <p class="eyebrow">Daftar {{ selectedKindLabel().toLowerCase() }}</p>
            <h2 id="master-table-title">Data yang tersimpan</h2>
          </div>
          @if (loading()) {
            <p class="loading-state" role="status">Memuat data</p>
          } @else {
            <p class="table-count" aria-live="polite">{{ rows().length }} data</p>
          }
        </div>

        <div class="table-wrap" tabindex="0" aria-label="Tabel master data dapat digeser mendatar">
          <table>
            <caption>
              Daftar
              {{
                selectedKindLabel().toLowerCase()
              }}
              beserta status dan aksi pengelolaan.
            </caption>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Kode atau tingkat</th>
                <th scope="col">Status</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr>
                  <td colspan="4">
                    <span class="loading-state">Memuat daftar {{ selectedKindLabel() }}</span>
                  </td>
                </tr>
              } @else if (loadError()) {
                <tr>
                  <td colspan="4">
                    <div class="content-state content-state--compact">
                      <h3>Daftar belum dapat dimuat</h3>
                      <p class="content-state__description">
                        Periksa koneksi atau coba muat ulang data master ini.
                      </p>
                      <button class="button button--secondary" type="button" (click)="load(false)">
                        Coba lagi
                      </button>
                    </div>
                  </td>
                </tr>
              } @else if (rows().length === 0) {
                <tr>
                  <td colspan="4">
                    <div class="content-state content-state--compact">
                      <h3>Belum ada {{ selectedKindLabel().toLowerCase() }}</h3>
                      <p class="content-state__description">
                        Tambahkan data pertama lewat form di atas agar bisa dipakai oleh fitur lain.
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>
                      <strong>{{ row.name }}</strong>
                      <span class="row-meta">{{ selectedKindLabel() }}</span>
                    </td>
                    <td class="data-cell">{{ rowSecondaryValue(row) }}</td>
                    <td>
                      <span
                        class="status-badge"
                        [class.status-badge--inactive]="row.is_active === false"
                      >
                        {{ row.is_active === false ? 'Nonaktif' : 'Aktif' }}
                      </span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button
                          class="table-action"
                          type="button"
                          [attr.aria-label]="'Ubah ' + row.name"
                          (click)="edit(row)"
                        >
                          Ubah
                        </button>
                        <button
                          class="table-action table-action--danger"
                          type="button"
                          [attr.aria-label]="'Hapus ' + row.name"
                          (click)="openDeleteDialog(row, $event)"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (pendingDelete(); as row) {
        <div
          class="modal-backdrop"
          role="presentation"
          (click)="onBackdropClick($event)"
          (keydown)="trapDialogFocus($event)"
        >
          <section
            #deleteDialog
            class="modal delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description delete-dialog-impact"
            tabindex="-1"
          >
            <div class="modal__header">
              <div>
                <p class="eyebrow">Konfirmasi hapus</p>
                <h2 id="delete-dialog-title">Hapus {{ row.name }}?</h2>
              </div>
              <button
                class="button button--secondary button--icon"
                type="button"
                aria-label="Tutup dialog hapus"
                (click)="closeDeleteDialog()"
              >
                x
              </button>
            </div>
            <p id="delete-dialog-description">
              Data <strong>{{ row.name }}</strong> dari {{ selectedKindLabel().toLowerCase() }}
              akan dihapus dari daftar pilihan.
            </p>
            <div id="delete-dialog-impact" class="alert alert--warning">
              <p>
                Jika data ini masih dipakai oleh buku, member, laporan, atau transaksi, sistem akan
                menolak penghapusan. Gunakan status nonaktif bila data lama masih perlu tersimpan.
              </p>
            </div>
            <div class="modal__actions">
              <button class="button button--secondary" type="button" (click)="closeDeleteDialog()">
                Batal
              </button>
              <button
                class="button button--danger"
                type="button"
                [disabled]="deleting()"
                [attr.aria-busy]="deleting()"
                (click)="confirmDelete(row)"
              >
                {{ deleting() ? 'Menghapus data' : 'Hapus data' }}
              </button>
            </div>
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .master-page {
      display: grid;
      gap: var(--space-8);
    }

    .page-header,
    .panel-heading,
    .table-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .page-header h1,
    .page-header p,
    .panel-heading h2,
    .panel-heading p,
    .table-heading h2,
    .table-heading p,
    .alert p,
    .delete-dialog p {
      margin: 0;
    }

    .page-header p,
    .panel-heading p {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .workspace {
      display: grid;
      gap: var(--space-6);
    }

    .kind-panel,
    .editor-card,
    .table-card {
      display: grid;
      gap: var(--space-5);
      align-content: start;
    }

    .impact-note {
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-amber-700);
      border-radius: var(--radius-md);
      background: var(--color-warning-surface);
      color: var(--color-warning);
      font-size: var(--text-sm);
    }

    .form-grid {
      display: grid;
      gap: var(--space-4);
    }

    .required-marker {
      color: var(--color-error);
    }

    .check-field span {
      display: grid;
      gap: var(--space-1);
      color: var(--color-text-muted);
    }

    .check-field strong {
      color: var(--color-text);
    }

    .form-actions,
    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }

    .table-heading {
      align-items: center;
    }

    .table-card .table-wrap table {
      min-width: 46rem;
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      text-align: left;
    }

    .table-count,
    .row-meta {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    .row-meta {
      display: block;
      margin-top: var(--space-1);
    }

    .data-cell {
      font-family: var(--font-family-data);
      font-variant-numeric: tabular-nums;
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
    }

    .status-badge--inactive {
      border-color: var(--color-border);
      background: var(--color-surface-subtle);
      color: var(--color-text-muted);
    }

    .table-action {
      min-width: 4.5rem;
      min-height: var(--control-height);
      padding: var(--space-2) var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
      cursor: pointer;
      touch-action: manipulation;
      transition:
        background-color var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        color var(--duration-fast) var(--ease-standard);
    }

    .table-action:hover {
      background: var(--color-brand-50);
    }

    .table-action--danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    .table-action--danger:hover {
      background: var(--color-danger-surface);
      color: var(--color-danger-strong);
    }

    .content-state--compact {
      min-height: 8rem;
      padding: var(--space-6) var(--space-4);
    }

    .delete-dialog {
      display: grid;
      gap: var(--space-4);
    }

    @media (min-width: 64rem) {
      .workspace {
        grid-template-columns: minmax(18rem, 0.8fr) minmax(0, 1.2fr);
        align-items: start;
      }
    }

    @media (max-width: 48rem) {
      .page-header,
      .panel-heading,
      .table-heading {
        display: grid;
      }

      .form-actions,
      .row-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .form-actions > *,
      .row-actions > * {
        width: 100%;
      }
    }
  `,
})
export class MasterDataPage {
  private readonly api = inject(MasterDataApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private restoreFocusTo: HTMLElement | null = null;

  @ViewChild('deleteDialog') private deleteDialog?: ElementRef<HTMLElement>;

  protected readonly kinds: readonly { value: MasterKind; label: string; description: string }[] = [
    {
      value: 'school-years',
      label: 'Tahun ajaran',
      description: 'Dipakai untuk mengelompokkan kelas dan laporan periode sekolah.',
    },
    {
      value: 'classes',
      label: 'Kelas',
      description: 'Tingkat kelas siswa, misalnya kelas 1 sampai 6.',
    },
    {
      value: 'study-groups',
      label: 'Rombongan belajar',
      description: 'Rombel di dalam kelas, termasuk wali kelas bila tersedia.',
    },
    {
      value: 'categories',
      label: 'Kategori',
      description: 'Kategori koleksi untuk katalog, inventaris, dan laporan.',
    },
    {
      value: 'authors',
      label: 'Pengarang',
      description: 'Nama pengarang yang dipakai saat menambah judul buku.',
    },
    {
      value: 'publishers',
      label: 'Penerbit',
      description: 'Nama penerbit untuk metadata judul dan koleksi.',
    },
    {
      value: 'shelves',
      label: 'Rak',
      description: 'Lokasi fisik rak; kode rak harus mudah dikenali petugas.',
    },
    {
      value: 'replacement-cost-categories',
      label: 'Kategori biaya penggantian',
      description: 'Referensi biaya rusak atau hilang saat pengembalian.',
    },
  ];

  protected readonly kind = new FormControl<MasterKind>('school-years', { nonNullable: true });
  protected readonly currentKind = signal<MasterKind>('school-years');
  protected readonly rows = signal<MasterRow[]>([]);
  protected readonly editingId = signal<string | null>(null);
  protected readonly message = signal<PageMessage | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly loadError = signal(false);
  protected readonly submitted = signal(false);
  protected readonly pendingDelete = signal<MasterRow | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    code: new FormControl('', { nonNullable: true }),
    slug: new FormControl('', { nonNullable: true }),
    gradeLevel: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(6)],
    }),
    schoolYearId: new FormControl<string | null>(null),
    classId: new FormControl<string | null>(null),
    homeroomTeacherName: new FormControl<string | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  protected readonly selectedKindLabel = computed(
    () => this.kinds.find((option) => option.value === this.currentKind())?.label ?? 'Master data',
  );

  protected readonly selectedKindDescription = computed(
    () =>
      this.kinds.find((option) => option.value === this.currentKind())?.description ??
      'Pilih jenis data yang akan dikelola.',
  );

  protected readonly visibleFields = computed<FieldConfig[]>(() => {
    const fields: FieldConfig[] = [
      {
        name: 'name',
        label: 'Nama',
        helper: 'Gunakan nama yang mudah dikenali petugas dan konsisten dengan data lama.',
        required: true,
      },
    ];

    switch (this.currentKind()) {
      case 'shelves':
        fields.push({
          name: 'code',
          label: 'Kode rak',
          helper: 'Contoh: RAK-A1. Kode ini membantu petugas menemukan lokasi fisik buku.',
          required: true,
        });
        break;
      case 'categories':
        fields.push({
          name: 'slug',
          label: 'Slug',
          helper: 'Gunakan huruf kecil dan tanda hubung bila slug dibutuhkan katalog publik.',
          required: false,
        });
        break;
      case 'classes':
        fields.push(
          {
            name: 'gradeLevel',
            label: 'Tingkat kelas',
            helper: 'Isi angka 1 sampai 6.',
            required: true,
            type: 'number',
          },
          {
            name: 'schoolYearId',
            label: 'ID tahun ajaran',
            helper: 'Isi ID tahun ajaran bila kelas harus dikaitkan ke periode tertentu.',
            required: false,
          },
        );
        break;
      case 'study-groups':
        fields.push(
          {
            name: 'classId',
            label: 'ID kelas',
            helper: 'Pilih ID kelas dari data kelas yang sudah dibuat.',
            required: true,
          },
          {
            name: 'homeroomTeacherName',
            label: 'Wali kelas',
            helper: 'Isi nama guru pendamping bila tersedia.',
            required: false,
          },
        );
        break;
    }

    return fields;
  });

  constructor() {
    this.updateValidatorsForKind();
    this.load(false);
  }

  protected changeKind(event?: Event) {
    const value = event?.target instanceof HTMLSelectElement ? event.target.value : this.kind.value;
    const nextKind = value as MasterKind;
    this.kind.setValue(nextKind);
    this.currentKind.set(nextKind);
    this.updateValidatorsForKind();
    this.load();
  }

  protected load(resetForm = true) {
    if (resetForm) {
      this.reset(false);
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.message.set(null);
    this.api.list(this.currentKind()).subscribe({
      next: (response) => {
        this.rows.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        this.loadError.set(true);
        this.message.set({
          tone: 'error',
          text: 'Master data belum dapat dimuat. Coba lagi atau periksa koneksi backend.',
        });
      },
    });
  }

  protected save() {
    this.submitted.set(true);
    this.updateValidatorsForKind();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const value = this.form.getRawValue();
    let body: Record<string, unknown> = { name: value.name.trim(), isActive: value.isActive };

    switch (this.currentKind()) {
      case 'shelves':
        body = { ...body, code: value.code.trim() };
        break;
      case 'categories':
        body = { ...body, slug: value.slug.trim() || undefined };
        break;
      case 'classes':
        body = {
          ...body,
          gradeLevel: Number(value.gradeLevel),
          schoolYearId: value.schoolYearId?.trim() || undefined,
        };
        break;
      case 'study-groups':
        body = {
          ...body,
          classId: value.classId?.trim(),
          homeroomTeacherName: value.homeroomTeacherName?.trim() || undefined,
        };
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

    this.saving.set(true);
    this.message.set(null);
    const id = this.editingId();
    const request = id
      ? this.api.update(this.currentKind(), id, body)
      : this.api.create(this.currentKind(), body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.reset(false);
        this.message.set({ tone: 'success', text: 'Master data berhasil disimpan.' });
        this.load(false);
      },
      error: () => {
        this.saving.set(false);
        this.message.set({
          tone: 'error',
          text: 'Data tidak dapat disimpan. Periksa field wajib, format data, atau kemungkinan duplikasi.',
        });
      },
    });
  }

  protected edit(row: MasterRow) {
    this.editingId.set(row.id);
    this.submitted.set(false);
    this.message.set({
      tone: 'info',
      text: `Mode ubah aktif untuk ${row.name}. Simpan perubahan atau batal bila tidak jadi.`,
    });
    this.form.patchValue({
      name: row.name,
      code: row.code ?? '',
      slug: '',
      gradeLevel: row.grade_level ?? 1,
      classId: row.class_id ?? null,
      isActive: row.is_active ?? true,
    });
    this.scheduleFocus(() => this.focusControl('name'));
  }

  protected openDeleteDialog(row: MasterRow, event?: Event) {
    this.restoreFocusTo = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.pendingDelete.set(row);
    this.message.set(null);
    this.scheduleFocus(() => this.focusDialog());
  }

  protected closeDeleteDialog() {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
    this.scheduleFocus(() => this.restoreFocusTo?.focus());
  }

  protected confirmDelete(row: MasterRow) {
    this.deleting.set(true);
    this.api.remove(this.currentKind(), row.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.message.set({ tone: 'success', text: `${row.name} berhasil dihapus.` });
        this.load(false);
        this.scheduleFocus(() => this.restoreFocusTo?.focus());
      },
      error: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.message.set({
          tone: 'error',
          text: `${row.name} masih digunakan oleh data lain sehingga tidak dapat dihapus. Nonaktifkan data ini bila tidak ingin dipakai untuk input baru.`,
        });
        this.scheduleFocus(() => this.restoreFocusTo?.focus());
      },
    });
  }

  protected reset(clearMessage = true) {
    this.editingId.set(null);
    this.submitted.set(false);
    if (clearMessage) {
      this.message.set(null);
    }
    this.form.reset({
      name: '',
      code: '',
      slug: '',
      gradeLevel: 1,
      schoolYearId: null,
      classId: null,
      homeroomTeacherName: null,
      isActive: true,
    });
    this.updateValidatorsForKind();
  }

  protected isInvalid(name: FieldName) {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted()) ? 'true' : null;
  }

  protected hasFormErrors() {
    return this.visibleFields().some((field) => this.form.controls[field.name].invalid);
  }

  protected errorMessage(name: FieldName) {
    const control = this.form.controls[name];
    if (control.hasError('required')) {
      return `${this.fieldLabel(name)} wajib diisi.`;
    }
    if (control.hasError('min') || control.hasError('max')) {
      return 'Tingkat kelas harus berupa angka 1 sampai 6.';
    }
    return 'Periksa nilai field ini.';
  }

  protected fieldId(name: FieldName) {
    return `master-${String(name).replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}`;
  }

  protected fieldHelpId(name: FieldName) {
    return `${this.fieldId(name)}-help`;
  }

  protected fieldErrorId(name: FieldName) {
    return `${this.fieldId(name)}-error`;
  }

  protected fieldDescribedBy(field: FieldConfig) {
    const ids = [this.fieldHelpId(field.name)];
    if (this.isInvalid(field.name)) {
      ids.push(this.fieldErrorId(field.name));
    }
    return ids.join(' ');
  }

  protected rowSecondaryValue(row: MasterRow) {
    if (row.code) return row.code;
    if (typeof row.grade_level === 'number') return `Tingkat ${row.grade_level}`;
    if (row.class_id) return `Kelas ${row.class_id}`;
    return '-';
  }

  protected onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeDeleteDialog();
    }
  }

  protected trapDialogFocus(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDeleteDialog();
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = this.deleteDialog?.nativeElement;
    if (!dialog) return;

    const focusable = this.dialogFocusableElements(dialog);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private updateValidatorsForKind() {
    this.form.controls.code.clearValidators();
    this.form.controls.slug.clearValidators();
    this.form.controls.gradeLevel.setValidators([Validators.min(1), Validators.max(6)]);
    this.form.controls.schoolYearId.clearValidators();
    this.form.controls.classId.clearValidators();

    if (this.currentKind() === 'shelves') {
      this.form.controls.code.setValidators([Validators.required]);
    }

    if (this.currentKind() === 'classes') {
      this.form.controls.gradeLevel.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(6),
      ]);
    }

    if (this.currentKind() === 'study-groups') {
      this.form.controls.classId.setValidators([Validators.required]);
    }

    for (const control of Object.values(this.form.controls)) {
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private focusFirstInvalid() {
    this.scheduleFocus(() => {
      const invalid = this.host.nativeElement.querySelector(
        '[aria-invalid="true"]',
      ) as HTMLElement | null;
      invalid?.focus();
    });
  }

  private focusControl(name: FieldName) {
    (
      this.host.nativeElement.querySelector(`#${this.fieldId(name)}`) as HTMLElement | null
    )?.focus();
  }

  private focusDialog() {
    const dialog = this.deleteDialog?.nativeElement;
    const first = dialog ? this.dialogFocusableElements(dialog)[0] : null;
    (first ?? dialog)?.focus();
  }

  private scheduleFocus(callback: () => void) {
    setTimeout(callback);
  }

  private dialogFocusableElements(root: HTMLElement) {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
    );
  }

  private fieldLabel(name: FieldName) {
    return this.visibleFields().find((field) => field.name === name)?.label ?? 'Field';
  }
}
