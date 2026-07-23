import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { AuthStore } from '../../../../core/auth/auth.store';
import {
  MasterDataApiService,
  type MasterRow,
} from '../../../master-data/data-access/master-data-api.service';
import { ReportApiService } from '../../data-access/report-api.service';
import type {
  ReportColumn,
  ReportKind,
  ReportResult,
  SchoolIdentity,
} from '../../models/report.model';

type ExportFormat = 'pdf' | 'xlsx';
type ReportFilterValue = ReturnType<ReportsPage['filters']['getRawValue']>;
type SchoolFormKey = keyof ReturnType<ReportsPage['schoolForm']['getRawValue']>;

const reportOptions: { value: ReportKind; label: string }[] = [
  { value: 'popular-books', label: 'Buku paling sering dipinjam' },
  { value: 'active-students', label: 'Siswa paling aktif' },
  { value: 'overdue', label: 'Keterlambatan' },
  { value: 'fines', label: 'Denda dan pembayaran' },
  { value: 'damaged-lost', label: 'Buku rusak/hilang' },
  { value: 'inventory', label: 'Stok dan inventaris' },
  { value: 'visits', label: 'Kunjungan individu/rombongan' },
  { value: 'digital-activity', label: 'Aktivitas koleksi digital' },
  { value: 'accreditation', label: 'Ringkasan pendukung akreditasi' },
];

const statusLabels: Record<string, string> = {
  unpaid: 'Belum lunas',
  partial: 'Dibayar sebagian',
  paid: 'Lunas',
  damaged: 'Rusak',
  lost: 'Hilang',
  view: 'Dibuka',
  play: 'Diputar',
  download: 'Diunduh',
  borrowed: 'Dipinjam',
  returned: 'Dikembalikan',
  overdue: 'Terlambat',
  active: 'Aktif',
  inactive: 'Nonaktif',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});
const numberFormatter = new Intl.NumberFormat('id-ID');
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'sdi-reports-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page reports-page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Monitoring</p>
          <h1>Laporan perpustakaan</h1>
          <p>
            Semua angka dihitung dari transaksi. Gunakan filter lalu ekspor hasil yang sedang
            tampil.
          </p>
        </div>
        <div class="report-note" aria-label="Konteks laporan">
          <strong>{{ activeReportLabel() }}</strong>
          <span>{{ periodLabel() }}</span>
        </div>
      </div>

      <form [formGroup]="filters" (ngSubmit)="applyFilters()" class="filters">
        <div class="filter-title">
          <div>
            <p class="eyebrow">Filter laporan</p>
            <h2>Parameter data</h2>
          </div>
          <button class="button" type="submit" [disabled]="loading()">
            {{ loading() ? 'Memuat...' : 'Tampilkan laporan' }}
          </button>
        </div>

        <div class="filter-grid">
          <label class="field field--wide">
            <span>Jenis laporan</span>
            <select formControlName="kind" (change)="clearStatus()">
              @for (option of reportOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Dari</span>
            <input type="date" formControlName="from" aria-describedby="date-helper" />
          </label>

          <label class="field">
            <span>Sampai</span>
            <input type="date" formControlName="to" aria-describedby="date-helper" />
          </label>

          <label class="field">
            <span>Kelas</span>
            <select formControlName="classId">
              <option value="">Semua kelas</option>
              @for (item of classes(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Rombel</span>
            <select formControlName="studyGroupId">
              <option value="">Semua rombel</option>
              @for (item of studyGroups(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Kategori</span>
            <select formControlName="categoryId">
              <option value="">Semua kategori</option>
              @for (item of categories(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Status/aktivitas</span>
            <select formControlName="status">
              <option value="">Semua status</option>
              @for (option of statusOptions(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label class="field field--wide">
            <span>Pencarian</span>
            <input formControlName="search" placeholder="Nama, judul, kode..." autocomplete="off" />
          </label>
        </div>
        <p id="date-helper" class="field-helper">
          Filter tersimpan di URL agar konfigurasi laporan bisa dibuka kembali.
        </p>
      </form>

      <div class="toolbar" aria-label="Aksi laporan">
        <div class="export-actions">
          <button
            class="button button--secondary"
            type="button"
            [disabled]="!report() || exportingFormat() !== null"
            (click)="download('pdf')"
          >
            {{ exportingFormat() === 'pdf' ? 'Membuat PDF...' : 'Export PDF' }}
          </button>
          <button
            class="button button--secondary"
            type="button"
            [disabled]="!report() || exportingFormat() !== null"
            (click)="download('xlsx')"
          >
            {{ exportingFormat() === 'xlsx' ? 'Membuat Excel...' : 'Export Excel' }}
          </button>
        </div>
        @if (report(); as current) {
          <span class="row-count">{{ number(current.rows.length) }} baris</span>
        }
      </div>

      @if (error()) {
        <div class="notice notice--error" role="alert">
          <strong>Gagal memproses laporan</strong>
          <span>{{ error() }}</span>
        </div>
      }

      <section class="result" aria-labelledby="report-result-title">
        @if (loading()) {
          <div class="state-block" role="status">Memuat laporan dengan filter aktif...</div>
        } @else if (report(); as current) {
          <div class="result-head">
            <div>
              <p class="eyebrow">Hasil laporan</p>
              <h2 id="report-result-title">{{ current.title }}</h2>
            </div>
            <span class="period-pill">{{ periodLabel() }}</span>
          </div>

          <div class="table-wrap" role="region" aria-labelledby="report-result-title" tabindex="0">
            <table>
              <caption>
                {{
                  current.title
                }}
                untuk
                {{
                  periodLabel().toLowerCase()
                }}
                dengan filter aktif.
              </caption>
              <thead>
                <tr>
                  @for (column of current.columns; track column.key) {
                    <th scope="col" [class.numeric]="isNumeric(column)">{{ column.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @if (current.rows.length === 0) {
                  <tr>
                    <td class="state-cell" [attr.colspan]="current.columns.length">
                      Tidak ada data pada periode dan filter ini. Ubah tanggal, status, kelas,
                      kategori, atau kata pencarian.
                    </td>
                  </tr>
                } @else {
                  @for (row of current.rows; track $index) {
                    <tr>
                      @for (column of current.columns; track column.key) {
                        <td
                          [attr.data-label]="column.label"
                          [class.numeric]="isNumeric(column)"
                          [class.status-cell]="isStatusColumn(column)"
                        >
                          @if (isStatusColumn(column)) {
                            <span class="status-badge">{{ display(row[column.key], column) }}</span>
                          } @else {
                            {{ display(row[column.key], column) }}
                          }
                        </td>
                      }
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <div class="summary" aria-labelledby="summary-title">
            <h3 id="summary-title">Ringkasan</h3>
            @for (item of summaryEntries(current); track item[0]) {
              <p>
                <span>{{ label(item[0]) }}</span>
                <strong>{{ formatSummary(item[1]) }}</strong>
              </p>
            }
          </div>
        } @else {
          <div class="state-block">
            Pilih filter lalu tampilkan laporan untuk melihat data transaksi perpustakaan.
          </div>
        }
      </section>

      @if (isMaster()) {
        <details class="school-panel">
          <summary>Identitas sekolah untuk export</summary>
          <form
            #schoolIdentityForm
            [formGroup]="schoolForm"
            (ngSubmit)="saveSchool()"
            class="school"
            novalidate
          >
            @if (schoolError()) {
              <div class="notice notice--error school-error" role="alert" tabindex="-1">
                <strong>Identitas belum lengkap</strong>
                <span>{{ schoolError() }}</span>
              </div>
            }

            <label class="field">
              <span>Nama sekolah <span aria-hidden="true">*</span></span>
              <input
                formControlName="schoolName"
                data-control-name="schoolName"
                [attr.aria-invalid]="isSchoolInvalid('schoolName')"
                aria-describedby="school-name-error"
              />
              @if (showSchoolError('schoolName')) {
                <span id="school-name-error" class="field-error">Nama sekolah wajib diisi.</span>
              }
            </label>

            <label class="field field--wide">
              <span>Alamat</span>
              <textarea rows="3" formControlName="schoolAddress"></textarea>
            </label>

            <label class="field">
              <span>Telepon</span>
              <input formControlName="schoolPhone" autocomplete="tel" />
            </label>

            <label class="field">
              <span>Email</span>
              <input
                type="email"
                formControlName="schoolEmail"
                data-control-name="schoolEmail"
                autocomplete="email"
                [attr.aria-invalid]="isSchoolInvalid('schoolEmail')"
                aria-describedby="school-email-error"
              />
              @if (showSchoolError('schoolEmail')) {
                <span id="school-email-error" class="field-error">Format email tidak valid.</span>
              }
            </label>

            <label class="field field--wide">
              <span>Path logo Storage</span>
              <input
                formControlName="schoolLogoPath"
                placeholder="Opsional"
                aria-describedby="logo-helper"
              />
              <span id="logo-helper" class="field-helper">
                Isi hanya path file yang sudah dikelola backend/storage.
              </span>
            </label>

            <button class="button" type="submit" [disabled]="savingSchool()">
              {{ savingSchool() ? 'Menyimpan...' : 'Simpan identitas' }}
            </button>
          </form>
        </details>
      }
    </section>
  `,
  styles: `
    .reports-page {
      max-width: var(--container-wide);
    }

    .page-head,
    .filter-title,
    .toolbar,
    .result-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .page-head p,
    .filter-title p {
      max-width: var(--content-measure);
      margin: 0;
      color: var(--color-text-muted);
    }

    .report-note,
    .period-pill {
      display: grid;
      gap: var(--space-1);
      min-width: min(18rem, 100%);
      padding: var(--space-3) var(--space-4);
      border-left: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-md);
      background: var(--color-info-surface);
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .filters,
    .result,
    .school-panel {
      display: grid;
      gap: var(--space-4);
      margin-top: var(--space-5);
      padding: var(--space-5);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .filter-title {
      align-items: center;
    }

    .filter-grid,
    .school {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .field {
      display: grid;
      gap: var(--space-2);
      color: var(--color-brand-950);
      font-weight: var(--weight-semibold);
    }

    .field--wide {
      grid-column: span 2;
    }

    input,
    select,
    textarea {
      width: 100%;
      min-width: 0;
      min-height: var(--control-height);
      padding: 0.7rem var(--space-3);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }

    textarea {
      resize: vertical;
    }

    input[aria-invalid='true'] {
      border-color: var(--color-danger);
      background: var(--color-danger-surface);
    }

    .field-helper,
    .field-error {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      line-height: 1.5;
    }

    .field-helper {
      color: var(--color-text-muted);
    }

    .field-error,
    .error {
      color: var(--color-danger-strong);
    }

    .toolbar {
      align-items: center;
      margin-top: var(--space-4);
    }

    .export-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .row-count,
    .period-pill,
    .numeric,
    .summary strong {
      font-variant-numeric: tabular-nums;
    }

    .notice {
      display: grid;
      gap: var(--space-1);
      margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border-left: var(--border-width-accent) solid var(--color-info);
      border-radius: var(--radius-md);
      background: var(--color-info-surface);
    }

    .notice--error {
      border-left-color: var(--color-danger);
      background: var(--color-danger-surface);
      color: var(--color-danger-strong);
    }

    .table-wrap {
      overflow: auto;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      text-align: left;
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
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface-subtle);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
    }

    th.numeric,
    td.numeric {
      text-align: right;
    }

    .state-cell,
    .state-block {
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
      font-weight: var(--weight-bold);
      white-space: normal;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-3);
      margin-top: var(--space-4);
    }

    .summary h3 {
      grid-column: 1/-1;
      margin: 0;
    }

    .summary p {
      display: grid;
      gap: var(--space-1);
      margin: 0;
      padding: var(--space-3);
      border-left: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-md);
      background: var(--color-neutral-surface);
    }

    .summary span {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    summary {
      min-height: var(--control-height);
      color: var(--color-brand-950);
      font-weight: var(--weight-extrabold);
      cursor: pointer;
    }

    .school {
      margin-top: var(--space-4);
    }

    .school-error {
      grid-column: 1/-1;
      margin-top: 0;
    }

    .school button {
      align-self: end;
    }

    @media (max-width: 64rem) {
      .filter-grid,
      .school,
      .summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 48rem) {
      .page-head,
      .filter-title,
      .toolbar,
      .result-head {
        align-items: stretch;
        flex-direction: column;
      }

      .filter-grid,
      .school,
      .summary {
        grid-template-columns: 1fr;
      }

      .field--wide {
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
        grid-template-columns: minmax(8rem, 38%) minmax(0, 1fr);
        gap: var(--space-3);
        border-top: 0;
        text-align: left;
      }

      td::before {
        content: attr(data-label);
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        font-weight: var(--weight-bold);
      }

      td.numeric {
        text-align: left;
      }

      .state-cell {
        display: block;
      }

      .state-cell::before {
        content: none;
      }
    }
  `,
})
export class ReportsPage {
  @ViewChild('schoolIdentityForm') private schoolIdentityForm?: ElementRef<HTMLFormElement>;

  private readonly api = inject(ReportApiService);
  private readonly master = inject(MasterDataApiService);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly reportOptions = reportOptions;
  protected readonly report = signal<ReportResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly exportingFormat = signal<ExportFormat | null>(null);
  protected readonly error = signal('');
  protected readonly schoolError = signal('');
  protected readonly classes = signal<MasterRow[]>([]);
  protected readonly studyGroups = signal<MasterRow[]>([]);
  protected readonly categories = signal<MasterRow[]>([]);
  protected readonly savingSchool = signal(false);
  protected readonly filters = new FormGroup({
    kind: new FormControl<ReportKind>('popular-books', { nonNullable: true }),
    from: new FormControl(daysAgo(29), { nonNullable: true }),
    to: new FormControl(daysAgo(0), { nonNullable: true }),
    classId: new FormControl('', { nonNullable: true }),
    studyGroupId: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
  });
  protected readonly schoolForm = new FormGroup({
    schoolName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    schoolAddress: new FormControl('', { nonNullable: true }),
    schoolPhone: new FormControl('', { nonNullable: true }),
    schoolEmail: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    schoolLogoPath: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filters.setValue(filtersFromParams(params), { emitEvent: false });
      this.load();
    });
    this.master.list('classes').subscribe({ next: (r) => this.classes.set(r.data) });
    this.master.list('study-groups').subscribe({ next: (r) => this.studyGroups.set(r.data) });
    this.master.list('categories').subscribe({ next: (r) => this.categories.set(r.data) });
    if (this.isMaster())
      this.api.schoolIdentity().subscribe({ next: (r) => this.setSchool(r.data) });
  }

  protected applyFilters() {
    const value = this.filters.getRawValue();
    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: queryParamsFromFilters(value),
      })
      .then((navigated) => {
        if (!navigated) this.load();
      });
  }

  protected clearStatus() {
    this.filters.controls.status.setValue('');
  }

  protected load() {
    const value = this.filters.getRawValue();
    if (value.from > value.to) {
      this.report.set(null);
      this.error.set('Tanggal awal tidak boleh melebihi tanggal akhir.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.report(value.kind, value).subscribe({
      next: (r) => {
        this.report.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Laporan belum dapat dimuat. Periksa filter lalu coba lagi.');
        this.loading.set(false);
      },
    });
  }

  protected download(format: ExportFormat) {
    const value = this.filters.getRawValue();
    this.exportingFormat.set(format);
    this.api.export(value.kind, value, format).subscribe({
      next: (response) => {
        const blob = response.body;
        if (blob) {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName(
            response.headers.get('content-disposition'),
            `${value.kind}.${format}`,
          );
          anchor.click();
          URL.revokeObjectURL(url);
        }
        this.exportingFormat.set(null);
      },
      error: () => {
        this.error.set('File export belum dapat dibuat.');
        this.exportingFormat.set(null);
      },
    });
  }

  protected statusOptions() {
    switch (this.filters.controls.kind.value) {
      case 'fines':
        return options(['unpaid', 'partial', 'paid']);
      case 'damaged-lost':
        return options(['damaged', 'lost']);
      case 'digital-activity':
        return options(['view', 'play', 'download']);
      default:
        return [];
    }
  }

  protected display(value: unknown, column: ReportColumn) {
    if (value === null || value === undefined || value === '') return '-';
    if (this.isStatusColumn(column)) return statusLabel(String(value));
    if (column.type === 'currency') return currencyFormatter.format(Number(value));
    if (column.type === 'number') return numberFormatter.format(Number(value));
    if (column.type === 'date') return formatDateValue(String(value));
    return statusLabel(String(value));
  }

  protected summaryEntries(value: ReportResult) {
    return Object.entries(value.summary);
  }

  protected formatSummary(value: string | number) {
    return typeof value === 'number' ? numberFormatter.format(value) : statusLabel(value);
  }

  protected label(value: string) {
    return value
      .replace(/([A-Z])/g, ' $1')
      .replaceAll('_', ' ')
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  protected activeReportLabel() {
    const kind = this.filters.controls.kind.value;
    return reportOptions.find((option) => option.value === kind)?.label ?? 'Laporan';
  }

  protected periodLabel() {
    const value = this.filters.getRawValue();
    return `${formatShortDate(value.from)} - ${formatShortDate(value.to)}`;
  }

  protected number(value: number) {
    return numberFormatter.format(value);
  }

  protected isNumeric(column: ReportColumn) {
    return column.type === 'number' || column.type === 'currency';
  }

  protected isStatusColumn(column: ReportColumn) {
    const key = column.key.toLowerCase();
    return key.includes('status') || key.includes('condition') || key.includes('action');
  }

  protected isMaster() {
    return this.auth.currentRole() === 'master_admin';
  }

  protected saveSchool() {
    this.schoolForm.markAllAsTouched();
    this.schoolError.set('');
    if (this.schoolForm.invalid) {
      this.schoolError.set('Periksa nama sekolah dan format email.');
      this.focusFirstSchoolError();
      return;
    }
    this.savingSchool.set(true);
    const value = this.schoolForm.getRawValue();
    const input: SchoolIdentity = {
      schoolName: value.schoolName,
      schoolAddress: value.schoolAddress || null,
      schoolPhone: value.schoolPhone || null,
      schoolEmail: value.schoolEmail || null,
      schoolLogoPath: value.schoolLogoPath || null,
    };
    this.api.updateSchoolIdentity(input).subscribe({
      next: (r) => {
        this.setSchool(r.data);
        this.savingSchool.set(false);
      },
      error: () => {
        this.schoolError.set('Identitas sekolah gagal disimpan.');
        this.savingSchool.set(false);
        this.focusFirstSchoolError();
      },
    });
  }

  protected showSchoolError(controlName: SchoolFormKey) {
    const control = this.schoolForm.controls[controlName];
    return control.invalid && control.touched;
  }

  protected isSchoolInvalid(controlName: SchoolFormKey) {
    return this.showSchoolError(controlName) ? 'true' : 'false';
  }

  private setSchool(value: SchoolIdentity) {
    this.schoolForm.setValue({
      schoolName: value.schoolName,
      schoolAddress: value.schoolAddress ?? '',
      schoolPhone: value.schoolPhone ?? '',
      schoolEmail: value.schoolEmail ?? '',
      schoolLogoPath: value.schoolLogoPath ?? '',
    });
  }

  private focusFirstSchoolError() {
    setTimeout(() => {
      const form = this.schoolIdentityForm?.nativeElement;
      const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], .school-error');
      target?.focus();
    });
  }
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function filtersFromParams(params: ParamMap): ReportFilterValue {
  const kind = params.get('kind');
  return {
    kind: isReportKind(kind) ? kind : 'popular-books',
    from: params.get('from') ?? daysAgo(29),
    to: params.get('to') ?? daysAgo(0),
    classId: params.get('classId') ?? '',
    studyGroupId: params.get('studyGroupId') ?? '',
    categoryId: params.get('categoryId') ?? '',
    status: params.get('status') ?? '',
    search: params.get('search') ?? '',
  };
}

function queryParamsFromFilters(value: ReportFilterValue) {
  return {
    kind: value.kind,
    from: value.from,
    to: value.to,
    classId: value.classId || null,
    studyGroupId: value.studyGroupId || null,
    categoryId: value.categoryId || null,
    status: value.status || null,
    search: value.search || null,
  };
}

function isReportKind(value: string | null): value is ReportKind {
  return reportOptions.some((option) => option.value === value);
}

function statusLabel(value: string) {
  return statusLabels[value] ?? value;
}

function options(values: string[]) {
  return values.map((value) => ({ value, label: statusLabel(value) }));
}

function formatDateValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return value.includes('T') ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function fileName(header: string | null, fallback: string) {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}
