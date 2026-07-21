import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ReportApiService } from '../../../reports/data-access/report-api.service';
import type { DashboardData } from '../../../reports/models/report.model';

@Component({
  selector: 'sdi-dashboard-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page">
      <p class="eyebrow">{{ roleLabel() }}</p>
      <h1>{{ heading }}</h1>
      <p>Selamat datang, {{ authStore.displayName() }}.</p>
      <p>{{ roleDescription() }}</p>
      <form [formGroup]="period" (ngSubmit)="load()" class="period">
        <label>Dari <input type="date" formControlName="from" /></label>
        <label>Sampai <input type="date" formControlName="to" /></label>
        <button class="button" type="submit">Terapkan periode</button>
      </form>
      @if (loading()) {
        <p role="status">Memuat dashboard…</p>
      }
      @if (error()) {
        <div class="error" role="alert">
          <p>{{ error() }}</p>
          <button class="button button--secondary" type="button" (click)="load()">Coba lagi</button>
        </div>
      }
      @if (data(); as dashboard) {
        <div class="kpis" aria-label="Indikator perpustakaan">
          @for (kpi of kpiCards(dashboard); track kpi.label) {
            <article>
              <small>{{ kpi.label }}</small
              ><strong>{{ kpi.currency ? rupiah(kpi.value) : kpi.value }}</strong>
            </article>
          }
        </div>
        <div class="charts">
          <section>
            <h2>Peminjaman</h2>
            @if (dashboard.charts.loans.length === 0) {
              <p>Belum ada peminjaman pada periode ini.</p>
            }
            @for (point of dashboard.charts.loans; track point.activity_date) {
              <div class="bar-row">
                <time>{{ point.activity_date.slice(5) }}</time>
                <div class="bar">
                  <span
                    [style.width.%]="barWidth(point.items_borrowed, maxLoans(dashboard))"
                  ></span>
                </div>
                <strong>{{ point.items_borrowed }}</strong>
              </div>
            }
          </section>
          <section>
            <h2>Kunjungan</h2>
            @if (dashboard.charts.visits.length === 0) {
              <p>Belum ada kunjungan pada periode ini.</p>
            }
            @for (point of dashboard.charts.visits; track point.visit_date) {
              <div class="bar-row">
                <time>{{ point.visit_date.slice(5) }}</time>
                <div class="bar visits">
                  <span [style.width.%]="barWidth(visitTotal(point), maxVisits(dashboard))"></span>
                </div>
                <strong>{{ visitTotal(point) }}</strong>
              </div>
            }
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .period {
      display: flex;
      align-items: end;
      gap: 0.75rem;
      margin: 1.5rem 0;
    }
    .period label {
      display: grid;
      gap: 0.3rem;
      font-weight: 700;
    }
    .period input {
      padding: 0.65rem;
      border: 1px solid #9dafa4;
      border-radius: 0.45rem;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.75rem;
    }
    .kpis article {
      display: grid;
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
      background: #fff;
    }
    .kpis small {
      color: #506158;
      font-weight: 700;
    }
    .kpis strong {
      font-size: 1.55rem;
      color: #17452f;
    }
    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .charts section {
      padding: 1rem;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
      background: #fff;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 3rem 1fr 2.5rem;
      gap: 0.5rem;
      align-items: center;
      margin: 0.45rem 0;
      font-size: 0.78rem;
    }
    .bar {
      height: 0.7rem;
      border-radius: 1rem;
      background: #e5ede8;
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      min-width: 2px;
      background: #176b43;
    }
    .bar.visits span {
      background: #a76b12;
    }
    .error {
      color: #9b1c1c;
    }
    @media (max-width: 48rem) {
      .period {
        align-items: stretch;
        flex-direction: column;
      }
      .charts {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DashboardPage {
  protected readonly authStore = inject(AuthStore);
  private readonly api = inject(ReportApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly heading =
    (this.route.snapshot.data['heading'] as string | undefined) ?? 'Dashboard';
  protected readonly period = new FormGroup({
    from: new FormControl(daysAgo(29), { nonNullable: true }),
    to: new FormControl(daysAgo(0), { nonNullable: true }),
  });
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    this.load();
  }
  protected load() {
    const { from, to } = this.period.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.api.dashboard(from, to).subscribe({
      next: (response) => {
        this.data.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Dashboard belum dapat dimuat.');
        this.loading.set(false);
      },
    });
  }
  protected kpiCards(value: DashboardData) {
    const k = value.kpis;
    return [
      { label: 'Judul', value: k.total_titles },
      { label: 'Eksemplar', value: k.total_copies },
      { label: 'Tersedia', value: k.available_copies },
      { label: 'Dipinjam', value: k.loaned_copies },
      { label: 'Reservasi pending', value: k.pending_reservations },
      { label: 'Terlambat', value: k.overdue_items },
      { label: 'Rusak', value: k.damaged_copies },
      { label: 'Hilang', value: k.lost_copies },
      { label: 'Kunjungan hari ini', value: k.visits_today },
      { label: 'Denda belum lunas', value: k.outstanding_fines, currency: true },
    ];
  }
  protected maxLoans(value: DashboardData) {
    return Math.max(1, ...value.charts.loans.map((point) => point.items_borrowed));
  }
  protected maxVisits(value: DashboardData) {
    return Math.max(1, ...value.charts.visits.map((point) => this.visitTotal(point)));
  }
  protected visitTotal(point: DashboardData['charts']['visits'][number]) {
    return Number(point.individual_visits) + Number(point.group_participants);
  }
  protected barWidth(value: number, max: number) {
    return Math.max(1, Math.round((Number(value) / max) * 100));
  }
  protected rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  protected roleDescription() {
    switch (this.authStore.currentRole()) {
      case 'master_admin':
        return 'Pantau kesehatan data dan konfigurasi sistem tanpa angka manual.';
      case 'head_librarian':
        return 'Pantau capaian operasional dan gunakan menu laporan untuk kebutuhan evaluasi.';
      case 'librarian':
        return 'Prioritaskan reservasi, keterlambatan, dan kondisi koleksi yang memerlukan tindakan.';
      default:
        return '';
    }
  }

  protected roleLabel(): string {
    switch (this.authStore.currentRole()) {
      case 'master_admin':
        return 'Master Admin';
      case 'head_librarian':
        return 'Kepala Perpustakaan';
      case 'librarian':
        return 'Petugas Perpustakaan';
      case 'member':
        return 'Anggota Perpustakaan';
      case 'guest':
        return 'Tamu';
      default:
        return 'Dashboard';
    }
  }
}
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
