import { Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../../../core/auth/auth.store';
import {
  ImportApiService,
  type ImportJob,
  type ImportKind,
} from '../../data-access/import-api.service';

type MessageTone = 'success' | 'warning' | 'error' | 'info';

interface PageMessage {
  tone: MessageTone;
  text: string;
}

interface ImportKindConfig {
  value: ImportKind;
  label: string;
  description: string;
  helper: string;
  templateName: string;
}

interface SelectedFileInfo {
  name: string;
  size: number;
  type: string;
}

type KindState<T> = Record<ImportKind, T>;

@Component({
  selector: 'sdi-import-page',
  template: `
    <section class="page page--wide import-page" aria-labelledby="import-title">
      <header class="page-header">
        <div>
          <p class="eyebrow">Migrasi data</p>
          <h1 id="import-title">Import member dan buku</h1>
          <p>
            Gunakan template resmi agar validasi backend dapat membaca header dan setiap baris.
            Baris valid tetap diproses, sedangkan baris gagal disimpan sebagai CSV error.
          </p>
        </div>
      </header>

      <div class="import-grid" aria-label="Pilihan import data" [hidden]="!canWrite()">
        @for (kind of kinds; track kind.value) {
          <article
            class="card import-card"
            [class.import-card--busy]="uploading()[kind.value]"
            [attr.aria-labelledby]="kind.value + '-title'"
          >
            <div class="card-heading">
              <div>
                <p class="eyebrow">
                  {{ kind.value === 'members' ? 'Data anggota' : 'Data koleksi' }}
                </p>
                <h2 [id]="kind.value + '-title'">{{ kind.label }}</h2>
                <p>{{ kind.description }}</p>
              </div>
            </div>

            <ol class="import-steps" aria-label="Urutan import {{ kind.label }}">
              <li>Unduh template</li>
              <li>Pilih file</li>
              <li>Import dan cek hasil</li>
            </ol>

            <div class="action-row">
              <button
                class="button button--secondary"
                type="button"
                [disabled]="templateLoading()[kind.value]"
                [attr.aria-busy]="templateLoading()[kind.value]"
                (click)="downloadTemplate(kind.value)"
              >
                {{ templateLoading()[kind.value] ? 'Menyiapkan template' : 'Unduh template' }}
              </button>
            </div>

            <label class="file-picker" [for]="fileInputId(kind.value)">
              <span class="field__label">Pilih file {{ kind.label.toLowerCase() }}</span>
              <input
                [id]="fileInputId(kind.value)"
                [name]="kind.value + '-file'"
                type="file"
                accept=".xlsx,.csv"
                [attr.aria-describedby]="fileDescribedBy(kind.value)"
                (change)="choose($event, kind.value)"
              />
              <span [id]="fileHelpId(kind.value)" class="field__hint">{{ kind.helper }}</span>
            </label>

            @if (selectedFiles()[kind.value]; as file) {
              <dl class="file-summary" [attr.aria-label]="'File terpilih untuk ' + kind.label">
                <div>
                  <dt>Nama file</dt>
                  <dd>{{ file.name }}</dd>
                </div>
                <div>
                  <dt>Ukuran</dt>
                  <dd>{{ formatFileSize(file.size) }}</dd>
                </div>
                <div>
                  <dt>Tipe</dt>
                  <dd>{{ file.type || 'Tidak terdeteksi' }}</dd>
                </div>
              </dl>
            } @else {
              <p class="file-empty" [id]="fileEmptyId(kind.value)">
                Belum ada file dipilih. Tombol Import aktif setelah file .xlsx atau .csv dipilih.
              </p>
            }

            @if (panelMessages()[kind.value]; as panelMessage) {
              <div
                class="alert panel-alert"
                [class.alert--success]="panelMessage.tone === 'success'"
                [class.alert--warning]="panelMessage.tone === 'warning'"
                [class.alert--error]="panelMessage.tone === 'error'"
                [attr.role]="panelMessage.tone === 'error' ? 'alert' : 'status'"
              >
                <p>{{ panelMessage.text }}</p>
              </div>
            }

            <div class="card-actions">
              <button
                class="button"
                type="button"
                [disabled]="!selectedFiles()[kind.value] || uploading()[kind.value]"
                [attr.aria-busy]="uploading()[kind.value]"
                [attr.aria-describedby]="
                  !selectedFiles()[kind.value] ? fileEmptyId(kind.value) : null
                "
                (click)="upload(kind.value)"
              >
                {{ uploading()[kind.value] ? 'Mengimport ' + kind.label : 'Import ' + kind.label }}
              </button>
              @if (selectedFiles()[kind.value]) {
                <button
                  class="button button--tertiary"
                  type="button"
                  [disabled]="uploading()[kind.value]"
                  (click)="clearFile(kind.value)"
                >
                  Ganti file
                </button>
              }
            </div>
          </article>
        }
      </div>
      @if (!canWrite()) {
        <div class="alert" role="status">
          <p>
            Mode baca: kepala perpustakaan dapat memantau riwayat import, tetapi import baru hanya
            dapat dijalankan pustakawan.
          </p>
        </div>
      }

      @if (message()) {
        <div
          class="alert"
          [class.alert--success]="message()?.tone === 'success'"
          [class.alert--warning]="message()?.tone === 'warning'"
          [class.alert--error]="message()?.tone === 'error'"
          [attr.role]="message()?.tone === 'error' ? 'alert' : 'status'"
        >
          <p>{{ message()?.text }}</p>
        </div>
      }

      <section class="card history-card" aria-labelledby="history-title">
        <div class="table-heading">
          <div>
            <p class="eyebrow">Audit import</p>
            <h2 id="history-title">Riwayat import</h2>
          </div>
          @if (historyLoading()) {
            <p class="loading-state" role="status">Memuat riwayat</p>
          } @else {
            <p class="history-count" aria-live="polite">{{ jobs().length }} pekerjaan</p>
          }
        </div>

        <div
          class="table-wrap"
          tabindex="0"
          aria-label="Tabel riwayat import dapat digeser mendatar"
        >
          <table>
            <caption>
              Riwayat import member dan buku, termasuk waktu, status, jumlah baris berhasil, jumlah
              baris gagal, dan tautan CSV error bila tersedia.
            </caption>
            <thead>
              <tr>
                <th scope="col">Waktu import</th>
                <th scope="col">File</th>
                <th scope="col">Jenis</th>
                <th scope="col">Status</th>
                <th scope="col" class="numeric">Berhasil</th>
                <th scope="col" class="numeric">Gagal</th>
                <th scope="col" class="numeric">Total</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              @if (historyLoading()) {
                <tr>
                  <td colspan="8">
                    <span class="loading-state">Memuat riwayat import</span>
                  </td>
                </tr>
              } @else if (historyError()) {
                <tr>
                  <td colspan="8">
                    <div class="content-state content-state--compact">
                      <h3>Riwayat import belum dapat dimuat</h3>
                      <p class="content-state__description">
                        Periksa koneksi backend, lalu muat ulang riwayat import.
                      </p>
                      <button class="button button--secondary" type="button" (click)="load()">
                        Coba lagi
                      </button>
                    </div>
                  </td>
                </tr>
              } @else if (jobs().length === 0) {
                <tr>
                  <td colspan="8">
                    <div class="content-state content-state--compact">
                      <h3>Belum ada riwayat import</h3>
                      <p class="content-state__description">
                        Unduh template, pilih file, lalu jalankan import pertama. Riwayat akan
                        muncul setelah backend membuat pekerjaan import.
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (job of jobs(); track job.id) {
                  <tr>
                    <td>
                      <time [attr.datetime]="job.created_at">{{
                        formatDateTime(job.created_at)
                      }}</time>
                    </td>
                    <td>
                      <strong>{{ job.file_name }}</strong>
                    </td>
                    <td>{{ kindLabel(job.import_type) }}</td>
                    <td>
                      <span class="status-badge" [class]="statusClass(job.status)">
                        {{ statusLabel(job.status) }}
                      </span>
                    </td>
                    <td class="numeric">{{ formatNumber(job.success_rows) }}</td>
                    <td class="numeric">{{ formatNumber(job.failed_rows) }}</td>
                    <td class="numeric">{{ formatNumber(job.total_rows) }}</td>
                    <td>
                      @if (job.failed_rows > 0) {
                        <button
                          class="table-action"
                          type="button"
                          [disabled]="errorDownloading()[job.id]"
                          [attr.aria-busy]="errorDownloading()[job.id]"
                          [attr.aria-label]="'Unduh CSV error untuk ' + job.file_name"
                          (click)="downloadErrors(job)"
                        >
                          {{ errorDownloading()[job.id] ? 'Menyiapkan CSV' : 'Unduh CSV error' }}
                        </button>
                      } @else {
                        <span class="row-note">Tidak ada baris gagal</span>
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
    .import-page {
      display: grid;
      gap: var(--space-8);
    }

    :where(.page-header, .card-heading, .table-heading) {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .import-page :where(h1, h2, h3, p) {
      margin: 0;
    }

    :where(.page-header, .card-heading) p {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .import-grid {
      display: grid;
      gap: var(--space-6);
    }

    :where(.import-card, .history-card) {
      display: grid;
      gap: var(--space-5);
      align-content: start;
    }

    .import-card {
      border-inline-start: var(--border-width-accent) solid var(--color-brand-700);
    }

    .import-card--busy {
      border-inline-start-color: var(--color-amber-700);
    }

    .import-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .import-steps li {
      min-width: 0;
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-subtle);
      color: var(--color-text);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    :where(.action-row, .card-actions) {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }

    .file-picker {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    input[type='file'] {
      width: 100%;
      min-height: var(--control-height);
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }

    .file-summary {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-neutral-surface);
    }

    .file-summary div {
      display: grid;
      grid-template-columns: minmax(6rem, 0.4fr) minmax(0, 1fr);
      gap: var(--space-3);
      min-width: 0;
    }

    :where(.file-summary dt, .file-empty, .row-note, .history-count) {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    .file-summary dt {
      font-weight: var(--weight-semibold);
    }

    .file-summary dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-family: var(--font-family-data);
      font-size: var(--text-sm);
    }

    .panel-alert {
      padding: var(--space-3);
    }

    .history-card .table-wrap table {
      min-width: 62rem;
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      text-align: left;
    }

    .numeric {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: var(--space-1) var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-surface-subtle);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      white-space: nowrap;
    }

    .status-badge--success {
      border-color: var(--color-accent);
      background: var(--color-success-surface);
      color: var(--color-success);
    }

    .status-badge--warning {
      border-color: var(--color-amber-700);
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }

    .status-badge--danger {
      border-color: var(--color-error);
      background: var(--color-error-surface);
      color: var(--color-danger-strong);
    }

    .status-badge--info {
      border-color: var(--color-brand-700);
      background: var(--color-info-surface);
      color: var(--color-brand-800);
    }

    .table-action {
      min-height: var(--control-height);
      padding: var(--space-2) var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
      cursor: pointer;
      touch-action: manipulation;
    }

    .table-action:hover:not(:disabled) {
      background: var(--color-brand-50);
    }

    .table-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .content-state--compact {
      min-height: 8rem;
      padding: var(--space-6) var(--space-4);
    }

    @media (min-width: 64rem) {
      .import-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 48rem) {
      :where(.page-header, .card-heading, .table-heading) {
        display: grid;
      }

      .import-steps {
        grid-template-columns: 1fr;
      }

      :where(.action-row, .card-actions) > * {
        width: 100%;
      }

      .file-summary div {
        grid-template-columns: 1fr;
        gap: var(--space-1);
      }
    }
  `,
})
export class ImportPage {
  protected readonly api = inject(ImportApiService);
  private readonly auth = inject(AuthStore);
  protected readonly canWrite = computed(() => this.auth.currentRole() === 'librarian');
  protected readonly kinds: readonly ImportKindConfig[] = [
    {
      value: 'members',
      label: 'Member',
      description:
        'Import data siswa, guru, dan anggota non-siswa beserta nomor kartu perpustakaan.',
      helper: 'Gunakan file .xlsx atau .csv maksimal 10 MB dengan header template member resmi.',
      templateName: 'template-members.xlsx',
    },
    {
      value: 'books',
      label: 'Buku dan eksemplar',
      description:
        'Import judul, kategori, pengarang, penerbit, rak, dan kode inventaris eksemplar.',
      helper:
        'Gunakan file .xlsx atau .csv maksimal 10 MB. Kode inventaris di file menjadi payload barcode/QR.',
      templateName: 'template-books.xlsx',
    },
  ];

  protected readonly jobs = signal<ImportJob[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal(false);
  protected readonly message = signal<PageMessage | null>(null);
  protected readonly selectedFiles = signal<KindState<SelectedFileInfo | null>>({
    members: null,
    books: null,
  });
  protected readonly uploading = signal<KindState<boolean>>({ members: false, books: false });
  protected readonly templateLoading = signal<KindState<boolean>>({ members: false, books: false });
  protected readonly panelMessages = signal<KindState<PageMessage | null>>({
    members: null,
    books: null,
  });
  protected readonly errorDownloading = signal<Record<string, boolean>>({});
  protected readonly hasActiveUpload = computed(
    () => this.uploading().members || this.uploading().books,
  );

  private readonly files = new Map<ImportKind, File>();
  private readonly dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  private readonly numberFormatter = new Intl.NumberFormat('id-ID');

  constructor() {
    this.load();
  }

  protected choose(event: Event, kind: ImportKind) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.clearFile(kind);
      return;
    }

    this.files.set(kind, file);
    this.selectedFiles.update((current) => ({
      ...current,
      [kind]: { name: file.name, size: file.size, type: file.type },
    }));
    this.setPanelMessage(kind, {
      tone: 'info',
      text: `${file.name} siap diimport. Pastikan file berasal dari template resmi.`,
    });
  }

  protected clearFile(kind: ImportKind, clearMessage = true) {
    this.files.delete(kind);
    this.selectedFiles.update((current) => ({ ...current, [kind]: null }));
    if (clearMessage) {
      this.setPanelMessage(kind, null);
    }
    const input = document.getElementById(this.fileInputId(kind)) as HTMLInputElement | null;
    if (input) input.value = '';
  }

  protected upload(kind: ImportKind) {
    const file = this.files.get(kind);
    if (!file) {
      this.setPanelMessage(kind, {
        tone: 'warning',
        text: 'Pilih file .xlsx atau .csv terlebih dahulu sebelum menjalankan import.',
      });
      return;
    }

    this.setUploading(kind, true);
    this.setPanelMessage(kind, null);
    this.message.set(null);
    this.api.upload(kind, file).subscribe({
      next: (response) => {
        this.setUploading(kind, false);
        const tone: MessageTone = response.data.failed_rows > 0 ? 'warning' : 'success';
        const text =
          response.data.failed_rows > 0
            ? `Import ${this.kindLabel(kind).toLowerCase()} selesai sebagian: ${this.formatNumber(response.data.success_rows)} berhasil, ${this.formatNumber(response.data.failed_rows)} gagal. Unduh CSV error pada riwayat untuk memperbaiki baris gagal.`
            : `Import ${this.kindLabel(kind).toLowerCase()} selesai: ${this.formatNumber(response.data.success_rows)} baris berhasil.`;
        this.setPanelMessage(kind, { tone, text });
        this.message.set({ tone, text });
        this.clearFile(kind, false);
        this.load();
      },
      error: () => {
        this.setUploading(kind, false);
        this.setPanelMessage(kind, {
          tone: 'error',
          text: 'Import gagal dijalankan. Periksa format file, header template, dan ukuran maksimal 10 MB.',
        });
      },
    });
  }

  protected downloadTemplate(kind: ImportKind) {
    this.setTemplateLoading(kind, true);
    this.api.template(kind).subscribe({
      next: (blob) => {
        this.setTemplateLoading(kind, false);
        download(
          blob,
          this.kinds.find((item) => item.value === kind)?.templateName ?? `template-${kind}.xlsx`,
        );
      },
      error: () => {
        this.setTemplateLoading(kind, false);
        this.setPanelMessage(kind, {
          tone: 'error',
          text: 'Template belum dapat diunduh. Coba lagi sebelum menyiapkan file import.',
        });
      },
    });
  }

  protected downloadErrors(job: ImportJob) {
    this.errorDownloading.update((current) => ({ ...current, [job.id]: true }));
    this.api.errors(job.id).subscribe({
      next: (blob) => {
        this.errorDownloading.update((current) => ({ ...current, [job.id]: false }));
        download(blob, `import-${job.id}-errors.csv`);
      },
      error: () => {
        this.errorDownloading.update((current) => ({ ...current, [job.id]: false }));
        this.message.set({
          tone: 'error',
          text: 'CSV error belum dapat diunduh. Coba lagi dari baris riwayat import.',
        });
      },
    });
  }

  protected load() {
    this.historyLoading.set(true);
    this.historyError.set(false);
    this.api.list().subscribe({
      next: (response) => {
        this.jobs.set(response.data);
        this.historyLoading.set(false);
      },
      error: () => {
        this.jobs.set([]);
        this.historyLoading.set(false);
        this.historyError.set(true);
        this.message.set({
          tone: 'error',
          text: 'Riwayat import belum dapat dimuat. Coba lagi setelah koneksi backend tersedia.',
        });
      },
    });
  }

  protected fileInputId(kind: ImportKind) {
    return `import-${kind}-file`;
  }

  protected fileHelpId(kind: ImportKind) {
    return `import-${kind}-help`;
  }

  protected fileEmptyId(kind: ImportKind) {
    return `import-${kind}-empty`;
  }

  protected fileDescribedBy(kind: ImportKind) {
    return this.selectedFiles()[kind]
      ? this.fileHelpId(kind)
      : `${this.fileHelpId(kind)} ${this.fileEmptyId(kind)}`;
  }

  protected kindLabel(kind: ImportKind) {
    return this.kinds.find((item) => item.value === kind)?.label ?? kind;
  }

  protected statusLabel(status: string) {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'completed_with_errors':
        return 'Selesai sebagian';
      case 'failed':
        return 'Gagal';
      case 'processing':
        return 'Diproses';
      case 'pending':
        return 'Menunggu';
      default:
        return status || 'Tidak diketahui';
    }
  }

  protected statusClass(status: string) {
    switch (status) {
      case 'completed':
        return 'status-badge status-badge--success';
      case 'completed_with_errors':
        return 'status-badge status-badge--warning';
      case 'failed':
        return 'status-badge status-badge--danger';
      case 'processing':
      case 'pending':
        return 'status-badge status-badge--info';
      default:
        return 'status-badge';
    }
  }

  protected formatDateTime(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : this.dateFormatter.format(date);
  }

  protected formatNumber(value: number) {
    return this.numberFormatter.format(value ?? 0);
  }

  protected formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setUploading(kind: ImportKind, value: boolean) {
    this.uploading.update((current) => ({ ...current, [kind]: value }));
  }

  private setTemplateLoading(kind: ImportKind, value: boolean) {
    this.templateLoading.update((current) => ({ ...current, [kind]: value }));
  }

  private setPanelMessage(kind: ImportKind, value: PageMessage | null) {
    this.panelMessages.update((current) => ({ ...current, [kind]: value }));
  }
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
