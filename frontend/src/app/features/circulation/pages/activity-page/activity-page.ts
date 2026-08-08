import { Component, inject, signal } from '@angular/core';
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
      <div class="notice">{{ error() }}</div>
    }
    @if (loading()) {
      <div class="panel state">Memuat aktivitas...</div>
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
      gap: 22px;
      color: #18354e;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .eyebrow {
      margin: 0;
      color: #a5660b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
    }
    h1,
    h2 {
      color: #102f4d;
      margin: 0.3rem 0;
    }
    .panel {
      background: #fff;
      border: 1px solid #dce2e5;
      padding: 22px;
    }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .split article {
      display: grid;
      gap: 4px;
      padding: 12px 0;
      border-bottom: 1px solid #e1e5e7;
    }
    .split span {
      color: #61727f;
    }
    .table {
      overflow: auto;
    }
    table {
      width: 100%;
      min-width: 680px;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 11px;
      border-bottom: 1px solid #e1e5e7;
    }
    button {
      border: 0;
      background: #123a5d;
      color: #fff;
      padding: 10px 14px;
      font-weight: 800;
    }
    .notice {
      padding: 12px;
      background: #fff0ed;
      border-left: 4px solid #b23b2c;
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
      error: () => {
        this.error.set('Aktivitas belum dapat dimuat.');
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
