import { Component, inject, signal } from '@angular/core';
import { parseApiError } from '../../../../core/errors/api-error';
import { forkJoin } from 'rxjs';
import {
  CirculationApiService,
  type Fine,
  type Loan,
  type Reservation,
} from '../../data-access/circulation-api.service';

@Component({
  selector: 'sdi-activity-page',
  template: `<section class="page">
    <header>
      <div>
        <p class="eyebrow">Mode baca</p>
        <h1>Aktivitas layanan</h1>
        <p>Pantau pinjaman, reservasi, dan denda tanpa menjalankan tindakan operasional.</p>
      </div>
      <button (click)="load()">Muat ulang</button>
    </header>
    @if (error()) {
      <div class="notice" role="alert" aria-atomic="true">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="panel state" role="status">Memuat aktivitas...</div>
    } @else {
      <section class="panel">
        <h2>Pinjaman terbaru</h2>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Member</th>
                <th>Waktu pinjam</th>
                <th>Status</th>
                <th>Item</th>
              </tr>
            </thead>
            <tbody>
              @for (item of loans(); track item.id) {
                <tr>
                  <td>{{ item.loan_number }}</td>
                  <td>{{ item.members?.full_name || '-' }}</td>
                  <td>{{ date(item.borrowed_at) }}</td>
                  <td>{{ item.status }}</td>
                  <td>{{ item.loan_items.length }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">Belum ada data.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <div class="split">
        <section class="panel">
          <h2>Reservasi</h2>
          @for (item of reservations(); track item.id) {
            <article>
              <strong>{{ item.reservation_number }} · {{ item.book_titles?.title || '-' }}</strong
              ><span>{{ item.members?.full_name || '-' }} · {{ item.status }}</span>
            </article>
          } @empty {
            <p>Belum ada data.</p>
          }
        </section>
        <section class="panel">
          <h2>Denda</h2>
          @for (item of fines(); track item.id) {
            <article>
              <strong>{{ item.members?.full_name || '-' }}</strong
              ><span>{{ money(item.amount - item.paid_amount) }} · {{ item.status }}</span>
            </article>
          } @empty {
            <p>Belum ada data.</p>
          }
        </section>
      </div>
    }
  </section>`,
  styles: `
    :host {
      display: block;
    }
    .page {
      display: grid;
      gap: var(--space-6);
      color: var(--color-text);
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: var(--space-5);
    }
    .eyebrow {
      margin: 0;
      color: var(--color-brand-800);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    h1,
    h2 {
      color: var(--color-text);
      margin: 0.3rem 0;
    }
    .panel {
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }
    .split article {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--color-border);
    }
    .split span {
      color: var(--color-text-muted);
    }
    .table {
      overflow: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    table {
      width: 100%;
      min-width: 680px;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    button {
      border: 0;
      min-height: var(--control-height);
      padding: 0.65rem var(--space-4);
      border-radius: var(--radius-md);
      background: var(--color-action-primary);
      color: var(--color-text-inverse);
      font-weight: 800;
    }
    .notice {
      padding: var(--space-3);
      border-left: 4px solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-error);
    }
    .state {
      text-align: center;
    }
    @media (max-width: 800px) {
      header,
      .split {
        display: grid;
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ActivityPage {
  private readonly api = inject(CirculationApiService);
  protected readonly loans = signal<Loan[]>([]);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly fines = signal<Fine[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    this.load();
  }
  protected load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      loans: this.api.loans(),
      reservations: this.api.reservations(),
      fines: this.api.fines(),
    }).subscribe({
      next: (r) => {
        this.loans.set(r.loans.data);
        this.reservations.set(r.reservations.data);
        this.fines.set(r.fines.data);
        this.loading.set(false);
      },
      error: (error) => {
        const details = parseApiError(
          error,
          'Aktivitas belum dapat dimuat. Gunakan Muat ulang untuk mencoba lagi.',
        );
        this.error.set(
          details.requestId
            ? `${details.message} Referensi: ${details.requestId}`
            : details.message,
        );
        this.loading.set(false);
      },
    });
  }
  protected date(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value));
  }
  protected money(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
