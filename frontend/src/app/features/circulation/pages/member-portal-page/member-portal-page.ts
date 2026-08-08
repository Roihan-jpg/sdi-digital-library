import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
    <section class="portal page page--wide" id="portal-anggota">
      <header class="portal__header">
        <div>
          <p class="eyebrow">Portal anggota</p>
          <h1>Pinjaman, reservasi, dan denda saya</h1>
          <p>
            Cek buku yang sedang dipinjam, batas pengembalian, reservasi, dan denda dari transaksi
            perpustakaan.
          </p>
        </div>
        <a class="button button--secondary portal__catalog-link" href="/katalog">Buka katalog</a>
      </header>

      @if (message()) {
        <p class="alert" [class.alert--success]="messageTone() === 'success'" role="status">
          {{ message() }}
        </p>
      }
      @if (errorMessage()) {
        <p class="alert alert--error" role="alert">{{ errorMessage() }}</p>
      }

      <section class="cards" aria-label="Ringkasan akun">
        <article class="card card--indexed">
          <strong>{{ activeCount() }}</strong>
          <span>Pinjaman aktif</span>
        </article>
        <article class="card">
          <strong>{{ dueSoonCount() }}</strong>
          <span>Jatuh tempo dekat</span>
        </article>
        <article class="card">
          <strong>{{ rupiah(outstandingFine()) }}</strong>
          <span>Sisa denda</span>
        </article>
      </section>

      <section class="panel card">
        <div class="heading">
          <h2>Pinjaman aktif dan jatuh tempo</h2>
          <button class="button button--secondary" type="button" (click)="load()">
            {{ loading() ? 'Memuat...' : 'Muat ulang' }}
          </button>
        </div>

        <div class="grid">
          @for (loan of loans(); track loan.id) {
            @for (item of loan.loan_items; track item.id) {
              @if (!item.returned_at) {
                <article class="loan-card" [class.loan-card--warning]="isDueSoon(item.due_at)">
                  <span class="badge {{ badgeClass(item.status) }}">
                    {{ loanItemStatusLabel(item.status) }}
                  </span>
                  <h3>{{ item.book_copies?.book_titles?.title || 'Judul tidak tersedia' }}</h3>
                  <p class="copy-code">{{ item.book_copies?.inventory_code || '-' }}</p>
                  <strong>Jatuh tempo {{ formatDate(item.due_at) }}</strong>
                  <small>Perpanjangan {{ item.renewal_count }}/1</small>
                </article>
              }
            }
          }
        </div>

        @if (loading() && activeCount() === 0) {
          <p class="loading-state">Memuat pinjaman aktif...</p>
        } @else if (!loading() && activeCount() === 0) {
          <div class="content-state content-state--compact">
            <h3>Tidak ada pinjaman aktif</h3>
            <p class="content-state__description">
              Buku yang kamu pinjam akan muncul di sini bersama tanggal jatuh temponya.
            </p>
          </div>
        }
      </section>

      <section class="panel card" id="reservasi">
        <div class="section-title">
          <h2>Reservasi buku</h2>
          <p>
            Pilih buku dari katalog, lalu pakai kode/link buku yang dibawa dari katalog untuk
            membuat reservasi.
          </p>
        </div>

        <form class="reserve-form" (ngSubmit)="reserve()" novalidate>
          <div class="field">
            <label for="book-title-id">Buku dari katalog</label>

            <input
              #bookTitleInput
              id="book-title-id"
              name="bookTitleId"
              [formControl]="bookTitleId"
              [attr.aria-invalid]="bookTitleError() ? 'true' : null"
              aria-describedby="book-title-helper book-title-error"
              autocomplete="off"
              spellcheck="false"
              placeholder="Contoh: kode buku dari tombol reservasi katalog"
            />
            <p class="field__hint" id="book-title-helper">
              Cara paling mudah: buka katalog, pilih buku, lalu lanjutkan reservasi dari buku
              tersebut. Jangan isi kode eksemplar atau nomor inventaris.
            </p>
            @if (bookTitleError()) {
              <p class="validation-message" id="book-title-error" role="alert">
                {{ bookTitleError() }}
              </p>
            }
          </div>
          <button class="button reserve-submit" [disabled]="loading()" [attr.aria-busy]="loading()">
            Buat reservasi
          </button>
        </form>

        <div class="table-wrap">
          <table>
            <caption>
              Daftar reservasi buku saya
            </caption>
            <thead>
              <tr>
                <th scope="col">Nomor</th>
                <th scope="col">Judul</th>
                <th scope="col">Status</th>
                <th scope="col">Batas ambil</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @if (loading() && reservations().length === 0) {
                <tr>
                  <td class="state-cell" colspan="5">Memuat reservasi...</td>
                </tr>
              } @else if (!loading() && reservations().length === 0) {
                <tr>
                  <td class="state-cell" colspan="5">
                    Belum ada reservasi. Buka katalog untuk memilih buku.
                  </td>
                </tr>
              } @else {
                @for (item of reservations(); track item.id) {
                  <tr>
                    <td data-label="Nomor">{{ item.reservation_number }}</td>
                    <td data-label="Judul">{{ item.book_titles?.title || '-' }}</td>
                    <td data-label="Status">
                      <span class="badge {{ badgeClass(item.status) }}">
                        {{ reservationStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td data-label="Batas ambil">{{ formatDate(item.expires_at) }}</td>
                    <td data-label="Aksi">
                      @if (canCancel(item)) {
                        @if (pendingCancelId() === item.id) {
                          <div class="confirm-actions" role="group" aria-label="Konfirmasi batal">
                            <button
                              class="button button--danger button--compact"
                              type="button"
                              [disabled]="cancellingId() === item.id"
                              (click)="confirmCancel(item)"
                            >
                              Ya, batalkan
                            </button>
                            <button
                              class="button button--secondary button--compact"
                              type="button"
                              [disabled]="cancellingId() === item.id"
                              (click)="pendingCancelId.set(null)"
                            >
                              Tidak jadi
                            </button>
                          </div>
                        } @else {
                          <button
                            class="button button--secondary button--compact"
                            type="button"
                            (click)="askCancel(item)"
                          >
                            Batalkan
                          </button>
                        }
                        @if (cancelErrorId() === item.id) {
                          <p class="validation-message table-error" role="alert">
                            {{ cancelError() }}
                          </p>
                        }
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel card" id="denda">
        <h2>Denda dan pembayaran</h2>
        <div class="table-wrap">
          <table>
            <caption>
              Tagihan denda dan status pembayaran
            </caption>
            <thead>
              <tr>
                <th scope="col">Jenis</th>
                <th scope="col">Keterangan</th>
                <th scope="col">Tagihan</th>
                <th scope="col">Dibayar</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @if (loading() && fines().length === 0) {
                <tr>
                  <td class="state-cell" colspan="5">Memuat denda...</td>
                </tr>
              } @else if (!loading() && fines().length === 0) {
                <tr>
                  <td class="state-cell" colspan="5">Tidak ada denda.</td>
                </tr>
              } @else {
                @for (fine of fines(); track fine.id) {
                  <tr>
                    <td data-label="Jenis">{{ fineTypeLabel(fine.fine_type) }}</td>
                    <td data-label="Keterangan">{{ fine.description || '-' }}</td>
                    <td data-label="Tagihan">{{ rupiah(fine.amount) }}</td>
                    <td data-label="Dibayar">{{ rupiah(fine.paid_amount) }}</td>
                    <td data-label="Status">
                      <span class="badge {{ badgeClass(fine.status) }}">
                        {{ paymentStatusLabel(fine.status) }}
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel card" id="riwayat">
        <h2>Riwayat peminjaman</h2>
        <div class="table-wrap">
          <table>
            <caption>
              Riwayat transaksi peminjaman
            </caption>
            <thead>
              <tr>
                <th scope="col">Nomor</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Status</th>
                <th scope="col">Jumlah item</th>
              </tr>
            </thead>
            <tbody>
              @if (loading() && loans().length === 0) {
                <tr>
                  <td class="state-cell" colspan="4">Memuat riwayat...</td>
                </tr>
              } @else if (!loading() && loans().length === 0) {
                <tr>
                  <td class="state-cell" colspan="4">
                    Riwayat peminjaman akan muncul setelah ada transaksi.
                  </td>
                </tr>
              } @else {
                @for (loan of loans(); track loan.id) {
                  <tr>
                    <td data-label="Nomor">{{ loan.loan_number }}</td>
                    <td data-label="Tanggal">{{ formatDate(loan.borrowed_at) }}</td>
                    <td data-label="Status">
                      <span class="badge {{ badgeClass(loan.status) }}">
                        {{ loanStatusLabel(loan.status) }}
                      </span>
                    </td>
                    <td data-label="Jumlah item">{{ loan.loan_items.length }}</td>
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
    .portal {
      display: grid;
      gap: var(--space-6);
    }

    .portal__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .portal__header h1,
    .portal__header p,
    .section-title h2,
    .section-title p,
    .panel h2 {
      margin-top: 0;
    }

    .portal__header p,
    .section-title p {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .portal__catalog-link {
      flex: 0 0 auto;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: var(--space-4);
    }

    .cards article {
      display: grid;
      gap: var(--space-2);
      min-height: 7rem;
    }

    .cards strong {
      font-family: var(--font-family-data);
      font-size: var(--text-2xl);
      line-height: var(--leading-tight);
      color: var(--color-brand-950);
    }

    .cards span {
      color: var(--color-text-muted);
      font-weight: var(--weight-semibold);
    }

    .panel {
      display: grid;
      gap: var(--space-4);
    }

    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .reserve-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--space-4);
    }

    .reserve-submit {
      margin-top: 1.95rem;
      white-space: nowrap;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: var(--space-3);
    }

    .loan-card {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }

    .loan-card--warning {
      border-color: var(--color-amber-700);
      background: var(--color-warning-surface);
    }

    .loan-card h3,
    .loan-card p,
    .loan-card small {
      margin: 0;
    }

    .copy-code {
      color: var(--color-text-muted);
      font-family: var(--font-family-data);
      font-size: var(--text-sm);
    }

    .badge {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: var(--space-2);
      min-height: 1.75rem;
      padding: 0.15rem var(--space-3);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-info-surface);
      color: var(--color-brand-800);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      line-height: var(--leading-body);
    }

    .badge::before {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: var(--radius-pill);
      background: currentColor;
      content: '';
    }

    .badge--success {
      border-color: var(--color-success);
      background: var(--color-success-surface);
      color: var(--color-success);
    }

    .badge--warning {
      border-color: var(--color-amber-700);
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }

    .badge--danger {
      border-color: var(--color-error);
      background: var(--color-error-surface);
      color: var(--color-danger-strong);
    }

    caption {
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      text-align: left;
    }

    .state-cell {
      color: var(--color-text-muted);
      font-weight: var(--weight-semibold);
      text-align: center;
    }

    .button--compact {
      min-width: var(--control-height);
      min-height: var(--control-height);
      padding-inline: var(--space-3);
    }

    .confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .table-error {
      margin-top: var(--space-2);
    }

    .content-state--compact {
      min-height: 8rem;
    }

    @media (max-width: 40rem) {
      .portal__header,
      .heading,
      .reserve-form {
        align-items: stretch;
        grid-template-columns: 1fr;
        flex-direction: column;
      }

      .portal__catalog-link,
      .reserve-submit {
        width: 100%;
        margin-top: 0;
      }

      .table-wrap {
        border: 0;
        background: transparent;
      }

      .table-wrap table {
        min-width: 0;
      }

      thead {
        display: none;
      }

      tbody,
      tr,
      td {
        display: block;
        width: 100%;
      }

      tbody {
        display: grid;
        gap: var(--space-3);
      }

      tr {
        padding: var(--space-3);
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
      }

      td {
        display: grid;
        grid-template-columns: minmax(7rem, 42%) minmax(0, 1fr);
        gap: var(--space-3);
        padding: var(--space-2) 0;
        border-bottom: var(--border-width) solid var(--color-border);
      }

      td:last-child {
        border-bottom: 0;
      }

      td::before {
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        font-weight: var(--weight-bold);
        content: attr(data-label);
      }

      .state-cell {
        display: block;
        text-align: left;
      }

      .state-cell::before {
        content: none;
      }
    }
  `,
})
export class MemberPortalPage {
  private readonly api = inject(CirculationApiService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('bookTitleInput') private readonly bookTitleInput?: ElementRef<HTMLInputElement>;

  protected readonly loans = signal<Loan[]>([]);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly fines = signal<Fine[]>([]);
  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly messageTone = signal<'info' | 'success'>('info');
  protected readonly errorMessage = signal('');
  protected readonly reserveError = signal('');
  protected readonly pendingCancelId = signal<string | null>(null);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly cancelErrorId = signal<string | null>(null);
  protected readonly cancelError = signal('');
  protected readonly bookTitleId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor() {
    const bookTitleId = this.route.snapshot.queryParamMap.get('bookTitleId');
    if (bookTitleId) {
      this.bookTitleId.setValue(bookTitleId);
      this.message.set('Buku dari katalog sudah dipilih. Periksa lalu buat reservasi.');
    }
    this.load();
  }

  protected load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
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
        this.errorMessage.set(this.errorText(error, 'Data portal belum dapat dimuat.'));
        this.loading.set(false);
      },
    });
  }

  protected reserve() {
    this.bookTitleId.markAsTouched();
    this.reserveError.set('');
    this.errorMessage.set('');
    if (this.bookTitleId.invalid) {
      this.focusBookTitleInput();
      return;
    }
    this.loading.set(true);
    this.api.createReservation(this.bookTitleId.value.trim()).subscribe({
      next: () => {
        this.messageTone.set('success');
        this.message.set('Reservasi dibuat. Datang sebelum batas waktu yang ditampilkan.');
        this.bookTitleId.reset();
        this.loading.set(false);
        this.load();
      },
      error: (error) => {
        this.reserveError.set(this.errorText(error, 'Reservasi belum dapat dibuat.'));
        this.loading.set(false);
        this.focusBookTitleInput();
      },
    });
  }

  protected askCancel(item: Reservation) {
    this.pendingCancelId.set(item.id);
    this.cancelErrorId.set(null);
    this.cancelError.set('');
  }

  protected confirmCancel(item: Reservation) {
    if (this.cancellingId()) return;
    this.cancellingId.set(item.id);
    this.cancelErrorId.set(null);
    this.cancelError.set('');
    this.api.cancelReservation(item.id).subscribe({
      next: () => {
        this.messageTone.set('success');
        this.message.set('Reservasi dibatalkan.');
        this.pendingCancelId.set(null);
        this.cancellingId.set(null);
        this.load();
      },
      error: (error) => {
        this.cancelErrorId.set(item.id);
        this.cancelError.set(this.errorText(error, 'Reservasi belum dapat dibatalkan.'));
        this.cancellingId.set(null);
      },
    });
  }

  protected canCancel(item: Reservation) {
    return item.status === 'pending' || item.status === 'approved';
  }

  protected activeCount() {
    return this.loans()
      .flatMap((l) => l.loan_items)
      .filter((i) => !i.returned_at).length;
  }

  protected dueSoonCount() {
    return this.loans()
      .flatMap((l) => l.loan_items)
      .filter((i) => !i.returned_at && this.isDueSoon(i.due_at)).length;
  }

  protected isDueSoon(value: string) {
    const due = new Date(value).getTime();
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return due >= now && due - now <= threeDays;
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
    if (!value) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  protected bookTitleError() {
    if (this.reserveError()) return this.reserveError();
    if (this.bookTitleId.invalid && this.bookTitleId.touched) {
      return 'Pilih buku dari katalog sebelum membuat reservasi.';
    }
    return '';
  }

  protected reservationStatusLabel(value: string) {
    return (
      {
        pending: 'Menunggu diambil',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        cancelled: 'Dibatalkan',
        expired: 'Kedaluwarsa',
        completed: 'Selesai',
      }[value] ?? value
    );
  }

  protected loanStatusLabel(value: string) {
    return (
      {
        active: 'Aktif',
        completed: 'Selesai',
        overdue: 'Terlambat',
        cancelled: 'Dibatalkan',
      }[value] ?? value
    );
  }

  protected loanItemStatusLabel(value: string) {
    return (
      {
        borrowed: 'Dipinjam',
        overdue: 'Terlambat',
        returned: 'Dikembalikan',
        lost: 'Hilang',
        damaged: 'Rusak',
      }[value] ?? value
    );
  }

  protected paymentStatusLabel(value: string) {
    return (
      {
        unpaid: 'Belum dibayar',
        partial: 'Dibayar sebagian',
        paid: 'Lunas',
        waived: 'Dihapuskan',
      }[value] ?? value
    );
  }

  protected fineTypeLabel(value: string) {
    return (
      {
        overdue: 'Terlambat',
        damaged: 'Rusak',
        lost: 'Hilang',
        replacement: 'Penggantian',
      }[value] ?? value
    );
  }

  protected badgeClass(value: string) {
    if (['approved', 'completed', 'paid', 'returned', 'active'].includes(value)) {
      return 'badge--success';
    }
    if (['pending', 'partial', 'overdue', 'borrowed'].includes(value)) {
      return 'badge--warning';
    }
    if (['rejected', 'cancelled', 'expired', 'unpaid', 'lost', 'damaged'].includes(value)) {
      return 'badge--danger';
    }
    return '';
  }

  private focusBookTitleInput() {
    setTimeout(() => this.bookTitleInput?.nativeElement.focus());
  }

  private errorText(error: unknown, fallback: string) {
    if (typeof error === 'object' && error && 'error' in error) {
      const body = (error as { error?: { message?: unknown; error?: unknown } }).error;
      const message = body?.message ?? body?.error;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
  }
}
