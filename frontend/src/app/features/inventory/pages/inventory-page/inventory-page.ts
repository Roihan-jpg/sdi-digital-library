import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

type Feedback = { type: 'success' | 'error'; message: string };
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
  imports: [ReactiveFormsModule],
  template: `
    <section class="inventory-page page page--wide">
      <div class="page-header">
        <div>
          <p class="eyebrow">Katalog operasional</p>
          <h1>Judul buku dan eksemplar</h1>
          <p>
            Tambahkan metadata judul, lalu daftarkan eksemplar fisik dengan kode inventaris yang
            sama persis dengan isi barcode atau QR.
          </p>
        </div>
        <aside class="code-note" aria-label="Catatan kode inventaris">
          <span class="code-note__label">Payload label</span>
          <code>inventory_code</code>
          <p>Kode ini tidak diganti menjadi ID internal saat dicetak.</p>
        </aside>
      </div>

      @if (feedback()) {
        <div
          class="alert"
          [class.alert--success]="feedback()?.type === 'success'"
          [class.alert--error]="feedback()?.type === 'error'"
          [attr.role]="feedback()?.type === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="feedback()?.type === 'error' ? 'assertive' : 'polite'"
        >
          <p>{{ feedback()?.message }}</p>
        </div>
      }

      @if (loadMessage()) {
        <div class="alert alert--warning" role="status">
          <p>{{ loadMessage() }}</p>
        </div>
      }

      <div class="inventory-grid">
        <form
          class="card card--indexed inventory-form"
          [formGroup]="titleForm"
          (ngSubmit)="saveTitle()"
          data-inventory-form="title"
          novalidate
        >
          <div class="form-heading">
            <div>
              <h2>Data judul</h2>
              <p>Isi informasi yang melekat pada satu judul buku, bukan eksemplar fisik.</p>
            </div>
            <span class="form-chip">Metadata</span>
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
                aria-describedby="title-title-hint title-title-error"
              />
              <span id="title-title-hint" class="field__hint"
                >Nama buku seperti tercetak di sampul.</span
              >
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
                  aria-describedby="title-isbn-hint title-isbn-error"
                />
                <span id="title-isbn-hint" class="field__hint"
                  >Kosongkan bila buku tidak punya ISBN.</span
                >
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
                  aria-describedby="title-catalog-code-hint title-catalog-code-error"
                />
                <span id="title-catalog-code-hint" class="field__hint"
                  >Kode pengelompokan katalog, bukan kode eksemplar.</span
                >
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
                <span class="field__hint">Diambil dari master data kategori.</span>
              </label>

              <label class="field" for="title-publisher">
                <span class="field__label">Penerbit</span>
                <select id="title-publisher" name="publisher" formControlName="publisherId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (publisher of publishers(); track publisher.id) {
                    <option [value]="publisher.id">{{ masterLabel(publisher) }}</option>
                  }
                </select>
                <span class="field__hint">Gunakan master data, bukan ID yang diketik manual.</span>
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
                <span class="field__hint">Rak awal untuk eksemplar baru bila belum dipindah.</span>
              </label>

              <label class="field" for="title-author">
                <span class="field__label">Pengarang utama</span>
                <select id="title-author" name="author" formControlName="authorId">
                  <option [ngValue]="null">Tidak dipilih</option>
                  @for (author of authors(); track author.id) {
                    <option [value]="author.id">{{ masterLabel(author) }}</option>
                  }
                </select>
                <span class="field__hint">Satu pengarang utama ditautkan dari master data.</span>
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
                aria-describedby="title-publication-year-hint title-publication-year-error"
              />
              <span id="title-publication-year-hint" class="field__hint"
                >Gunakan 4 digit tahun, misalnya 2024.</span
              >
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
            <div>
              <h2>Data eksemplar</h2>
              <p>
                Isi identitas fisik buku: judul asal, kode inventaris, rak, kondisi, dan status.
              </p>
            </div>
            <span class="form-chip form-chip--copy">Fisik</span>
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
                aria-describedby="copy-book-title-hint copy-book-title-error"
              >
                <option value="">Pilih judul buku</option>
                @for (book of titles(); track book.id) {
                  <option [value]="book.id">{{ titleLabel(book) }}</option>
                }
              </select>
              <span id="copy-book-title-hint" class="field__hint"
                >Daftar judul diambil dari katalog yang sudah tersimpan.</span
              >
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
                aria-describedby="copy-inventory-code-hint copy-inventory-code-error"
              />
              <span id="copy-inventory-code-hint" class="field__hint">
                Kode ini adalah payload barcode/QR persis. Jangan isi dengan UUID atau ID internal.
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
              <span class="field__hint">Pilih bila eksemplar ditempatkan di rak berbeda.</span>
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
                <span class="field__hint">Kondisi fisik saat eksemplar didaftarkan.</span>
              </label>

              <label class="field" for="copy-status">
                <span class="field__label">Status</span>
                <select id="copy-status" name="status" formControlName="status">
                  @for (status of statusOptions; track status) {
                    <option [value]="status">{{ statusLabels[status] }}</option>
                  }
                </select>
                <span class="field__hint">Status operasional sesuai aturan inventory.</span>
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
    .page-header p,
    .form-heading h2,
    .form-heading p,
    .alert p {
      margin: 0;
    }

    .page-header h1 {
      margin-bottom: var(--space-2);
    }

    .page-header p,
    .form-heading p {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .code-note {
      display: grid;
      gap: var(--space-2);
      align-content: center;
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-inline-start: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .code-note__label,
    .form-chip {
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
      width: fit-content;
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--color-brand-50);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }

    .code-note p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    .inventory-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
      align-items: start;
    }

    .inventory-form {
      display: grid;
      gap: var(--space-5);
    }

    .form-heading {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      justify-content: space-between;
    }

    .form-chip {
      flex: 0 0 auto;
      padding: var(--space-1) var(--space-2);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-brand-50);
      color: var(--color-brand-800);
    }

    .form-chip--copy {
      background: var(--color-success-surface);
      color: var(--color-success);
    }

    fieldset {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
      padding: var(--space-4);
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
      font-weight: var(--weight-bold);
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

    @media (min-width: 64rem) {
      .inventory-grid {
        grid-template-columns: minmax(0, 1.05fr) minmax(20rem, 0.95fr);
      }
    }

    @media (max-width: 36rem) {
      .form-heading,
      .form-actions,
      .form-actions--split {
        align-items: stretch;
        flex-direction: column;
      }

      .form-chip {
        width: fit-content;
      }

      .button {
        width: 100%;
      }

      .compact-field {
        max-width: none;
      }
    }
  `,
})
export class InventoryPage {
  private readonly api = inject(InventoryApiService);
  private readonly masterData = inject(MasterDataApiService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly savingTitle = signal(false);
  protected readonly savingCopy = signal(false);
  protected readonly feedback = signal<Feedback | null>(null);
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
          type: 'success',
          message: `Judul "${v.title}" disimpan. Judul ini sudah dipilih pada form eksemplar.`,
        });
        this.savingTitle.set(false);
      },
      error: () => {
        this.feedback.set({
          type: 'error',
          message:
            'Judul tidak dapat disimpan. Periksa kode katalog, ISBN, dan pilihan master data.',
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
          type: 'success',
          message: `Eksemplar ${r.data.inventory_code} disimpan. Label barcode dan QR siap dicetak.`,
        });
        this.copyForm.controls.inventoryCode.reset();
        this.savingCopy.set(false);
      },
      error: () => {
        this.feedback.set({
          type: 'error',
          message:
            'Eksemplar tidak dapat disimpan. Periksa judul, rak, status, dan duplikasi kode inventaris.',
        });
        this.savingCopy.set(false);
      },
    });
  }

  protected printLast() {
    const id = this.lastCopyId();
    if (!id) return;
    this.api.print([id]).subscribe((html) => {
      const popup = window.open('', '_blank');
      if (popup) {
        popup.document.write(html);
        popup.document.close();
        popup.print();
      }
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
