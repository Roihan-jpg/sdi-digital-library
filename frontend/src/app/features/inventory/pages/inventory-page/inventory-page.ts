import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  FeedbackBanner,
  type FeedbackMessage,
} from '../../../../shared/components/feedback-banner/feedback-banner';
import { forkJoin } from 'rxjs';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import {
  InventoryApiService,
  type BookCopyPayload,
  type BookTitlePayload,
  type InventoryTitleOption,
} from '../../data-access/inventory-api.service';

type TitleField =
  | 'title'
  | 'isbn'
  | 'catalogCode'
  | 'categoryId'
  | 'publisherId'
  | 'defaultShelfId'
  | 'publicationYear'
  | 'authorId';
type CopyField = 'bookTitleId' | 'inventoryCode' | 'shelfId' | 'condition' | 'status';

const conditionLabels: Record<BookCopyPayload['condition'], string> = {
  new: 'Baru',
  good: 'Baik',
  fair: 'Cukup',
  damaged: 'Rusak',
  lost: 'Hilang',
};

const statusLabels: Record<BookCopyPayload['status'], string> = {
  available: 'Tersedia',
  reserved: 'Direservasi',
  loaned: 'Dipinjam',
  damaged: 'Rusak',
  lost: 'Hilang',
  maintenance: 'Perawatan',
  inactive: 'Nonaktif',
};

@Component({
  selector: 'sdi-inventory-page',
  imports: [ReactiveFormsModule, FeedbackBanner],
  template: `
    <section class="inventory-page page page--wide">
      <div class="page-header">
        <div>
          <p class="eyebrow">Katalog operasional</p>
          <h1>Judul buku dan eksemplar</h1>
        </div>
        <aside class="code-note" aria-label="Catatan kode inventaris">
          <span class="code-note__label">Kode inventaris</span>
          <code>inventory_code</code>
          <span class="code-note__hint">Harus sama dengan barcode/QR.</span>
        </aside>
      </div>

      @if (feedback()) {
        <sdi-feedback-banner
          [tone]="feedback()!.tone"
          [message]="feedback()!.message"
          [requestId]="feedback()!.requestId"
          [dismissible]="true"
          (dismissed)="feedback.set(null)"
        />
      }

      @if (loadMessage()) {
        <div class="alert alert--warning" role="status">
          <p>{{ loadMessage() }}</p>
        </div>
      }

      <div class="inventory-grid" [hidden]="!canWrite()">
        <form
          class="card card--indexed inventory-form"
          [formGroup]="titleForm"
          (ngSubmit)="saveTitle()"
          data-inventory-form="title"
          novalidate
        >
          <div class="form-heading">
            <h2>Data judul</h2>
          </div>

          @if (titleSubmitted() && titleForm.invalid) {
            <p class="validation-summary" role="alert">
              Periksa data judul. Fokus dipindahkan ke field pertama yang perlu diperbaiki.
            </p>
          }

          <fieldset>
            <legend>Identitas buku</legend>
            <label class="field" for="title-title">
              <span class="field__label">Judul <span aria-hidden="true">*</span></span>
              <input
                id="title-title"
                name="title"
                formControlName="title"
                autocomplete="off"
                [attr.aria-invalid]="titleError('title') ? 'true' : null"
                [attr.aria-describedby]="titleError('title') ? 'title-title-error' : null"
              />
              @if (titleError('title')) {
                <span id="title-title-error" class="validation-message">{{
                  titleError('title')
                }}</span>
              }
            </label>

            <div class="field-row">
              <label class="field" for="title-isbn">
                <span class="field__label">ISBN</span>
                <input
                  id="title-isbn"
                  name="isbn"
                  formControlName="isbn"
                  autocomplete="off"
                  inputmode="text"
                  [attr.aria-invalid]="titleError('isbn') ? 'true' : null"
                  [attr.aria-describedby]="titleError('isbn') ? 'title-isbn-error' : null"
                />
                @if (titleError('isbn')) {
                  <span id="title-isbn-error" class="validation-message">{{
                    titleError('isbn')
                  }}</span>
                }
              </label>

              <label class="field" for="title-catalog-code">
                <span class="field__label">Kode katalog</span>
                <input
                  id="title-catalog-code"
                  name="catalog-code"
                  formControlName="catalogCode"
                  autocomplete="off"
                  class="data-input"
                  [attr.aria-invalid]="titleError('catalogCode') ? 'true' : null"
                  [attr.aria-describedby]="
                    titleError('catalogCode') ? 'title-catalog-code-error' : null
                  "
                />
                @if (titleError('catalogCode')) {
                  <span id="title-catalog-code-error" class="validation-message">{{
                    titleError('catalogCode')
                  }}</span>
                }
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Master data</legend>
            <div class="field-row">
              <label class="field" for="title-category">
                <span class="field__label">Kategori</span>
                <select id="title-category" name="category" formControlName="categoryId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.id">{{ masterLabel(category) }}</option>
                  }
                </select>
              </label>

              <label class="field" for="title-publisher">
                <span class="field__label">Penerbit</span>
                <select id="title-publisher" name="publisher" formControlName="publisherId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (publisher of publishers(); track publisher.id) {
                    <option [value]="publisher.id">{{ masterLabel(publisher) }}</option>
                  }
                </select>
              </label>
            </div>

            <div class="field-row">
              <label class="field" for="title-shelf">
                <span class="field__label">Rak default</span>
                <select id="title-shelf" name="default-shelf" formControlName="defaultShelfId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (shelf of shelves(); track shelf.id) {
                    <option [value]="shelf.id">{{ masterLabel(shelf) }}</option>
                  }
                </select>
              </label>

              <label class="field" for="title-author">
                <span class="field__label">Pengarang utama</span>
                <select id="title-author" name="author" formControlName="authorId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (author of authors(); track author.id) {
                    <option [value]="author.id">{{ masterLabel(author) }}</option>
                  }
                </select>
              </label>
            </div>

            <label class="field compact-field" for="title-publication-year">
              <span class="field__label">Tahun terbit</span>
              <input
                id="title-publication-year"
                name="publication-year"
                type="number"
                inputmode="numeric"
                formControlName="publicationYear"
                [attr.aria-invalid]="titleError('publicationYear') ? 'true' : null"
                [attr.aria-describedby]="
                  titleError('publicationYear') ? 'title-publication-year-error' : null
                "
              />
              @if (titleError('publicationYear')) {
                <span id="title-publication-year-error" class="validation-message">{{
                  titleError('publicationYear')
                }}</span>
              }
            </label>
          </fieldset>

          <div class="form-actions">
            <button class="button" [disabled]="savingTitle()" [attr.aria-busy]="savingTitle()">
              {{ savingTitle() ? 'Menyimpan judul' : 'Simpan judul' }}
            </button>
          </div>
        </form>

        <form
          class="card inventory-form"
          [formGroup]="copyForm"
          (ngSubmit)="saveCopy()"
          data-inventory-form="copy"
          novalidate
        >
          <div class="form-heading">
            <h2>Data eksemplar</h2>
          </div>

          @if (copySubmitted() && copyForm.invalid) {
            <p class="validation-summary" role="alert">
              Periksa data eksemplar. Fokus dipindahkan ke field pertama yang perlu diperbaiki.
            </p>
          }

          <fieldset>
            <legend>Hubungkan ke judul</legend>
            <label class="field" for="copy-book-title">
              <span class="field__label">Judul buku <span aria-hidden="true">*</span></span>
              <select
                id="copy-book-title"
                name="book-title"
                formControlName="bookTitleId"
                [attr.aria-invalid]="copyError('bookTitleId') ? 'true' : null"
                [attr.aria-describedby]="
                  copyError('bookTitleId') ? 'copy-book-title-error' : null
                "
              >
                <option value="">Pilih judul buku</option>
                @for (book of titles(); track book.id) {
                  <option [value]="book.id">{{ titleLabel(book) }}</option>
                }
              </select>
              @if (copyError('bookTitleId')) {
                <span id="copy-book-title-error" class="validation-message">{{
                  copyError('bookTitleId')
                }}</span>
              }
            </label>
          </fieldset>

          <fieldset>
            <legend>Identitas fisik</legend>
            <label class="field" for="copy-inventory-code">
              <span class="field__label">Kode inventaris <span aria-hidden="true">*</span></span>
              <input
                id="copy-inventory-code"
                name="inventory-code"
                formControlName="inventoryCode"
                autocomplete="off"
                spellcheck="false"
                class="data-input data-input--prominent"
                [attr.aria-invalid]="copyError('inventoryCode') ? 'true' : null"
                [attr.aria-describedby]="
                  copyError('inventoryCode')
                    ? 'copy-inventory-code-hint copy-inventory-code-error'
                    : 'copy-inventory-code-hint'
                "
              />
              <span id="copy-inventory-code-hint" class="field__hint">
                Gunakan nilai barcode/QR persis.
              </span>
              @if (copyError('inventoryCode')) {
                <span id="copy-inventory-code-error" class="validation-message">{{
                  copyError('inventoryCode')
                }}</span>
              }
            </label>

            <label class="field" for="copy-shelf">
              <span class="field__label">Rak eksemplar</span>
              <select id="copy-shelf" name="copy-shelf" formControlName="shelfId">
                <option [ngValue]="null">Ikuti rak default judul</option>
                  @for (shelf of shelves(); track shelf.id) {
                    <option [value]="shelf.id">{{ masterLabel(shelf) }}</option>
                  }
                </select>
              </label>
          </fieldset>

          <fieldset>
            <legend>Kondisi dan status</legend>
            <div class="field-row">
              <label class="field" for="copy-condition">
                <span class="field__label">Kondisi</span>
                <select id="copy-condition" name="condition" formControlName="condition">
                  @for (condition of conditionOptions; track condition) {
                    <option [value]="condition">{{ conditionLabels[condition] }}</option>
                  }
                </select>
              </label>

              <label class="field" for="copy-status">
                <span class="field__label">Status</span>
                <select id="copy-status" name="status" formControlName="status">
                  @for (status of statusOptions; track status) {
                    <option [value]="status">{{ statusLabels[status] }}</option>
                  }
                </select>
              </label>
            </div>
          </fieldset>

          <div class="form-actions form-actions--split">
            @if (lastCopyId()) {
              <button class="button button--secondary" type="button" (click)="printLast()">
                Cetak barcode & QR terakhir
              </button>
            }
            <button class="button" [disabled]="savingCopy()" [attr.aria-busy]="savingCopy()">
              {{ savingCopy() ? 'Menyimpan eksemplar' : 'Simpan eksemplar' }}
            </button>
          </div>
        </form>
      </div>
      @if (!canWrite()) {
        <section class="card">
          <h2>Daftar judul inventaris</h2>
          <p>Mode baca. Perubahan judul dan eksemplar hanya dapat dilakukan pustakawan.</p>
          @if (titles().length === 0) {
            <p>Belum ada judul yang dapat ditampilkan.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Kode katalog</th>
                    <th>ISBN</th>
                  </tr>
                </thead>
                <tbody>
                  @for (book of titles(); track book.id) {
                    <tr>
                      <td>{{ book.title }}</td>
                      <td>{{ book.catalog_code || '-' }}</td>
                      <td>{{ book.isbn || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .inventory-page {
      display: grid;
      gap: var(--space-6);
    }

    .page-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
      align-items: stretch;
    }

    .page-header h1,
    .form-heading h2,
    .alert p {
      margin: 0;
    }

    .page-header h1 {
      margin-top: var(--space-1);
    }

    .code-note {
      display: grid;
      grid-template-columns: auto auto;
      gap: var(--space-1) var(--space-2);
      align-content: center;
      padding: var(--space-3) var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-inline-start: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .code-note__label {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-extrabold);
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
    }

    code,
    .data-input {
      font-family: var(--font-family-data);
      font-variant-numeric: tabular-nums;
    }

    .code-note code {
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--color-brand-50);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }

    .code-note__hint {
      grid-column: 1 / -1;
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 400;
    }

    .inventory-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
      align-items: start;
    }

    .inventory-form {
      display: grid;
      gap: var(--space-4);
    }

    .inventory-page .field,
    .inventory-page .field__label {
      color: var(--color-text);
      font-size: 0.8rem;
      font-weight: 400;
    }

    .inventory-page :is(input, select, textarea) {
      font-weight: 400;
    }

    .inventory-page :is(input, textarea)::placeholder {
      font-weight: 400;
    }

    .inventory-page .field__hint {
      font-size: 0.8rem;
      font-weight: 400;
      line-height: 1.5;
    }

    .form-heading {
      min-width: 0;
    }

    fieldset {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-neutral-surface);
    }

    legend {
      padding-inline: var(--space-2);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
    }

    .field-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
    }

    .compact-field {
      max-width: 14rem;
    }

    .data-input--prominent {
      color: var(--color-brand-950);
      font-weight: 400;
      letter-spacing: 0;
    }

    .validation-summary {
      margin: 0;
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-danger-strong);
      font-weight: var(--weight-semibold);
    }

    .form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      justify-content: flex-end;
    }

    .form-actions--split {
      justify-content: space-between;
    }

    @media (min-width: 48rem) {
      .page-header {
        grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
      }

      .field-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (min-width: 72rem) {
      .inventory-grid {
        grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
      }
    }

    @media (max-width: 36rem) {
      .form-actions,
      .form-actions--split {
        align-items: stretch;
        flex-direction: column;
      }

      .button {
        width: 100%;
      }

      .compact-field {
        max-width: none;
      }

      fieldset {
        padding: var(--space-3);
      }
    }
  `,
})
export class InventoryPage {
  private readonly api = inject(InventoryApiService);
  private readonly auth = inject(AuthStore);
  protected readonly canWrite = computed(() => this.auth.currentRole() === 'librarian');
  private readonly masterData = inject(MasterDataApiService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly savingTitle = signal(false);
  protected readonly savingCopy = signal(false);
  protected readonly feedback = signal<FeedbackMessage | null>(null);
  protected readonly loadMessage = signal('');
  protected readonly lastCopyId = signal<string | null>(null);
  protected readonly categories = signal<MasterRow[]>([]);
  protected readonly authors = signal<MasterRow[]>([]);
  protected readonly publishers = signal<MasterRow[]>([]);
  protected readonly shelves = signal<MasterRow[]>([]);
  protected readonly titles = signal<InventoryTitleOption[]>([]);
  protected readonly titleSubmitted = signal(false);
  protected readonly copySubmitted = signal(false);
  protected readonly conditionLabels = conditionLabels;
  protected readonly statusLabels = statusLabels;
  protected readonly conditionOptions = Object.keys(
    conditionLabels,
  ) as BookCopyPayload['condition'][];
  protected readonly statusOptions = Object.keys(statusLabels) as BookCopyPayload['status'][];

  protected readonly titleForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    isbn: new FormControl<string | null>(null),
    catalogCode: new FormControl<string | null>(null),
    categoryId: new FormControl<string | null>(null),
    publisherId: new FormControl<string | null>(null),
    defaultShelfId: new FormControl<string | null>(null),
    publicationYear: new FormControl<number | null>(null, {
      validators: [Validators.min(1000), Validators.max(2100)],
    }),
    authorId: new FormControl<string | null>(null),
  });
  protected readonly copyForm = new FormGroup({
    bookTitleId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    inventoryCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shelfId: new FormControl<string | null>(null),
    condition: new FormControl<BookCopyPayload['condition']>('good', {
      nonNullable: true,
    }),
    status: new FormControl<BookCopyPayload['status']>('available', { nonNullable: true }),
  });

  constructor() {
    this.loadReferenceData();
  }

  protected saveTitle() {
    this.titleSubmitted.set(true);
    this.titleForm.markAllAsTouched();
    if (this.titleForm.invalid) {
      this.focusFirstInvalid('title');
      return;
    }

    const v = this.titleForm.getRawValue();
    const body: BookTitlePayload = {
      ...v,
      authorIds: v.authorId ? [v.authorId] : [],
      language: 'id',
      purchasePrice: null,
      isReferenceOnly: false,
      isActive: true,
      isPublished: true,
    };
    this.savingTitle.set(true);
    this.api.createTitle(body).subscribe({
      next: (r) => {
        this.copyForm.controls.bookTitleId.setValue(r.data.id);
        this.titles.update((items) => [this.titleOptionFromForm(r.data.id, v), ...items]);
        this.titleSubmitted.set(false);
        this.feedback.set({
          tone: 'success',
          message: `Judul "${v.title}" disimpan. Judul ini sudah dipilih pada form eksemplar.`,
        });
        this.savingTitle.set(false);
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Judul tidak dapat disimpan. Periksa kode katalog, ISBN, dan pilihan master data.',
        );
        this.feedback.set({
          tone: 'error',
          message: details.message,
          ...(details.requestId ? { requestId: details.requestId } : {}),
        });
        this.savingTitle.set(false);
      },
    });
  }

  protected saveCopy() {
    this.copySubmitted.set(true);
    this.copyForm.markAllAsTouched();
    if (this.copyForm.invalid) {
      this.focusFirstInvalid('copy');
      return;
    }

    const body: BookCopyPayload = { ...this.copyForm.getRawValue(), isActive: true };
    this.savingCopy.set(true);
    this.api.createCopy(body).subscribe({
      next: (r) => {
        this.lastCopyId.set(r.data.id);
        this.copySubmitted.set(false);
        this.feedback.set({
          tone: 'success',
          message: `Eksemplar ${r.data.inventory_code} disimpan. Label barcode dan QR siap dicetak.`,
        });
        this.copyForm.controls.inventoryCode.reset();
        this.savingCopy.set(false);
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Eksemplar tidak dapat disimpan. Periksa judul, rak, status, dan duplikasi kode inventaris.',
        );
        this.feedback.set({
          tone: 'error',
          message: details.message,
          ...(details.requestId ? { requestId: details.requestId } : {}),
        });
        this.savingCopy.set(false);
      },
    });
  }

  protected printLast() {
    const id = this.lastCopyId();
    if (!id) return;
    this.api.print([id]).subscribe({
      next: (html) => {
        const popup = window.open('', '_blank');
        if (!popup) {
          this.feedback.set({
            tone: 'warning',
            message: 'Jendela cetak diblokir browser. Izinkan pop-up lalu coba cetak kembali.',
          });
          return;
        }
        popup.document.write(html);
        popup.document.close();
        popup.print();
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Label belum dapat dibuat. Periksa koneksi lalu coba cetak kembali.',
        );
        this.feedback.set({
          tone: 'error',
          message: details.message,
          ...(details.requestId ? { requestId: details.requestId } : {}),
        });
      },
    });
  }

  protected titleError(field: TitleField): string {
    const control = this.titleForm.controls[field];
    if (!this.titleSubmitted() && !control.touched) return '';
    return this.errorText(control, titleFieldLabels[field]);
  }

  protected copyError(field: CopyField): string {
    const control = this.copyForm.controls[field];
    if (!this.copySubmitted() && !control.touched) return '';
    return this.errorText(control, copyFieldLabels[field]);
  }

  protected masterLabel(row: MasterRow): string {
    return row.code ? `${row.code} - ${row.name}` : row.name;
  }

  protected titleLabel(row: InventoryTitleOption): string {
    const details = [row.catalog_code, row.isbn, row.categories?.name].filter(Boolean).join(' | ');
    return details ? `${row.title} (${details})` : row.title;
  }

  private loadReferenceData() {
    forkJoin({
      categories: this.masterData.list('categories'),
      authors: this.masterData.list('authors'),
      publishers: this.masterData.list('publishers'),
      shelves: this.masterData.list('shelves'),
      titles: this.api.listTitles(),
    }).subscribe({
      next: ({ categories, authors, publishers, shelves, titles }) => {
        this.categories.set(categories.data);
        this.authors.set(authors.data);
        this.publishers.set(publishers.data);
        this.shelves.set(shelves.data);
        this.titles.set(titles.data);
      },
      error: () => {
        this.loadMessage.set(
          'Sebagian pilihan master data atau daftar judul belum dapat dimuat. Simpan data baru masih bisa dicoba setelah pilihan tersedia.',
        );
      },
    });
  }

  private focusFirstInvalid(form: 'title' | 'copy') {
    const id =
      form === 'title'
        ? titleFocusOrder.find((field) => this.titleForm.controls[field].invalid)
        : copyFocusOrder.find((field) => this.copyForm.controls[field].invalid);
    if (id === undefined) return;
    queueMicrotask(() => {
      this.element.nativeElement.querySelector<HTMLElement>(`#${fieldIds[id]}`)?.focus();
    });
  }

  private errorText(control: FormControl<unknown>, label: string): string {
    if (control.hasError('required')) return `${label} wajib diisi.`;
    if (control.hasError('min') || control.hasError('max')) {
      return `${label} harus berupa tahun 1000 sampai 2100.`;
    }
    return '';
  }

  private titleOptionFromForm(
    id: string,
    value: ReturnType<typeof this.titleForm.getRawValue>,
  ): InventoryTitleOption {
    return {
      id,
      title: value.title,
      subtitle: null,
      isbn: value.isbn,
      catalog_code: value.catalogCode,
      publication_year: value.publicationYear,
      categories: this.findMaster(this.categories(), value.categoryId),
      publishers: this.findMaster(this.publishers(), value.publisherId),
      stock: { total: 0, available: 0 },
    };
  }

  private findMaster(rows: MasterRow[], id: string | null): { name: string } | null {
    return rows.find((row) => row.id === id) ?? null;
  }
}

const titleFieldLabels: Record<TitleField, string> = {
  title: 'Judul',
  isbn: 'ISBN',
  catalogCode: 'Kode katalog',
  categoryId: 'Kategori',
  publisherId: 'Penerbit',
  defaultShelfId: 'Rak default',
  publicationYear: 'Tahun terbit',
  authorId: 'Pengarang utama',
};

const copyFieldLabels: Record<CopyField, string> = {
  bookTitleId: 'Judul buku',
  inventoryCode: 'Kode inventaris',
  shelfId: 'Rak eksemplar',
  condition: 'Kondisi',
  status: 'Status',
};

const titleFocusOrder: TitleField[] = [
  'title',
  'isbn',
  'catalogCode',
  'categoryId',
  'publisherId',
  'defaultShelfId',
  'publicationYear',
  'authorId',
];

const copyFocusOrder: CopyField[] = [
  'bookTitleId',
  'inventoryCode',
  'shelfId',
  'condition',
  'status',
];

const fieldIds: Record<TitleField | CopyField, string> = {
  title: 'title-title',
  isbn: 'title-isbn',
  catalogCode: 'title-catalog-code',
  categoryId: 'title-category',
  publisherId: 'title-publisher',
  defaultShelfId: 'title-shelf',
  publicationYear: 'title-publication-year',
  authorId: 'title-author',
  bookTitleId: 'copy-book-title',
  inventoryCode: 'copy-inventory-code',
  shelfId: 'copy-shelf',
  condition: 'copy-condition',
  status: 'copy-status',
};
