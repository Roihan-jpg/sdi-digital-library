import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

@Component({
  selector: 'sdi-reports-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">Monitoring</p>
      <h1>Laporan perpustakaan</h1>
      <p>
        Semua angka dihitung dari transaksi. Gunakan filter lalu ekspor hasil yang sedang tampil.
      </p>
      <form [formGroup]="filters" (ngSubmit)="load()" class="filters">
        <label
          >Jenis laporan<select formControlName="kind">
            @for (option of reportOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select></label
        ><label>Dari<input type="date" formControlName="from" /></label
        ><label>Sampai<input type="date" formControlName="to" /></label
        ><label
          >Kelas<select formControlName="classId">
            <option value="">Semua</option>
            @for (item of classes(); track item.id) {
              <option [value]="item.id">{{ item.name }}</option>
            }
          </select></label
        ><label
          >Rombel<select formControlName="studyGroupId">
            <option value="">Semua</option>
            @for (item of studyGroups(); track item.id) {
              <option [value]="item.id">{{ item.name }}</option>
            }
          </select></label
        ><label
          >Kategori<select formControlName="categoryId">
            <option value="">Semua</option>
            @for (item of categories(); track item.id) {
              <option [value]="item.id">{{ item.name }}</option>
            }
          </select></label
        ><label
          >Status/aktivitas<select formControlName="status">
            <option value="">Semua</option>
            @for (option of statusOptions(); track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select></label
        ><label class="search"
          >Pencarian<input formControlName="search" placeholder="Nama, judul, kode…" /></label
        ><button class="button" type="submit" [disabled]="loading()">
          {{ loading() ? 'Memuat…' : 'Tampilkan' }}
        </button>
      </form>
      <div class="toolbar">
        <div>
          <button
            class="button button--secondary"
            type="button"
            [disabled]="!report() || exporting()"
            (click)="download('pdf')"
          >
            Export PDF</button
          ><button
            class="button button--secondary"
            type="button"
            [disabled]="!report() || exporting()"
            (click)="download('xlsx')"
          >
            Export Excel
          </button>
        </div>
        @if (report()) {
          <span>{{ report()!.rows.length }} baris</span>
        }
      </div>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (report(); as current) {
        <section class="result">
          <h2>{{ current.title }}</h2>
          @if (current.rows.length === 0) {
            <p>Belum ada data pada periode dan filter ini.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    @for (column of current.columns; track column.key) {
                      <th>{{ column.label }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of current.rows; track $index) {
                    <tr>
                      @for (column of current.columns; track column.key) {
                        <td>{{ display(row[column.key], column) }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div class="summary">
            <h3>Ringkasan</h3>
            @for (item of summaryEntries(current); track item[0]) {
              <p>
                <strong>{{ label(item[0]) }}:</strong> {{ item[1] }}
              </p>
            }
          </div>
        </section>
      }
      @if (isMaster()) {
        <details>
          <summary>Identitas sekolah untuk export</summary>
          <form [formGroup]="schoolForm" (ngSubmit)="saveSchool()" class="school">
            <label>Nama sekolah<input formControlName="schoolName" /></label
            ><label>Alamat<textarea rows="3" formControlName="schoolAddress"></textarea></label
            ><label>Telepon<input formControlName="schoolPhone" /></label
            ><label>Email<input type="email" formControlName="schoolEmail" /></label
            ><label
              >Path logo Storage<input
                formControlName="schoolLogoPath"
                placeholder="Opsional" /></label
            ><button class="button" type="submit" [disabled]="savingSchool()">
              {{ savingSchool() ? 'Menyimpan…' : 'Simpan identitas' }}
            </button>
          </form>
        </details>
      }
    </section>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: 2fr repeat(3, 1fr);
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.75rem;
      background: #fff;
    }
    .filters label,
    .school label {
      display: grid;
      gap: 0.3rem;
      font-weight: 700;
    }
    .filters .search {
      grid-column: span 2;
    }
    input,
    select,
    textarea {
      min-width: 0;
      padding: 0.65rem;
      border: 1px solid #9dafa4;
      border-radius: 0.45rem;
      background: #fff;
    }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 1rem 0;
    }
    .toolbar div {
      display: flex;
      gap: 0.5rem;
    }
    .result,
    details {
      padding: 1rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.75rem;
      background: #fff;
    }
    .table-wrap {
      overflow: auto;
      max-height: 34rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    th,
    td {
      padding: 0.65rem;
      border-bottom: 1px solid #d5dfd9;
      text-align: left;
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      background: #17452f;
      color: #fff;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 1rem;
    }
    .summary h3 {
      width: 100%;
      margin-bottom: 0;
    }
    .summary p {
      margin: 0;
    }
    .error {
      color: #9b1c1c;
    }
    details {
      margin-top: 1rem;
    }
    summary {
      font-weight: 800;
      cursor: pointer;
    }
    .school {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .school label:nth-child(2) {
      grid-column: span 2;
    }
    @media (max-width: 55rem) {
      .filters {
        grid-template-columns: 1fr 1fr;
      }
      .filters .search {
        grid-column: auto;
      }
    }
    @media (max-width: 34rem) {
      .filters,
      .school {
        grid-template-columns: 1fr;
      }
      .school label:nth-child(2) {
        grid-column: auto;
      }
      .toolbar {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  `,
})
export class ReportsPage {
  private readonly api = inject(ReportApiService);
  private readonly master = inject(MasterDataApiService);
  private readonly auth = inject(AuthStore);
  protected readonly reportOptions = reportOptions;
  protected readonly report = signal<ReportResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly error = signal('');
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
    this.load();
    this.master.list('classes').subscribe({ next: (r) => this.classes.set(r.data) });
    this.master.list('study-groups').subscribe({ next: (r) => this.studyGroups.set(r.data) });
    this.master.list('categories').subscribe({ next: (r) => this.categories.set(r.data) });
    if (this.isMaster())
      this.api.schoolIdentity().subscribe({ next: (r) => this.setSchool(r.data) });
  }
  protected load() {
    const value = this.filters.getRawValue();
    if (value.from > value.to) {
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
  protected download(format: 'pdf' | 'xlsx') {
    const value = this.filters.getRawValue();
    this.exporting.set(true);
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
        this.exporting.set(false);
      },
      error: () => {
        this.error.set('File export belum dapat dibuat.');
        this.exporting.set(false);
      },
    });
  }
  protected statusOptions() {
    switch (this.filters.controls.kind.value) {
      case 'fines':
        return ['unpaid', 'partial', 'paid'];
      case 'damaged-lost':
        return ['damaged', 'lost'];
      case 'digital-activity':
        return ['view', 'play', 'download'];
      default:
        return [];
    }
  }
  protected display(value: unknown, column: ReportColumn) {
    if (value === null || value === undefined || value === '') return '—';
    if (column.type === 'currency')
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(Number(value));
    if (column.type === 'date')
      return new Date(String(value)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    return String(value);
  }
  protected summaryEntries(value: ReportResult) {
    return Object.entries(value.summary);
  }
  protected label(value: string) {
    return value
      .replace(/([A-Z])/g, ' $1')
      .replaceAll('_', ' ')
      .replace(/^./, (letter) => letter.toUpperCase());
  }
  protected isMaster() {
    return this.auth.currentRole() === 'master_admin';
  }
  protected saveSchool() {
    if (this.schoolForm.invalid) return;
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
        this.error.set('Identitas sekolah gagal disimpan.');
        this.savingSchool.set(false);
      },
    });
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
}
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
function fileName(header: string | null, fallback: string) {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}
