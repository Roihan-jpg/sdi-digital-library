import { Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../../core/auth/auth.store';
import type { AppRole } from '../../../../core/auth/auth.models';
import { ReportApiService } from '../../../reports/data-access/report-api.service';
import type { DashboardData } from '../../../reports/models/report.model';

interface DateRange {
  from: string;
  to: string;
}

interface KpiCard {
  label: string;
  value: number;
  context: string;
  description: string;
  currency?: true;
  tone?: 'attention' | 'success' | 'warning';
}

@Component({
  selector: 'sdi-dashboard-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page page--wide dashboard-overview">
      <header class="overview-header">
        <div>
          <p class="eyebrow">{{ roleLabel() }}</p>
          <h1>{{ heading }}</h1>
          <p class="overview-header__lead">{{ roleDescription() }}</p>
        </div>
        <div class="operator-strip" aria-label="Pengguna aktif">
          <span>Masuk sebagai</span>
          <strong>{{ authStore.displayName() }}</strong>
        </div>
      </header>

      @if (isResolvingRole()) {
        <section class="loading-panel card" role="status" aria-label="Menyiapkan dashboard">
          <span class="loading-state">Menyiapkan ringkasan sesuai akses pengguna...</span>
        </section>
      } @else if (!canReadDashboard()) {
        <section class="content-state" aria-live="polite">
          <span class="state-mark" aria-hidden="true"></span>
          <h2>Portal tamu tersedia</h2>
          <p class="content-state__description">
            Gunakan katalog dan koleksi digital untuk melihat bahan bacaan yang dibuka untuk
            pengunjung.
          </p>
          <div class="guest-actions" aria-label="Aksi portal tamu">
            <a class="button" href="/katalog">Buka katalog</a>
            <a class="button button--secondary" href="/koleksi-digital">Koleksi digital</a>
          </div>
        </section>
      } @else {
        <form
          class="period-card card card--indexed"
          [formGroup]="period"
          (ngSubmit)="applyPeriod()"
          novalidate
        >
          <div class="period-copy">
            <h2>Periode ringkasan</h2>
            <p id="period-help">
              Pilih rentang tanggal untuk grafik peminjaman dan kunjungan. KPI stok tetap
              menampilkan kondisi terbaru.
            </p>
          </div>
          <fieldset [disabled]="loading()">
            <legend class="sr-only">Filter periode dashboard</legend>
            <label class="field" for="dashboard-from">
              <span>Dari</span>
              <input
                id="dashboard-from"
                type="date"
                name="from"
                formControlName="from"
                required
                aria-describedby="period-help period-error"
                [attr.aria-invalid]="periodError() ? 'true' : null"
              />
            </label>
            <label class="field" for="dashboard-to">
              <span>Sampai</span>
              <input
                id="dashboard-to"
                type="date"
                name="to"
                formControlName="to"
                required
                aria-describedby="period-help period-error"
                [attr.aria-invalid]="periodError() ? 'true' : null"
              />
            </label>
            <button
              class="button"
              type="submit"
              [disabled]="loading() || period.invalid"
              [attr.aria-busy]="loading()"
            >
              {{ loading() ? 'Memuat periode' : 'Terapkan periode' }}
            </button>
          </fieldset>
          @if (periodError()) {
            <p id="period-error" class="validation-message" role="alert">{{ periodError() }}</p>
          } @else {
            <p id="period-error" class="period-status" aria-live="polite">{{ periodNotice() }}</p>
          }
        </form>

        @if (loading() && !data()) {
          <section class="loading-panel card" role="status" aria-label="Memuat dashboard">
            <span class="loading-state">Memuat ringkasan perpustakaan...</span>
            <div class="skeleton-grid" aria-hidden="true">
              @for (item of skeletonCards; track item) {
                <span class="skeleton"></span>
              }
            </div>
          </section>
        }

        @if (error()) {
          <section class="alert alert--error dashboard-error" role="alert">
            <div>
              <h2>Dashboard belum dapat dimuat</h2>
              <p>{{ error() }}</p>
              <button class="button button--secondary" type="button" (click)="retry()">
                Coba lagi
              </button>
            </div>
          </section>
        }

        @if (data(); as dashboard) {
          @if (loading()) {
            <p class="refresh-note loading-state" role="status">Memperbarui data...</p>
          }

          <section class="section-heading" aria-labelledby="kpi-heading">
            <div>
              <p class="eyebrow">Ringkasan angka</p>
              <h2 id="kpi-heading">Kondisi perpustakaan</h2>
            </div>
            <p>{{ periodLabel(dashboard.period) }}</p>
          </section>

          <div class="kpis" aria-label="Indikator utama perpustakaan">
            @for (kpi of kpiCards(dashboard); track kpi.label) {
              <article
                class="kpi-card"
                [class.kpi-card--success]="kpi.tone === 'success'"
                [class.kpi-card--warning]="kpi.tone === 'warning'"
                [class.kpi-card--attention]="kpi.tone === 'attention'"
              >
                <div>
                  <small>{{ kpi.label }}</small>
                  <strong>{{ kpi.currency ? rupiah(kpi.value) : number(kpi.value) }}</strong>
                </div>
                <p>{{ kpi.context }}</p>
                <span>{{ kpi.description }}</span>
              </article>
            }
          </div>

          @if (hasNoActivity(dashboard)) {
            <section class="content-state no-result" aria-live="polite">
              <span class="state-mark" aria-hidden="true"></span>
              <h2>Belum ada transaksi pada periode ini</h2>
              <p class="content-state__description">
                Ubah rentang tanggal atau mulai dari menu sirkulasi untuk mencatat peminjaman dan
                kunjungan.
              </p>
            </section>
          }

          <div class="charts" aria-label="Grafik aktivitas harian">
            <section class="chart-card card" aria-labelledby="loan-chart-title">
              <header>
                <div>
                  <p class="eyebrow">Grafik harian</p>
                  <h2 id="loan-chart-title">Peminjaman</h2>
                </div>
                <p>{{ loanSummary(dashboard) }}</p>
              </header>

              @if (dashboard.charts.loans.length === 0) {
                <div class="chart-empty">
                  <strong>Tidak ada peminjaman</strong>
                  <span>Belum ada eksemplar yang dipinjam pada periode terpilih.</span>
                </div>
              } @else {
                <div
                  class="chart-plot"
                  role="img"
                  [attr.aria-label]="loanChartDescription(dashboard)"
                >
                  <p class="axis-label">Sumbu horizontal: tanggal. Nilai: eksemplar dipinjam.</p>
                  @for (point of dashboard.charts.loans; track point.activity_date) {
                    <div class="bar-row">
                      <time [attr.datetime]="point.activity_date">{{
                        shortDate(point.activity_date)
                      }}</time>
                      <div class="bar" aria-hidden="true">
                        <span [style.width.%]="barWidth(point.items_borrowed, maxLoans(dashboard))">
                        </span>
                      </div>
                      <strong>{{ number(point.items_borrowed) }}</strong>
                    </div>
                  }
                </div>
                <details class="chart-details">
                  <summary>Rincian data peminjaman</summary>
                  <div class="table-wrap chart-table">
                    <table>
                      <caption class="sr-only">
                        Data peminjaman harian pada periode terpilih
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Tanggal</th>
                          <th scope="col">Transaksi</th>
                          <th scope="col">Eksemplar</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (point of dashboard.charts.loans; track point.activity_date) {
                          <tr>
                            <td>{{ longDate(point.activity_date) }}</td>
                            <td>{{ number(point.loan_transactions) }}</td>
                            <td>{{ number(point.items_borrowed) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </details>
              }
            </section>

            <section class="chart-card card" aria-labelledby="visit-chart-title">
              <header>
                <div>
                  <p class="eyebrow">Grafik harian</p>
                  <h2 id="visit-chart-title">Kunjungan</h2>
                </div>
                <p>{{ visitSummary(dashboard) }}</p>
              </header>

              @if (dashboard.charts.visits.length === 0) {
                <div class="chart-empty">
                  <strong>Tidak ada kunjungan</strong>
                  <span>Belum ada kunjungan individu atau rombongan pada periode terpilih.</span>
                </div>
              } @else {
                <div
                  class="chart-plot"
                  role="img"
                  [attr.aria-label]="visitChartDescription(dashboard)"
                >
                  <p class="axis-label">
                    Sumbu horizontal: tanggal. Nilai: total pengunjung individu dan rombongan.
                  </p>
                  @for (point of dashboard.charts.visits; track point.visit_date) {
                    <div class="bar-row bar-row--visits">
                      <time [attr.datetime]="point.visit_date">{{
                        shortDate(point.visit_date)
                      }}</time>
                      <div class="bar bar--visits" aria-hidden="true">
                        <span [style.width.%]="barWidth(visitTotal(point), maxVisits(dashboard))">
                        </span>
                      </div>
                      <strong>{{ number(visitTotal(point)) }}</strong>
                      <span class="bar-note">
                        {{ number(point.individual_visits) }} individu,
                        {{ number(point.group_participants) }} rombongan
                      </span>
                    </div>
                  }
                </div>
                <details class="chart-details">
                  <summary>Rincian data kunjungan</summary>
                  <div class="table-wrap chart-table">
                    <table>
                      <caption class="sr-only">
                        Data kunjungan harian pada periode terpilih
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Tanggal</th>
                          <th scope="col">Individu</th>
                          <th scope="col">Rombongan</th>
                          <th scope="col">Peserta rombongan</th>
                          <th scope="col">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (point of dashboard.charts.visits; track point.visit_date) {
                          <tr>
                            <td>{{ longDate(point.visit_date) }}</td>
                            <td>{{ number(point.individual_visits) }}</td>
                            <td>{{ number(point.group_visits) }}</td>
                            <td>{{ number(point.group_participants) }}</td>
                            <td>{{ number(visitTotal(point)) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </details>
              }
            </section>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .dashboard-overview {
      display: grid;
      gap: var(--space-6);
    }

    .overview-header,
    .section-heading,
    .chart-card header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .overview-header {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      padding: clamp(1.5rem, 3vw, 2.25rem);
      border: 1px solid rgb(255 255 255 / 18%);
      border-radius: var(--radius-xl);
      background:
        radial-gradient(circle at 88% 12%, rgb(234 220 202 / 58%), transparent 17rem),
        radial-gradient(circle at 70% 120%, rgb(221 237 234 / 32%), transparent 19rem),
        linear-gradient(135deg, #477f79 0%, #69afa7 64%, #79bbb4 100%);
      box-shadow: var(--shadow-md);
      color: #fff;
    }

    .overview-header::after {
      position: absolute;
      right: -4rem;
      bottom: -7rem;
      z-index: -1;
      width: 17rem;
      height: 17rem;
      border: 1px solid rgb(255 255 255 / 16%);
      border-radius: 50%;
      box-shadow: 0 0 0 2.5rem rgb(255 255 255 / 4%);
      content: '';
    }

    :host-context(.dashboard-theme--dark) .overview-header {
      background:
        radial-gradient(circle at 88% 12%, rgb(155 208 202 / 20%), transparent 17rem),
        linear-gradient(135deg, #24443f 0%, #315e57 58%, #3d746d 100%);
    }

    .overview-header .eyebrow,
    .overview-header h1,
    .overview-header__lead {
      color: #fff;
    }

    .overview-header h1 {
      font-size: clamp(1.5rem, 3vw, 2.15rem);
    }

    .overview-header h1,
    .overview-header p,
    .section-heading h2,
    .section-heading p,
    .chart-card h2,
    .chart-card p {
      margin: 0;
    }

    .overview-header__lead,
    .section-heading > p,
    .chart-card header > p,
    .period-copy p,
    .kpi-card p,
    .kpi-card span,
    .period-status,
    .bar-note {
      color: var(--color-text-muted);
    }

    .overview-header__lead {
      max-width: 62ch;
      margin-top: var(--space-2);
      color: #eef9f6;
    }

    .operator-strip {
      display: grid;
      gap: var(--space-1);
      min-width: min(100%, 15rem);
      padding: var(--space-3) var(--space-4);
      border: var(--border-width) solid rgb(255 255 255 / 20%);
      border-radius: var(--radius-lg);
      background: rgb(255 255 255 / 10%);
      box-shadow: inset 0 1px rgb(255 255 255 / 8%);
      backdrop-filter: blur(8px);
      font-size: var(--text-sm);
    }

    .operator-strip span {
      color: #d8ece9;
      font-weight: var(--weight-semibold);
    }

    .operator-strip strong {
      color: #fff;
      font-weight: var(--weight-bold);
    }

    .period-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-4);
      align-items: end;
    }

    .period-copy h2 {
      margin: 0 0 var(--space-1);
      font-size: var(--text-xl);
    }

    .period-copy p {
      max-width: 62ch;
      margin: 0;
      font-size: var(--text-sm);
    }

    fieldset {
      display: grid;
      grid-template-columns: repeat(2, minmax(10rem, 1fr)) auto;
      gap: var(--space-3);
      align-items: end;
      min-width: 0;
      padding: 0;
      border: 0;
      margin: 0;
    }

    fieldset:disabled {
      opacity: 0.78;
    }

    .period-status,
    .validation-message {
      grid-column: 1 / -1;
    }

    .period-status {
      min-height: 1.35rem;
      margin: 0;
      font-size: var(--text-sm);
    }

    .loading-panel {
      display: grid;
      gap: var(--space-5);
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
      gap: var(--space-3);
    }

    .skeleton-grid .skeleton {
      min-height: 7rem;
    }

    .dashboard-error h2,
    .dashboard-error p {
      margin: 0;
    }

    .dashboard-error div {
      display: grid;
      gap: var(--space-3);
      justify-items: start;
    }

    .refresh-note {
      margin: 0;
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
      gap: var(--space-3);
    }

    .kpi-card {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-top: var(--border-width-accent) solid var(--color-brand-700);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .kpi-card--success {
      border-top-color: var(--color-success);
    }

    .kpi-card--warning {
      border-top-color: var(--color-warning);
    }

    .kpi-card--attention {
      border-top-color: var(--color-error);
    }

    .kpi-card div {
      display: grid;
      gap: var(--space-1);
    }

    .kpi-card small {
      color: var(--color-brand-950);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
    }

    .kpi-card strong {
      color: var(--color-brand-950);
      font-family: var(--font-family-data);
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-variant-numeric: tabular-nums;
      line-height: var(--leading-tight);
      overflow-wrap: anywhere;
    }

    .kpi-card p,
    .kpi-card span {
      margin: 0;
      font-size: var(--text-sm);
    }

    .kpi-card span {
      font-weight: var(--weight-semibold);
    }

    .no-result {
      min-height: 0;
    }

    .state-mark {
      width: var(--space-10);
      height: var(--border-width-accent);
      border-radius: var(--radius-pill);
      background: var(--color-brand-700);
    }

    .guest-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      justify-content: center;
    }

    .charts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .chart-card {
      display: grid;
      align-content: start;
      gap: var(--space-4);
    }

    .chart-card h2 {
      font-size: var(--text-xl);
    }

    .chart-card header > p {
      max-width: 22rem;
      font-size: var(--text-sm);
      text-align: right;
    }

    .chart-empty {
      display: grid;
      gap: var(--space-1);
      min-height: 12rem;
      align-content: center;
      padding: var(--space-5);
      border: var(--border-width) dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      background: var(--color-info-surface);
      text-align: center;
    }

    .chart-empty strong {
      color: var(--color-brand-950);
    }

    .chart-empty span {
      color: var(--color-text-muted);
    }

    .chart-plot {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .axis-label {
      margin: 0 0 var(--space-1);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .bar-row {
      display: grid;
      grid-template-columns: 4.5rem minmax(0, 1fr) minmax(2.5rem, auto);
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
      font-size: var(--text-sm);
    }

    .bar-row time,
    .bar-row strong {
      font-family: var(--font-family-data);
      font-variant-numeric: tabular-nums;
    }

    .bar-row time {
      color: var(--color-text-muted);
    }

    .bar-row strong {
      color: var(--color-brand-950);
      text-align: right;
    }

    .bar {
      min-width: 0;
      height: 0.875rem;
      overflow: hidden;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-surface-subtle);
    }

    .bar span {
      display: block;
      height: 100%;
      min-width: 2px;
      border-radius: inherit;
      background: var(--color-brand-700);
    }

    .bar--visits span {
      background:
        repeating-linear-gradient(
          135deg,
          rgb(120 86 44 / 22%) 0,
          rgb(120 86 44 / 22%) 0.35rem,
          transparent 0.35rem,
          transparent 0.7rem
        ),
        var(--color-warning);
    }

    .bar-note {
      grid-column: 2 / -1;
      margin-top: calc(-1 * var(--space-1));
      font-size: var(--text-sm);
    }

    .chart-details {
      border-top: var(--border-width) solid var(--color-border);
      padding-top: var(--space-3);
    }

    .chart-details summary {
      min-height: var(--control-height);
      color: var(--color-brand-800);
      cursor: pointer;
      font-weight: var(--weight-bold);
    }

    .chart-table {
      margin-top: var(--space-2);
      border-radius: var(--radius-md);
    }

    .chart-table table {
      min-width: 32rem;
    }

    .chart-table :where(th, td) {
      font-size: var(--text-sm);
    }

    .chart-table :where(td:nth-child(n + 2), th:nth-child(n + 2)) {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 64rem) {
      .period-card {
        grid-template-columns: 1fr;
      }

      fieldset {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      fieldset .button {
        grid-column: 1 / -1;
      }

      .charts {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 48rem) {
      .overview-header,
      .section-heading,
      .chart-card header {
        flex-direction: column;
      }

      .chart-card header > p {
        max-width: none;
        text-align: left;
      }
    }

    @media (max-width: 36rem) {
      .dashboard-overview {
        gap: var(--space-5);
      }

      fieldset {
        grid-template-columns: 1fr;
      }

      .kpi-card {
        padding: var(--space-4);
      }

      .bar-row {
        grid-template-columns: 4rem minmax(0, 1fr) minmax(2rem, auto);
      }

      .guest-actions {
        align-items: stretch;
        flex-direction: column;
        width: 100%;
      }
    }
  `,
})
export class DashboardPage {
  protected readonly authStore = inject(AuthStore);
  private readonly api = inject(ReportApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly heading =
    (this.route.snapshot.data['heading'] as string | undefined) ?? 'Dashboard';
  protected readonly period = new FormGroup({
    from: new FormControl(daysAgo(29), { nonNullable: true, validators: [Validators.required] }),
    to: new FormControl(daysAgo(0), { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly periodError = signal('');
  protected readonly periodNotice = signal('');
  protected readonly skeletonCards = Array.from({ length: 6 }, (_, index) => index);
  private activeRequest = 0;
  private inFlightKey = '';
  private loadedKey = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const range = rangeFromParams(params) ?? this.period.getRawValue();
      this.period.setValue(range, { emitEvent: false });
      this.periodError.set('');
      this.loadWhenAllowed(range);
    });

    effect(() => {
      this.authStore.currentRole();
      this.loadWhenAllowed(this.period.getRawValue());
    });
  }

  protected isResolvingRole(): boolean {
    return this.authStore.currentRole() === null;
  }

  protected canReadDashboard(): boolean {
    const role = this.authStore.currentRole();
    return role === 'master_admin' || role === 'head_librarian' || role === 'librarian';
  }

  private loadWhenAllowed(range: DateRange): void {
    const role = this.authStore.currentRole();
    if (role === 'master_admin' || role === 'head_librarian' || role === 'librarian') {
      this.loadRange(range);
      return;
    }
    if (role === 'guest') {
      this.loading.set(false);
      this.error.set('');
      this.data.set(null);
    }
  }

  protected applyPeriod(): void {
    const range = this.validRangeFromForm();
    if (!range) return;
    const currentRouteRange = rangeFromParams(this.route.snapshot.queryParamMap);
    const nextKey = rangeKey(range);

    if (currentRouteRange && rangeKey(currentRouteRange) === nextKey) {
      this.loadRange(range);
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: range,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected retry(): void {
    const range = this.validRangeFromForm();
    if (range) this.loadRange(range, true);
  }

  private validRangeFromForm(): DateRange | null {
    const range = this.period.getRawValue();
    if (!isIsoDate(range.from) || !isIsoDate(range.to)) {
      this.periodError.set('Isi tanggal awal dan akhir dengan format yang valid.');
      return null;
    }
    if (range.from > range.to) {
      this.periodError.set('Tanggal awal tidak boleh melebihi tanggal akhir.');
      return null;
    }
    this.periodError.set('');
    return range;
  }

  private loadRange(range: DateRange, force = false): void {
    const key = rangeKey(range);
    if (this.loading() && this.inFlightKey === key) return;
    if (!force && this.loadedKey === key && this.data() && !this.error()) {
      this.periodNotice.set('Periode ini sudah tampil.');
      return;
    }

    const requestId = ++this.activeRequest;
    this.inFlightKey = key;
    this.loading.set(true);
    this.error.set('');
    this.periodNotice.set('');
    this.api.dashboard(range.from, range.to).subscribe({
      next: (response) => {
        if (requestId !== this.activeRequest) return;
        this.data.set(response.data);
        this.loadedKey = key;
        this.loading.set(false);
        this.periodNotice.set(`Menampilkan data ${this.periodLabel(response.data.period)}.`);
      },
      error: () => {
        if (requestId !== this.activeRequest) return;
        this.error.set('Periksa koneksi atau coba ulang beberapa saat lagi.');
        this.loading.set(false);
      },
    });
  }

  protected kpiCards(value: DashboardData): KpiCard[] {
    const k = value.kpis;
    const cards: Record<string, KpiCard> = {
      total_titles: {
        label: 'Judul',
        value: k.total_titles,
        context: 'Saat ini',
        description: 'Judul buku aktif di katalog.',
      },
      total_copies: {
        label: 'Eksemplar',
        value: k.total_copies,
        context: 'Saat ini',
        description: 'Total fisik yang tercatat aktif.',
      },
      available_copies: {
        label: 'Tersedia',
        value: k.available_copies,
        context: 'Siap dipinjam',
        description: 'Eksemplar yang bisa dilayani petugas.',
        tone: 'success',
      },
      loaned_copies: {
        label: 'Dipinjam',
        value: k.loaned_copies,
        context: 'Sedang keluar',
        description: 'Eksemplar yang masih berada pada member.',
      },
      pending_reservations: {
        label: 'Reservasi pending',
        value: k.pending_reservations,
        context: 'Menunggu keputusan',
        description: 'Perlu dicek sebelum member datang.',
        tone: k.pending_reservations > 0 ? 'warning' : undefined,
      },
      overdue_items: {
        label: 'Terlambat',
        value: k.overdue_items,
        context: 'Perlu tindak lanjut',
        description: 'Item aktif yang melewati jatuh tempo.',
        tone: k.overdue_items > 0 ? 'attention' : undefined,
      },
      damaged_copies: {
        label: 'Rusak',
        value: k.damaged_copies,
        context: 'Tidak siap dipinjam',
        description: 'Eksemplar dengan kondisi rusak.',
        tone: k.damaged_copies > 0 ? 'warning' : undefined,
      },
      lost_copies: {
        label: 'Hilang',
        value: k.lost_copies,
        context: 'Perlu penyelesaian',
        description: 'Eksemplar yang tercatat hilang.',
        tone: k.lost_copies > 0 ? 'attention' : undefined,
      },
      visits_today: {
        label: 'Kunjungan hari ini',
        value: k.visits_today,
        context: 'Hari berjalan',
        description: 'Kunjungan individu yang sudah tercatat.',
      },
      outstanding_fines: {
        label: 'Denda belum lunas',
        value: k.outstanding_fines,
        context: 'Saldo terbuka',
        description: 'Total tagihan yang belum selesai dibayar.',
        currency: true,
        tone: k.outstanding_fines > 0 ? 'attention' : undefined,
      },
    };

    const order = kpiOrder(this.authStore.currentRole());
    return order.map((key) => cards[key]);
  }

  protected maxLoans(value: DashboardData): number {
    return Math.max(1, ...value.charts.loans.map((point) => point.items_borrowed));
  }

  protected maxVisits(value: DashboardData): number {
    return Math.max(1, ...value.charts.visits.map((point) => this.visitTotal(point)));
  }

  protected visitTotal(point: DashboardData['charts']['visits'][number]): number {
    return Number(point.individual_visits) + Number(point.group_participants);
  }

  protected barWidth(value: number, max: number): number {
    return Math.max(2, Math.round((Number(value) / max) * 100));
  }

  protected hasNoActivity(value: DashboardData): boolean {
    return this.totalLoans(value) === 0 && this.totalVisits(value) === 0;
  }

  protected loanSummary(value: DashboardData): string {
    const totalItems = this.totalLoans(value);
    if (totalItems === 0) return `Tidak ada peminjaman pada ${this.periodLabel(value.period)}.`;
    return `${this.number(totalItems)} eksemplar dipinjam dalam ${this.number(
      value.charts.loans.length,
    )} hari aktif.`;
  }

  protected visitSummary(value: DashboardData): string {
    const totalVisits = this.totalVisits(value);
    if (totalVisits === 0) return `Tidak ada kunjungan pada ${this.periodLabel(value.period)}.`;
    return `${this.number(totalVisits)} pengunjung tercatat dalam ${this.number(
      value.charts.visits.length,
    )} hari aktif.`;
  }

  protected loanChartDescription(value: DashboardData): string {
    return `Grafik peminjaman ${this.periodLabel(value.period)}. Total ${this.number(
      this.totalLoans(value),
    )} eksemplar. Hari tertinggi ${this.peakLoanText(value)}.`;
  }

  protected visitChartDescription(value: DashboardData): string {
    return `Grafik kunjungan ${this.periodLabel(value.period)}. Total ${this.number(
      this.totalVisits(value),
    )} pengunjung. Hari tertinggi ${this.peakVisitText(value)}.`;
  }

  protected periodLabel(period: DateRange): string {
    if (period.from === period.to) return longDate(period.from);
    return `${longDate(period.from)} sampai ${longDate(period.to)}`;
  }

  protected number(value: number): string {
    return new Intl.NumberFormat('id-ID').format(Number(value));
  }

  protected rupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected shortDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
      dateAtLocalNoon(value),
    );
  }

  protected longDate(value: string): string {
    return longDate(value);
  }

  protected roleDescription(): string {
    switch (this.authStore.currentRole()) {
      case 'master_admin':
        return 'Pantau kesehatan data, saldo denda, dan antrian keputusan penting dari satu ringkasan.';
      case 'head_librarian':
        return 'Lihat capaian layanan, keterlambatan, dan pola kunjungan untuk bahan evaluasi.';
      case 'librarian':
        return 'Fokus pada reservasi, keterlambatan, ketersediaan, dan aktivitas harian layanan.';
      case 'guest':
        return 'Akses katalog publik dan koleksi digital yang tersedia untuk pengunjung.';
      default:
        return 'Ringkasan aktivitas perpustakaan.';
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

  private totalLoans(value: DashboardData): number {
    return value.charts.loans.reduce((total, point) => total + Number(point.items_borrowed), 0);
  }

  private totalVisits(value: DashboardData): number {
    return value.charts.visits.reduce((total, point) => total + this.visitTotal(point), 0);
  }

  private peakLoanText(value: DashboardData): string {
    const peak = value.charts.loans.reduce(
      (current, point) => (point.items_borrowed > current.items_borrowed ? point : current),
      { activity_date: '', loan_transactions: 0, items_borrowed: 0 },
    );
    return peak.activity_date
      ? `${longDate(peak.activity_date)} dengan ${this.number(peak.items_borrowed)} eksemplar`
      : 'belum ada';
  }

  private peakVisitText(value: DashboardData): string {
    const peak = value.charts.visits.reduce(
      (current, point) => (this.visitTotal(point) > this.visitTotal(current) ? point : current),
      { visit_date: '', individual_visits: 0, group_visits: 0, group_participants: 0 },
    );
    return peak.visit_date
      ? `${longDate(peak.visit_date)} dengan ${this.number(this.visitTotal(peak))} pengunjung`
      : 'belum ada';
  }
}

function kpiOrder(role: AppRole | null): string[] {
  switch (role) {
    case 'master_admin':
      return [
        'total_titles',
        'total_copies',
        'available_copies',
        'outstanding_fines',
        'pending_reservations',
        'overdue_items',
        'loaned_copies',
        'visits_today',
        'damaged_copies',
        'lost_copies',
      ];
    case 'head_librarian':
      return [
        'loaned_copies',
        'overdue_items',
        'pending_reservations',
        'visits_today',
        'outstanding_fines',
        'available_copies',
        'damaged_copies',
        'lost_copies',
        'total_titles',
        'total_copies',
      ];
    case 'librarian':
      return [
        'pending_reservations',
        'overdue_items',
        'available_copies',
        'loaned_copies',
        'visits_today',
        'damaged_copies',
        'lost_copies',
        'outstanding_fines',
        'total_titles',
        'total_copies',
      ];
    default:
      return [
        'total_titles',
        'total_copies',
        'available_copies',
        'loaned_copies',
        'pending_reservations',
        'overdue_items',
        'damaged_copies',
        'lost_copies',
        'visits_today',
        'outstanding_fines',
      ];
  }
}

function rangeFromParams(params: ParamMap): DateRange | null {
  const from = params.get('from');
  const to = params.get('to');
  if (!from || !to || !isIsoDate(from) || !isIsoDate(to) || from > to) return null;
  return { from, to };
}

function rangeKey(range: DateRange): string {
  return `${range.from}:${range.to}`;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateAtLocalNoon(value).getTime());
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function longDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateAtLocalNoon(value));
}

function dateAtLocalNoon(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
