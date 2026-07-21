import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CirculationApiService,
  type Fine,
  type Loan,
  type Reservation,
} from '../../data-access/circulation-api.service';

@Component({
  selector: 'sdi-member-portal-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="portal">
      <p class="eyebrow">Portal anggota</p>
      <h1>Pinjaman, reservasi, dan denda saya</h1>
      <p>
        Data berasal langsung dari transaksi perpustakaan. Hubungi petugas jika ada data yang tidak
        sesuai.
      </p>
      @if (message()) {
        <p class="notice" role="status">{{ message() }}</p>
      }
      <section class="cards" aria-label="Ringkasan akun">
        <article>
          <strong>{{ activeCount() }}</strong
          ><span>Pinjaman aktif</span>
        </article>
        <article>
          <strong>{{ reservationCount() }}</strong
          ><span>Reservasi aktif</span>
        </article>
        <article>
          <strong>{{ rupiah(outstandingFine()) }}</strong
          ><span>Sisa denda</span>
        </article>
      </section>

      <section class="panel">
        <div class="heading">
          <h2>Pinjaman aktif dan jatuh tempo</h2>
          <button class="button button--secondary" type="button" (click)="load()">
            Muat ulang
          </button>
        </div>
        <div class="grid">
          @for (loan of loans(); track loan.id) {
            @for (item of loan.loan_items; track item.id) {
              @if (!item.returned_at) {
                <article>
                  <span class="status">{{ item.status }}</span>
                  <h3>{{ item.book_copies?.book_titles?.title }}</h3>
                  <p>{{ item.book_copies?.inventory_code }}</p>
                  <strong>Jatuh tempo {{ formatDate(item.due_at) }}</strong
                  ><small> · perpanjangan {{ item.renewal_count }}/1</small>
                </article>
              }
            }
          }
        </div>
        @if (!loading() && activeCount() === 0) {
          <p>Tidak ada pinjaman aktif.</p>
        }
      </section>

      <section class="panel">
        <h2>Reservasi</h2>
        <form (ngSubmit)="reserve()">
          <label for="book-title-id">ID judul buku</label>
          <div class="reserve-row">
            <input
              id="book-title-id"
              [formControl]="bookTitleId"
              placeholder="Salin ID judul dari katalog"
            /><button class="button" [disabled]="loading() || bookTitleId.invalid">
              Reservasi
            </button>
          </div>
        </form>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Judul</th>
                <th>Status</th>
                <th>Batas ambil</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (item of reservations(); track item.id) {
                <tr>
                  <td>{{ item.reservation_number }}</td>
                  <td>{{ item.book_titles?.title }}</td>
                  <td>{{ item.status }}</td>
                  <td>{{ formatDate(item.expires_at) }}</td>
                  <td>
                    @if (item.status === 'pending' || item.status === 'approved') {
                      <button type="button" (click)="cancel(item)">Batalkan</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Denda dan pembayaran</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Keterangan</th>
                <th>Tagihan</th>
                <th>Dibayar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (fine of fines(); track fine.id) {
                <tr>
                  <td>{{ fine.fine_type }}</td>
                  <td>{{ fine.description }}</td>
                  <td>{{ rupiah(fine.amount) }}</td>
                  <td>{{ rupiah(fine.paid_amount) }}</td>
                  <td>{{ fine.status }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (!loading() && fines().length === 0) {
          <p>Tidak ada denda.</p>
        }
      </section>

      <section class="panel">
        <h2>Riwayat peminjaman</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Jumlah item</th>
              </tr>
            </thead>
            <tbody>
              @for (loan of loans(); track loan.id) {
                <tr>
                  <td>{{ loan.loan_number }}</td>
                  <td>{{ formatDate(loan.borrowed_at) }}</td>
                  <td>{{ loan.status }}</td>
                  <td>{{ loan.loan_items.length }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: `
    .portal {
      padding: 2rem;
      max-width: 76rem;
      margin: auto;
    }
    .notice {
      padding: 0.8rem 1rem;
      background: #e6f2eb;
      border-left: 4px solid #176b43;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .cards article,
    .panel,
    .grid article {
      padding: 1rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.7rem;
    }
    .cards article {
      display: grid;
      gap: 0.3rem;
    }
    .cards strong {
      font-size: 1.6rem;
    }
    .panel {
      margin-block: 1rem;
    }
    .heading,
    .reserve-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.7rem;
    }
    .reserve-row input {
      flex: 1;
      padding: 0.7rem;
      border: 1px solid #9dafa4;
      border-radius: 0.45rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 0.7rem;
    }
    .grid article {
      display: block;
    }
    .status {
      color: #176b43;
      font-weight: 700;
    }
    .table-wrap {
      overflow: auto;
      margin-top: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 0.7rem;
      border-bottom: 1px solid #dce4df;
    }
    td button {
      padding: 0.5rem;
      border: 1px solid #b8c8bf;
      border-radius: 0.4rem;
      background: #fff;
    }
    @media (max-width: 40rem) {
      .portal {
        padding: 1rem;
      }
      .heading,
      .reserve-row {
        align-items: stretch;
        flex-direction: column;
      }
      .reserve-row input,
      .reserve-row button {
        width: 100%;
      }
    }
  `,
})
export class MemberPortalPage {
  private readonly api = inject(CirculationApiService);
  protected readonly loans = signal<Loan[]>([]);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly fines = signal<Fine[]>([]);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly bookTitleId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  constructor() {
    this.load();
  }
  protected load() {
    if (this.loading()) return;
    this.loading.set(true);
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
        this.message.set('Data portal belum dapat dimuat.');
        this.loading.set(false);
      },
    });
  }
  protected reserve() {
    if (this.bookTitleId.invalid) return;
    this.loading.set(true);
    this.api.createReservation(this.bookTitleId.value).subscribe({
      next: () => {
        this.message.set('Reservasi dibuat. Datang sebelum batas waktu yang ditampilkan.');
        this.bookTitleId.reset();
        this.loading.set(false);
        this.load();
      },
      error: () => this.loading.set(false),
    });
  }
  protected cancel(item: Reservation) {
    this.api.cancelReservation(item.id).subscribe({
      next: () => {
        this.message.set('Reservasi dibatalkan.');
        this.load();
      },
    });
  }
  protected activeCount() {
    return this.loans()
      .flatMap((l) => l.loan_items)
      .filter((i) => !i.returned_at).length;
  }
  protected reservationCount() {
    return this.reservations().filter((r) => r.status === 'pending' || r.status === 'approved')
      .length;
  }
  protected outstandingFine() {
    return this.fines().reduce((sum, f) => sum + Math.max(f.amount - f.paid_amount, 0), 0);
  }
  protected rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  protected formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }
}
