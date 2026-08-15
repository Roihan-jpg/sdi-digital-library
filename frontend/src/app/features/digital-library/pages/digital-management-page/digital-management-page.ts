import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  FeedbackBanner,
  type FeedbackMessage,
} from '../../../../shared/components/feedback-banner/feedback-banner';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import { DigitalLibraryApiService } from '../../data-access/digital-library-api.service';
import type { DigitalCollection, DigitalMediaType } from '../../models/digital-collection.model';

type DigitalFormValue = ReturnType<DigitalManagementPage['form']['getRawValue']>;

const MAIN_FILE_HELPER = 'PDF maksimal 100 MB atau video MP4/WebM.';
const COVER_HELPER = 'Cover JPG, PNG, atau WebP maksimal 5 MB.';
const MAIN_FILE_TYPES = ['application/pdf', 'video/mp4', 'video/webm'];
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAIN_FILE_MAX_BYTES = 100 * 1024 * 1024;
const COVER_MAX_BYTES = 5 * 1024 * 1024;
const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

@Component({
  selector: 'sdi-digital-management-page',
  imports: [ReactiveFormsModule, FeedbackBanner],
  template: `
    <section class="page management-page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Pengelolaan</p>
          <h1>Koleksi digital</h1>
          <p>
            Kelola metadata, akses terbit, cover, dan file utama tanpa mengubah aturan file privat.
          </p>
        </div>
        <div class="policy-note" aria-label="Aturan penyimpanan koleksi digital">
          <strong>File tetap privat</strong>
          <span>Akses penuh hanya melalui backend dan signed URL.</span>
        </div>
      </div>

      @if (feedback(); as currentFeedback) {
        <sdi-feedback-banner
          [tone]="currentFeedback.tone"
          [message]="currentFeedback.message"
          [requestId]="currentFeedback.requestId"
          [dismissible]="true"
          (dismissed)="feedback.set(null)"
        />
      }

      @if (canEdit()) {
        <form
          #collectionForm
          id="digital-collection-form"
          class="collection-form"
          [formGroup]="form"
          (ngSubmit)="save()"
          novalidate
        >
          <div class="form-title">
            <div>
              <p class="eyebrow">{{ editingId() ? 'Mode ubah' : 'Entri baru' }}</p>
              <h2>{{ editingId() ? 'Ubah koleksi' : 'Tambah koleksi' }}</h2>
            </div>
            @if (editingId()) {
              <span class="edit-pill">Perubahan mengganti data koleksi terpilih</span>
            }
          </div>

          @if (formError()) {
            <div class="error-summary" role="alert" tabindex="-1">
              <strong>{{ formError() }}</strong>
              <span>Periksa field yang ditandai sebelum menyimpan.</span>
            </div>
          }

          <fieldset>
            <legend>Metadata</legend>
            <div class="fields">
              <label class="field">
                <span>Judul <span aria-hidden="true">*</span></span>
                <input
                  formControlName="title"
                  data-control-name="title"
                  autocomplete="off"
                  [attr.aria-invalid]="isInvalid('title')"
                  aria-describedby="title-error"
                  (blur)="suggestSlug()"
                />
                @if (showError('title')) {
                  <span id="title-error" class="field-error">Judul wajib diisi.</span>
                }
              </label>

              <label class="field">
                <span>Slug URL <span aria-hidden="true">*</span></span>
                <input
                  formControlName="slug"
                  data-control-name="slug"
                  autocomplete="off"
                  placeholder="contoh-modul-matematika"
                  [attr.aria-invalid]="isInvalid('slug')"
                  aria-describedby="slug-helper slug-error"
                />
                <span id="slug-helper" class="field-helper"
                  >Gunakan huruf kecil, angka, dan tanda hubung.</span
                >
                @if (showError('slug')) {
                  <span id="slug-error" class="field-error">{{ slugError() }}</span>
                }
              </label>

              <label class="field">
                <span>Kategori</span>
                <select formControlName="categoryId">
                  <option value="">Tanpa kategori</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
              </label>

              <label class="field">
                <span>Penulis</span>
                <input formControlName="authorText" autocomplete="off" />
              </label>

              <label class="field">
                <span>Penerbit</span>
                <input formControlName="publisherText" autocomplete="off" />
              </label>

              <label class="field">
                <span>Tahun terbit</span>
                <input type="number" formControlName="publicationYear" min="1000" max="2100" />
              </label>

              <label class="field wide">
                <span>Deskripsi</span>
                <textarea formControlName="description" rows="4"></textarea>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Media</legend>
            <div class="fields">
              <label class="field">
                <span>Jenis media <span aria-hidden="true">*</span></span>
                <select
                  formControlName="mediaType"
                  data-control-name="mediaType"
                  [attr.aria-invalid]="isInvalid('mediaType')"
                  aria-describedby="mediaType-error"
                >
                  <option value="ebook">E-book/PDF</option>
                  <option value="module">Modul</option>
                  <option value="video">Video</option>
                </select>
                @if (showError('mediaType')) {
                  <span id="mediaType-error" class="field-error">Jenis media wajib dipilih.</span>
                }
              </label>

              <label class="field">
                <span>Durasi</span>
                <input
                  type="number"
                  formControlName="durationSeconds"
                  min="0"
                  aria-describedby="duration-helper"
                />
                <span id="duration-helper" class="field-helper">Isi dalam detik untuk video.</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Akses</legend>
            <div class="switch-grid">
              <label class="check">
                <input type="checkbox" formControlName="isDownloadable" />
                <span>
                  <strong>Boleh diunduh</strong>
                  <small>Aktifkan hanya bila file boleh diunduh anggota.</small>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>File</legend>
            <div class="fields">
              <label class="field file-field">
                <span>File utama {{ editingId() ? '(opsional jika tidak diganti)' : '*' }}</span>
                <input
                  type="file"
                  data-control-name="mainFile"
                  (change)="pickFile($event)"
                  accept="application/pdf,video/mp4,video/webm"
                  [attr.aria-invalid]="mainFileError() ? 'true' : 'false'"
                  aria-describedby="main-file-helper main-file-error main-file-preview"
                />
                <span id="main-file-helper" class="field-helper">{{ MAIN_FILE_HELPER }}</span>
                @if (mainFileError()) {
                  <span id="main-file-error" class="field-error">{{ mainFileError() }}</span>
                }
                <span id="main-file-preview" class="file-preview">
                  @if (fileName()) {
                    <strong>{{ fileName() }}</strong>
                    <small>{{ fileSizeLabel() }}</small>
                  } @else {
                    <span>Belum ada file baru dipilih.</span>
                  }
                </span>
              </label>

              <label class="field file-field">
                <span>Cover</span>
                <input
                  type="file"
                  (change)="pickCover($event)"
                  accept="image/jpeg,image/png,image/webp"
                  [attr.aria-invalid]="coverFileError() ? 'true' : 'false'"
                  aria-describedby="cover-helper cover-error cover-preview"
                />
                <span id="cover-helper" class="field-helper">{{ COVER_HELPER }}</span>
                @if (coverFileError()) {
                  <span id="cover-error" class="field-error">{{ coverFileError() }}</span>
                }
                <span id="cover-preview" class="file-preview">
                  @if (coverName()) {
                    <strong>{{ coverName() }}</strong>
                    <small>{{ coverSizeLabel() }}</small>
                  } @else {
                    <span>Cover baru belum dipilih.</span>
                  }
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Publikasi</legend>
            <div class="switch-grid">
              <label class="check">
                <input type="checkbox" formControlName="isPublished" />
                <span>
                  <strong>Terbitkan koleksi</strong>
                  <small>Koleksi terbit tampil pada katalog sesuai otorisasi akses.</small>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="actions">
            <button class="button" type="submit" [disabled]="saving()">
              {{ saving() ? 'Menyimpan...' : 'Simpan koleksi' }}
            </button>
            @if (editingId()) {
              <button class="button button--secondary" type="button" (click)="reset()">
                Batal ubah
              </button>
            }
          </div>
        </form>
      }

      <div class="list-head">
        <div>
          <p class="eyebrow">Inventaris digital</p>
          <h2>Daftar koleksi</h2>
        </div>
        <button
          class="button button--secondary"
          type="button"
          (click)="load()"
          [disabled]="loading()"
        >
          {{ loading() ? 'Memuat...' : 'Muat ulang' }}
        </button>
      </div>

      <div class="table-wrap" role="region" aria-labelledby="digital-list-title" tabindex="0">
        <table>
          <caption id="digital-list-title">
            Daftar koleksi digital beserta jenis media, status publikasi, izin unduh, dan aksi.
          </caption>
          <thead>
            <tr>
              <th scope="col">Judul</th>
              <th scope="col">Media</th>
              <th scope="col">Status</th>
              <th scope="col">Unduh</th>
              <th scope="col">Diperbarui</th>
              @if (canEdit()) {
                <th scope="col">Aksi</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td class="state-cell" [attr.colspan]="canEdit() ? 6 : 5" role="status">
                  Memuat data koleksi digital...
                </td>
              </tr>
            } @else if (error()) {
              <tr>
                <td
                  class="state-cell error"
                  [attr.colspan]="canEdit() ? 6 : 5"
                  role="alert"
                  aria-atomic="true"
                >
                  {{ error() }}
                </td>
              </tr>
            } @else if (items().length === 0) {
              <tr>
                <td class="state-cell" [attr.colspan]="canEdit() ? 6 : 5">
                  Belum ada koleksi digital. Tambahkan koleksi pertama melalui form di atas.
                </td>
              </tr>
            } @else {
              @for (item of items(); track item.id) {
                <tr>
                  <td data-label="Judul">
                    <strong>{{ item.title }}</strong>
                    <small>/{{ item.slug }}</small>
                  </td>
                  <td data-label="Media">{{ mediaLabel(item.media_type) }}</td>
                  <td data-label="Status">
                    <span class="status-badge" [class.status-badge--published]="item.is_published">
                      {{ item.is_published ? 'Terbit' : 'Draf' }}
                    </span>
                  </td>
                  <td data-label="Unduh">{{ item.is_downloadable ? 'Ya' : 'Tidak' }}</td>
                  <td data-label="Diperbarui">
                    <time [attr.datetime]="item.updated_at">{{ formatDate(item.updated_at) }}</time>
                  </td>
                  @if (canEdit()) {
                    <td data-label="Aksi">
                      <div class="row-actions">
                        <button class="table-action" type="button" (click)="edit(item)">
                          Ubah
                        </button>
                        <button
                          class="table-action table-action--danger"
                          type="button"
                          (click)="openDeleteDialog(item)"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (deleteCandidate(); as item) {
        <div class="dialog-backdrop" (click)="closeDeleteDialog()" aria-hidden="true"></div>
        <section
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          aria-describedby="delete-description"
          (keydown.escape)="closeDeleteDialog()"
        >
          <h2 id="delete-title">Hapus koleksi "{{ item.title }}"?</h2>
          <p id="delete-description">
            Koleksi akan dihapus dari daftar manajemen. File utama dan cover yang terkait juga ikut
            terdampak sesuai aturan backend.
          </p>
          @if (deleteError()) {
            <p class="error" role="alert">{{ deleteError() }}</p>
          }
          <div class="dialog-actions">
            <button
              class="button button--danger"
              type="button"
              (click)="confirmDelete()"
              [disabled]="deleting()"
            >
              {{ deleting() ? 'Menghapus...' : 'Hapus koleksi' }}
            </button>
            <button
              #cancelDeleteButton
              class="button button--secondary"
              type="button"
              (click)="closeDeleteDialog()"
              [disabled]="deleting()"
            >
              Batal
            </button>
          </div>
        </section>
      }
    </section>
  `,
  styles: `
    .management-page {
      max-width: var(--container-wide);
    }

    .page-head,
    .form-title,
    .list-head,
    .actions,
    .dialog-actions {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .page-head p,
    .form-title p,
    .list-head p {
      max-width: var(--content-measure);
      margin: 0;
      color: var(--color-text-muted);
    }

    .policy-note,
    .edit-pill {
      display: grid;
      gap: var(--space-1);
      min-width: min(18rem, 100%);
      padding: var(--space-3) var(--space-4);
      border-left: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-md);
      background: var(--color-info-surface);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
    }

    .collection-form {
      display: grid;
      gap: var(--space-5);
      margin-top: var(--space-6);
      padding: var(--space-5);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    fieldset {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-neutral-surface);
    }

    legend {
      padding: 0 var(--space-2);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
    }

    .fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .field {
      display: grid;
      gap: var(--space-2);
      color: var(--color-brand-950);
      font-weight: var(--weight-semibold);
    }

    .field.wide {
      grid-column: 1/-1;
    }

    input,
    select,
    textarea {
      width: 100%;
      min-height: var(--control-height);
      padding: 0.7rem var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }

    textarea {
      min-height: 8rem;
      resize: vertical;
    }

    input[aria-invalid='true'],
    select[aria-invalid='true'],
    textarea[aria-invalid='true'] {
      border-color: var(--color-danger);
      background: var(--color-danger-surface);
    }

    .field-helper,
    .field-error,
    .file-preview small,
    td small {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      line-height: 1.5;
    }

    .field-helper,
    .file-preview small,
    td small {
      color: var(--color-text-muted);
    }

    .field-error,
    .error {
      color: var(--color-danger-strong);
    }

    .error-summary {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-4);
      border-left: var(--border-width-accent) solid var(--color-danger);
      border-radius: var(--radius-md);
      background: var(--color-danger-surface);
      color: var(--color-danger-strong);
    }

    .switch-grid {
      display: grid;
      gap: var(--space-3);
    }

    .check {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      min-height: var(--control-height);
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      cursor: pointer;
    }

    .check input {
      width: 1.25rem;
      min-height: 1.25rem;
      margin-top: 0.15rem;
    }

    .check span {
      display: grid;
      gap: var(--space-1);
    }

    .check small {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .file-preview {
      display: grid;
      align-content: center;
      min-height: 4.5rem;
      padding: var(--space-3);
      border: var(--border-width) dashed var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-weight: var(--weight-medium);
    }

    .actions,
    .list-head {
      align-items: center;
      margin-top: var(--space-2);
    }

    .table-wrap {
      margin-top: var(--space-4);
      overflow: auto;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    table {
      width: 100%;
      min-width: 56rem;
      border-collapse: collapse;
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      text-align: left;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    th,
    td {
      padding: var(--space-3) var(--space-4);
      border-top: var(--border-width) solid var(--color-border);
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--color-surface-subtle);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }

    .state-cell {
      padding: var(--space-6);
      color: var(--color-text-muted);
      text-align: center;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.2rem var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-pill);
      background: var(--color-info-surface);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }

    .status-badge--published {
      border-color: var(--color-success);
      background: var(--color-success-surface);
      color: var(--color-success);
    }

    .row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .table-action {
      min-width: var(--control-height);
      min-height: var(--control-height);
      padding: 0.55rem var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
      cursor: pointer;
    }

    .table-action:hover {
      background: var(--color-action-secondary-hover);
    }

    .table-action--danger {
      border-color: var(--color-danger);
      color: var(--color-danger-strong);
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-backdrop);
      background: var(--color-overlay);
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: var(--z-modal);
      display: grid;
      gap: var(--space-4);
      width: min(32rem, calc(100vw - 2rem));
      padding: var(--space-5);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
      transform: translate(-50%, -50%);
    }

    .dialog h2,
    .dialog p {
      margin: 0;
    }

    @media (max-width: 48rem) {
      .page-head,
      .form-title,
      .list-head,
      .actions,
      .dialog-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .fields {
        grid-template-columns: 1fr;
      }

      .field.wide {
        grid-column: auto;
      }

      table,
      thead,
      tbody,
      tr,
      th,
      td {
        display: block;
      }

      table {
        min-width: 0;
      }

      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      tr {
        border-top: var(--border-width) solid var(--color-border);
      }

      td {
        display: grid;
        grid-template-columns: minmax(7rem, 36%) minmax(0, 1fr);
        gap: var(--space-3);
        border-top: 0;
      }

      td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        font-weight: var(--weight-bold);
      }

      .state-cell {
        display: block;
      }

      .state-cell::before {
        content: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }
    }
  `,
})
export class DigitalManagementPage {
  @ViewChild('collectionForm') private collectionForm?: ElementRef<HTMLFormElement>;
  @ViewChild('cancelDeleteButton') private cancelDeleteButton?: ElementRef<HTMLButtonElement>;

  protected readonly MAIN_FILE_HELPER = MAIN_FILE_HELPER;
  protected readonly COVER_HELPER = COVER_HELPER;

  private readonly api = inject(DigitalLibraryApiService);
  private readonly masters = inject(MasterDataApiService);
  private readonly auth = inject(AuthStore);
  protected readonly items = signal<DigitalCollection[]>([]);
  protected readonly categories = signal<MasterRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly feedback = signal<FeedbackMessage | null>(null);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly mainFileError = signal('');
  protected readonly coverFileError = signal('');
  protected readonly fileName = signal('');
  protected readonly coverName = signal('');
  protected readonly fileSizeLabel = signal('');
  protected readonly coverSizeLabel = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly deleteCandidate = signal<DigitalCollection | null>(null);
  protected readonly deleteError = signal('');
  private file: File | null = null;
  private cover: File | null = null;
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    mediaType: new FormControl<DigitalMediaType>('ebook', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    authorText: new FormControl('', { nonNullable: true }),
    publisherText: new FormControl('', { nonNullable: true }),
    publicationYear: new FormControl<number | null>(null),
    durationSeconds: new FormControl<number | null>(null),
    isDownloadable: new FormControl(true, { nonNullable: true }),
    isPublished: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    this.load();
    this.masters.list('categories').subscribe({
      next: (r) => this.categories.set(r.data),
      error: (error) => {
        this.feedback.set(
          errorFeedback(
            error,
            'Pilihan kategori belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.',
          ),
        );
      },
    });
  }

  protected canEdit() {
    return this.auth.currentRole() === 'librarian';
  }

  protected load() {
    this.loading.set(true);
    this.error.set('');
    this.api.management().subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          apiMessage(
            error,
            'Data koleksi belum dapat dimuat. Gunakan Muat ulang untuk mencoba lagi.',
          ),
        );
        this.loading.set(false);
      },
    });
  }

  protected suggestSlug() {
    if (this.form.controls.slug.value) return;
    this.form.controls.slug.setValue(
      this.form.controls.title.value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    );
  }

  protected pickFile(event: Event) {
    const selected = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.file = selected;
    this.mainFileError.set('');
    this.fileName.set(selected?.name ?? '');
    this.fileSizeLabel.set(selected ? this.formatBytes(selected.size) : '');

    if (selected && !MAIN_FILE_TYPES.includes(selected.type)) {
      this.mainFileError.set(MAIN_FILE_HELPER);
    } else if (selected && selected.size > MAIN_FILE_MAX_BYTES) {
      this.mainFileError.set('Ukuran file utama melebihi 100 MB.');
    }
  }

  protected pickCover(event: Event) {
    const selected = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.cover = selected;
    this.coverFileError.set('');
    this.coverName.set(selected?.name ?? '');
    this.coverSizeLabel.set(selected ? this.formatBytes(selected.size) : '');

    if (selected && !COVER_TYPES.includes(selected.type)) {
      this.coverFileError.set(COVER_HELPER);
    } else if (selected && selected.size > COVER_MAX_BYTES) {
      this.coverFileError.set('Ukuran cover melebihi 5 MB.');
    }
  }

  protected save() {
    this.form.markAllAsTouched();
    this.formError.set('');

    if (!this.editingId() && !this.file) {
      this.mainFileError.set('File utama wajib dipilih untuk koleksi baru.');
    }

    if (this.form.invalid || this.mainFileError() || this.coverFileError()) {
      this.formError.set('Lengkapi field wajib dan perbaiki file yang ditandai.');
      this.focusFirstError();
      return;
    }

    this.saving.set(true);
    const payload = toFormData(this.form.getRawValue(), this.file, this.cover);
    const request = this.editingId()
      ? this.api.update(this.editingId()!, payload)
      : this.api.create(payload);
    request.subscribe({
      next: () => {
        const wasEditing = Boolean(this.editingId());
        this.saving.set(false);
        this.reset();
        this.feedback.set({
          tone: 'success',
          message: wasEditing ? 'Koleksi berhasil diperbarui.' : 'Koleksi berhasil ditambahkan.',
        });
        this.load();
      },
      error: (error) => {
        this.formError.set(
          apiMessage(error, 'Koleksi gagal disimpan. Periksa format file dan slug.'),
        );
        this.saving.set(false);
        this.focusFirstError();
      },
    });
  }

  protected edit(item: DigitalCollection) {
    this.editingId.set(item.id);
    this.clearFileSelection();
    this.form.setValue({
      title: item.title,
      slug: item.slug,
      description: item.description ?? '',
      mediaType: item.media_type,
      categoryId: item.category_id ?? '',
      authorText: item.author_text ?? '',
      publisherText: item.publisher_text ?? '',
      publicationYear: item.publication_year,
      durationSeconds: item.duration_seconds,
      isDownloadable: item.is_downloadable,
      isPublished: item.is_published,
    });
    this.collectionForm?.nativeElement.scrollIntoView({
      block: 'start',
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    });
    this.collectionForm?.nativeElement
      .querySelector<HTMLInputElement>('[formControlName="title"]')
      ?.focus();
  }

  protected reset() {
    this.editingId.set(null);
    this.clearFileSelection();
    this.form.reset({
      title: '',
      slug: '',
      description: '',
      mediaType: 'ebook',
      categoryId: '',
      authorText: '',
      publisherText: '',
      publicationYear: null,
      durationSeconds: null,
      isDownloadable: true,
      isPublished: false,
    });
    this.formError.set('');
  }

  protected openDeleteDialog(item: DigitalCollection) {
    this.deleteCandidate.set(item);
    this.deleteError.set('');
    setTimeout(() => this.cancelDeleteButton?.nativeElement.focus());
  }

  protected closeDeleteDialog() {
    if (this.deleting()) return;
    this.deleteCandidate.set(null);
    this.deleteError.set('');
  }

  protected confirmDelete() {
    const item = this.deleteCandidate();
    if (!item) return;

    this.deleting.set(true);
    this.deleteError.set('');
    this.api.remove(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteCandidate.set(null);
        this.feedback.set({ tone: 'success', message: 'Koleksi berhasil dihapus.' });
        this.load();
      },
      error: (error) => {
        this.deleteError.set(
          apiMessage(error, 'Koleksi tidak dapat dihapus. Coba kembali atau hubungi admin.'),
        );
        this.deleting.set(false);
      },
    });
  }

  protected showError(controlName: keyof DigitalFormValue) {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  protected isInvalid(controlName: keyof DigitalFormValue) {
    return this.showError(controlName) ? 'true' : 'false';
  }

  protected slugError() {
    const errors = this.form.controls.slug.errors;
    if (errors?.['required']) return 'Slug wajib diisi.';
    if (errors?.['pattern']) return 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.';
    return 'Slug tidak valid.';
  }

  protected mediaLabel(type: DigitalMediaType) {
    const labels: Record<DigitalMediaType, string> = {
      ebook: 'E-book/PDF',
      module: 'Modul',
      video: 'Video',
    };
    return labels[type];
  }

  protected formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : DATE_FORMATTER.format(date);
  }

  private focusFirstError() {
    setTimeout(() => {
      const form = this.collectionForm?.nativeElement;
      const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], .error-summary');
      target?.focus();
    });
  }

  private clearFileSelection() {
    this.file = null;
    this.cover = null;
    this.mainFileError.set('');
    this.coverFileError.set('');
    this.fileName.set('');
    this.coverName.set('');
    this.fileSizeLabel.set('');
    this.coverSizeLabel.set('');
  }

  private formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

function toFormData(value: DigitalFormValue, file: File | null, cover: File | null) {
  const data = new FormData();
  for (const [key, raw] of Object.entries(value)) {
    data.set(key, raw === null ? '' : String(raw));
  }
  if (file) data.set('file', file);
  if (cover) data.set('cover', cover);
  return data;
}

function apiMessage(error: unknown, fallback: string): string {
  const details = parseApiError(error, fallback);
  return details.requestId ? `${details.message} Referensi: ${details.requestId}` : details.message;
}

function errorFeedback(error: unknown, fallback: string): FeedbackMessage {
  const details = parseApiError(error, fallback);
  return {
    tone: 'error',
    message: details.message,
    ...(details.requestId ? { requestId: details.requestId } : {}),
  };
}
