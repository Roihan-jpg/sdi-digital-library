import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CirculationApiService,
  type CopyLookup,
  type Fine,
  type LoanReceipt,
  type MemberLookup,
  type PaymentReceipt,
  type Reservation,
  type ReturnResult,
} from '../../data-access/circulation-api.service';

@Component({
  selector: 'sdi-operations-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="operations" [attr.aria-busy]="busy()">
      <header>
        <div>
          <p class="eyebrow">Sirkulasi</p>
          <h1>Meja layanan perpustakaan</h1>
        </div>
        <button
          class="button button--secondary"
          type="button"
          [disabled]="busy()"
          (click)="runMaintenance()"
        >
          Perbarui overdue & reservasi
        </button>
      </header>
      <nav class="tabs" aria-label="Jenis operasi">
        @for (item of tabs; track item.id) {
          <button type="button" [class.active]="tab() === item.id" (click)="selectTab(item.id)">
            {{ item.label }}
          </button>
        }
      </nav>
      @if (message()) {
        <p class="notice" role="status">{{ message() }}</p>
      }

      @switch (tab()) {
        @case ('checkout') {
          <div class="workspace">
            <form class="panel" (ngSubmit)="scanMember()">
              <h2>1. Scan kartu member</h2>
              <label for="member-scan">Nomor kartu, kartu pelajar, atau kode member</label>
              <div class="scan-row">
                <input
                  #memberScan
                  id="member-scan"
                  [formControl]="memberCode"
                  autocomplete="off"
                  autofocus
                /><button class="button" [disabled]="busy()">Cari</button>
              </div>
              @if (member()) {
                <div class="summary" [class.warning]="!member()!.is_active">
                  <strong>{{ member()!.full_name }}</strong
                  ><span
                    >{{ member()!.member_code }} · {{ member()!.class_name ?? 'Non-siswa' }}</span
                  >
                  <span
                    >{{ member()!.active_loan_count }} pinjaman aktif · Denda
                    {{ rupiah(member()!.outstanding_fine) }}</span
                  >
                </div>
              }
            </form>
            <form class="panel" (ngSubmit)="scanBook()">
              <h2>2. Scan eksemplar</h2>
              <label for="book-scan">Kode inventaris / barcode / QR</label>
              <div class="scan-row">
                <input
                  #bookScan
                  id="book-scan"
                  [formControl]="bookCode"
                  autocomplete="off"
                /><button class="button" [disabled]="busy() || !member()">Tambah</button>
              </div>
              <ul class="scan-list">
                @for (copy of copies(); track copy.id) {
                  <li>
                    <span
                      ><strong>{{ copy.inventory_code }}</strong> {{ copy.title }}</span
                    ><button
                      type="button"
                      (click)="removeCopy(copy.id)"
                      aria-label="Hapus buku dari transaksi"
                    >
                      Hapus
                    </button>
                  </li>
                }
              </ul>
              <button
                class="button checkout"
                type="button"
                [disabled]="busy() || !canCheckout()"
                (click)="checkout()"
              >
                Konfirmasi peminjaman ({{ copies().length }})
              </button>
            </form>
          </div>
          @if (receipt()) {
            <article class="receipt" aria-label="Bukti peminjaman">
              <h2>Bukti {{ receipt()!.loan_number }}</h2>
              <p>{{ receipt()!.member.full_name }} · {{ formatDate(receipt()!.borrowed_at) }}</p>
              <table>
                <thead>
                  <tr>
                    <th>Buku</th>
                    <th>Kode</th>
                    <th>Jatuh tempo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of receipt()!.items; track item.loan_item_id) {
                    <tr>
                      <td>{{ item.title }}</td>
                      <td>{{ item.inventory_code }}</td>
                      <td>{{ formatDate(item.due_at) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <button class="button button--secondary" type="button" (click)="print()">
                Cetak bukti
              </button>
              <button class="button" type="button" (click)="startNextCheckout()">
                Transaksi berikutnya
              </button>
            </article>
          }
        }
        @case ('return') {
          <form class="panel compact" [formGroup]="returnForm" (ngSubmit)="returnBook()">
            <h2>Pengembalian</h2>
            <label for="return-code">Scan kode inventaris</label
            ><input
              #returnScan
              id="return-code"
              formControlName="inventoryCode"
              autocomplete="off"
            />
            <label for="return-condition">Kondisi saat kembali</label
            ><select id="return-condition" formControlName="condition">
              <option value="good">Baik / tersedia</option>
              <option value="damaged">Rusak</option>
              <option value="lost">Hilang</option>
            </select>
            <label for="return-notes">Catatan</label
            ><textarea id="return-notes" formControlName="notes"></textarea>
            <button class="button" [disabled]="busy() || returnForm.invalid">
              Proses pengembalian
            </button>
          </form>
          @if (returnResult()) {
            <article class="receipt">
              <h2>Pengembalian selesai</h2>
              <p>
                Terlambat {{ returnResult()!.days_late }} hari · Denda
                {{ rupiah(returnResult()!.overdue_fine) }} · Penggantian
                {{ rupiah(returnResult()!.replacement_fine) }}
              </p>
              <p>Status eksemplar: {{ returnResult()!.copy_status }}</p>
            </article>
          }
        }
        @case ('reservations') {
          <section class="panel">
            <div class="section-heading">
              <h2>Reservasi aktif</h2>
              <button class="button button--secondary" type="button" (click)="loadReservations()">
                Muat ulang
              </button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nomor</th>
                    <th>Member</th>
                    <th>Judul</th>
                    <th>Status / batas</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of reservations(); track item.id) {
                    <tr>
                      <td>{{ item.reservation_number }}</td>
                      <td>{{ item.members?.full_name }}</td>
                      <td>{{ item.book_titles?.title }}</td>
                      <td>
                        {{ item.status }}<br /><small>{{ formatDate(item.expires_at) }}</small>
                      </td>
                      <td class="actions">
                        @if (item.status === 'pending') {
                          <button type="button" (click)="approve(item)">Approve</button>
                        }
                        @if (item.status === 'pending' || item.status === 'approved') {
                          <button type="button" (click)="convert(item)">Jadikan loan</button
                          ><button type="button" (click)="reject(item)">Tolak</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
        @case ('fines') {
          <section class="panel">
            <div class="section-heading">
              <h2>Tagihan belum lunas</h2>
              <button class="button button--secondary" type="button" (click)="loadFines()">
                Muat ulang
              </button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Jenis</th>
                    <th>Tagihan</th>
                    <th>Terbayar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fine of fines(); track fine.id) {
                    <tr>
                      <td>{{ fine.members?.full_name }}</td>
                      <td>{{ fine.fine_type }}</td>
                      <td>{{ rupiah(fine.amount) }}</td>
                      <td>{{ rupiah(fine.paid_amount) }}</td>
                      <td><button type="button" (click)="pay(fine)">Bayar</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
          @if (paymentReceipt()) {
            <article class="receipt">
              <h2>Bukti pembayaran</h2>
              <p>
                {{ paymentReceipt()!.member.full_name }} ·
                {{ rupiah(paymentReceipt()!.amount_paid) }}
              </p>
              <p>
                Sisa tagihan {{ rupiah(paymentReceipt()!.remaining_amount) }} ·
                {{ paymentReceipt()!.status }}
              </p>
              <button class="button button--secondary" type="button" (click)="print()">
                Cetak bukti
              </button>
            </article>
          }
        }
        @case ('visits') {
          <div class="workspace">
            <form class="panel" (ngSubmit)="recordVisit()">
              <h2>Kunjungan individu</h2>
              <label for="visit-card">Scan kartu anggota</label>
              <div class="scan-row">
                <input
                  #visitScan
                  id="visit-card"
                  [formControl]="visitCode"
                  autocomplete="off"
                /><button class="button" [disabled]="busy()">Catat</button>
              </div>
              <p>
                Siswa individual wajib menggunakan kartu; input manual ini hanya fallback untuk kode
                pada kartu yang sulit terbaca.
              </p>
            </form>
            <form class="panel" [formGroup]="groupVisitForm" (ngSubmit)="recordGroupVisit()">
              <h2>Kunjungan rombongan</h2>
              <label>ID kelas<input formControlName="classId" /></label
              ><label>ID rombel (opsional)<input formControlName="studyGroupId" /></label
              ><label>Guru pendamping<input formControlName="teacherName" /></label
              ><label
                >Jumlah siswa<input
                  type="number"
                  min="1"
                  formControlName="participantCount" /></label
              ><label>Catatan<textarea formControlName="notes"></textarea></label
              ><button class="button" [disabled]="busy() || groupVisitForm.invalid">
                Catat rombongan
              </button>
            </form>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .operations {
      padding: 2rem;
      max-width: 90rem;
      margin: auto;
    }
    header,
    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h1,
    h2 {
      margin-top: 0;
    }
    .tabs {
      display: flex;
      gap: 0.4rem;
      overflow: auto;
      margin: 1.5rem 0;
    }
    .tabs button,
    .actions button,
    td button,
    .scan-list button {
      border: 1px solid #b8c8bf;
      background: #fff;
      border-radius: 0.45rem;
      padding: 0.6rem 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .tabs button.active {
      background: #0e3b28;
      color: #fff;
    }
    .notice {
      padding: 0.8rem 1rem;
      background: #e6f2eb;
      border-left: 4px solid #176b43;
    }
    .workspace {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
      gap: 1rem;
    }
    .panel,
    .receipt {
      padding: 1.2rem;
      background: #fff;
      border: 1px solid #d5dfd9;
      border-radius: 0.75rem;
    }
    .compact {
      max-width: 38rem;
      display: grid;
      gap: 0.7rem;
    }
    .panel label {
      display: grid;
      gap: 0.3rem;
      margin-top: 0.7rem;
    }
    .scan-row {
      display: flex;
      gap: 0.5rem;
    }
    .scan-row input {
      flex: 1;
    }
    input,
    select,
    textarea {
      width: 100%;
      padding: 0.72rem;
      border: 1px solid #9dafa4;
      border-radius: 0.45rem;
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 3px solid #f4b942;
      outline-offset: 2px;
    }
    .summary {
      display: grid;
      gap: 0.2rem;
      margin-top: 1rem;
      padding: 1rem;
      background: #edf7f1;
      border-radius: 0.5rem;
    }
    .summary.warning {
      background: #fff1f0;
    }
    .scan-list {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 0.4rem;
    }
    .scan-list li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem;
      border-bottom: 1px solid #e0e7e3;
    }
    .checkout {
      width: 100%;
    }
    .receipt {
      margin-top: 1rem;
      border-color: #78a48b;
    }
    .table-wrap {
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #dce4df;
      vertical-align: top;
    }
    .actions {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    @media print {
      .tabs,
      header > .button,
      .operations > header,
      .panel,
      .notice {
        display: none;
      }
      .receipt {
        border: 0;
      }
    }
    @media (max-width: 40rem) {
      .operations {
        padding: 1rem;
      }
      header {
        align-items: flex-start;
        flex-direction: column;
      }
      .scan-row {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
})
export class OperationsPage {
  private readonly api = inject(CirculationApiService);
  private readonly memberInput = viewChild<ElementRef<HTMLInputElement>>('memberScan');
  private readonly bookInput = viewChild<ElementRef<HTMLInputElement>>('bookScan');
  private readonly returnInput = viewChild<ElementRef<HTMLInputElement>>('returnScan');
  private readonly visitInput = viewChild<ElementRef<HTMLInputElement>>('visitScan');
  protected readonly tabs = [
    { id: 'checkout', label: 'Peminjaman' },
    { id: 'return', label: 'Pengembalian' },
    { id: 'reservations', label: 'Reservasi' },
    { id: 'fines', label: 'Denda' },
    { id: 'visits', label: 'Kunjungan' },
  ] as const;
  protected readonly tab = signal<(typeof this.tabs)[number]['id']>('checkout');
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly member = signal<MemberLookup | null>(null);
  protected readonly copies = signal<CopyLookup[]>([]);
  protected readonly checkoutKey = signal<string | null>(null);
  protected readonly reservationCheckoutKeys = signal<Record<string, string>>({});
  protected readonly receipt = signal<LoanReceipt | null>(null);
  protected readonly returnResult = signal<ReturnResult | null>(null);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly fines = signal<Fine[]>([]);
  protected readonly paymentReceipt = signal<PaymentReceipt | null>(null);
  protected readonly memberCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly bookCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly visitCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly returnForm = new FormGroup({
    inventoryCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    condition: new FormControl<'good' | 'damaged' | 'lost'>('good', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });
  protected readonly groupVisitForm = new FormGroup({
    classId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    studyGroupId: new FormControl('', { nonNullable: true }),
    teacherName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    participantCount: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    notes: new FormControl('', { nonNullable: true }),
  });

  protected selectTab(id: (typeof this.tabs)[number]['id']) {
    this.tab.set(id);
    this.message.set('');
    if (id === 'reservations') this.loadReservations();
    if (id === 'fines') this.loadFines();
    queueMicrotask(() => {
      if (id === 'checkout') this.memberInput()?.nativeElement.focus();
      if (id === 'return') this.returnInput()?.nativeElement.focus();
      if (id === 'visits') this.visitInput()?.nativeElement.focus();
    });
  }
  protected scanMember() {
    const code = this.memberCode.value.trim();
    if (!code) return;
    this.run(
      this.api.lookupMember(code),
      (r) => {
        this.member.set(r.data);
        this.copies.set([]);
        this.checkoutKey.set(null);
        this.message.set(
          r.data.is_active
            ? 'Member siap untuk transaksi.'
            : 'Member tidak aktif dan tidak dapat meminjam.',
        );
        queueMicrotask(() => this.bookInput()?.nativeElement.focus());
      },
      () => this.memberInput()?.nativeElement.focus(),
    );
  }
  protected scanBook() {
    const code = this.bookCode.value.trim();
    if (!code || !this.member()) return;
    if (this.copies().some((c) => c.inventory_code === code)) {
      this.message.set('Eksemplar sudah ada di daftar scan.');
      this.bookCode.reset();
      queueMicrotask(() => this.bookInput()?.nativeElement.focus());
      return;
    }
    this.run(
      this.api.lookupCopy(code),
      (r) => {
        if (r.data.status !== 'available' || !r.data.is_active || r.data.is_reference_only) {
          this.message.set('Eksemplar tidak tersedia atau tidak boleh dipinjam.');
          queueMicrotask(() => this.bookInput()?.nativeElement.focus());
          return;
        }
        this.copies.update((items) => [...items, r.data]);
        this.checkoutKey.set(null);
        this.bookCode.reset();
        queueMicrotask(() => this.bookInput()?.nativeElement.focus());
      },
      () => this.bookInput()?.nativeElement.focus(),
    );
  }
  protected removeCopy(id: string) {
    this.copies.update((items) => items.filter((item) => item.id !== id));
    this.checkoutKey.set(null);
  }
  protected canCheckout() {
    return (
      Boolean(this.member()?.is_active) &&
      this.copies().length > 0 &&
      this.copies().length + (this.member()?.active_loan_count ?? 0) <= 3
    );
  }
  protected checkout() {
    const m = this.member();
    if (!m || !this.canCheckout()) return;
    const idempotencyKey = this.checkoutKey() ?? crypto.randomUUID();
    this.checkoutKey.set(idempotencyKey);
    this.run(
      this.api.checkout(
        {
          cardNumber: m.card_number,
          inventoryCodes: this.copies().map((c) => c.inventory_code),
        },
        idempotencyKey,
      ),
      (r) => {
        this.receipt.set(r.data);
        this.message.set('Peminjaman berhasil. Jatuh tempo ditetapkan oleh database.');
        this.copies.set([]);
        this.checkoutKey.set(null);
      },
    );
  }
  protected startNextCheckout() {
    this.member.set(null);
    this.copies.set([]);
    this.receipt.set(null);
    this.checkoutKey.set(null);
    this.memberCode.reset();
    this.bookCode.reset();
    this.message.set('Siap untuk transaksi berikutnya.');
    queueMicrotask(() => this.memberInput()?.nativeElement.focus());
  }
  protected returnBook() {
    if (this.returnForm.invalid) return;
    this.run(
      this.api.returnBook(this.returnForm.getRawValue()),
      (r) => {
        this.returnResult.set(r.data);
        this.message.set('Pengembalian berhasil dicatat.');
        this.returnForm.controls.inventoryCode.reset();
        queueMicrotask(() => this.returnInput()?.nativeElement.focus());
      },
      () => this.returnInput()?.nativeElement.focus(),
    );
  }
  protected loadReservations() {
    this.run(this.api.reservations(), (r) => this.reservations.set(r.data));
  }
  protected approve(item: Reservation) {
    const code =
      window.prompt('Kode inventaris (kosongkan agar sistem memilih copy tersedia):')?.trim() ||
      undefined;
    this.run(this.api.approveReservation(item.id, code), () => {
      this.message.set('Reservasi disetujui dan copy dialokasikan.');
      this.loadReservations();
    });
  }
  protected convert(item: Reservation) {
    const code =
      item.book_copies?.inventory_code ??
      window.prompt('Scan/masukkan kode inventaris untuk loan:')?.trim();
    if (!code) return;
    const keys = this.reservationCheckoutKeys();
    const idempotencyKey = keys[item.id] ?? crypto.randomUUID();
    this.reservationCheckoutKeys.update((current) => ({
      ...current,
      [item.id]: idempotencyKey,
    }));
    this.run(this.api.convertReservation(item.id, code, idempotencyKey), (r) => {
      this.receipt.set(r.data);
      this.message.set('Reservasi dikonversi menjadi peminjaman.');
      this.reservationCheckoutKeys.update((current) => {
        const { [item.id]: _completed, ...pending } = current;
        return pending;
      });
      this.loadReservations();
    });
  }
  protected reject(item: Reservation) {
    const reason = window.prompt('Alasan penolakan (wajib):')?.trim();
    if (!reason) return;
    this.run(this.api.rejectReservation(item.id, reason), () => {
      this.message.set('Reservasi ditolak.');
      this.loadReservations();
    });
  }
  protected loadFines() {
    this.run(this.api.fines('unpaid'), (r) => {
      this.fines.set(r.data);
      this.api
        .fines('partial')
        .subscribe((p) => this.fines.update((items) => [...items, ...p.data]));
    });
  }
  protected pay(fine: Fine) {
    const remaining = fine.amount - fine.paid_amount;
    const raw = window.prompt(`Jumlah pembayaran (maksimal ${remaining}):`, String(remaining));
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.run(this.api.payFine(fine.id, amount, 'cash'), (r) => {
      this.paymentReceipt.set(r.data);
      this.message.set('Pembayaran denda tersimpan.');
      this.loadFines();
    });
  }
  protected recordVisit() {
    const code = this.visitCode.value.trim();
    if (!code) return;
    this.run(
      this.api.recordVisit(code),
      (r) => {
        this.message.set(`Kunjungan ${r.data.member.full_name} tercatat.`);
        this.visitCode.reset();
        queueMicrotask(() => this.visitInput()?.nativeElement.focus());
      },
      () => this.visitInput()?.nativeElement.focus(),
    );
  }
  protected recordGroupVisit() {
    if (this.groupVisitForm.invalid) return;
    const v = this.groupVisitForm.getRawValue();
    this.run(this.api.recordGroupVisit({ ...v, studyGroupId: v.studyGroupId || undefined }), () => {
      this.message.set('Kunjungan rombongan tercatat.');
      this.groupVisitForm.controls.teacherName.reset();
    });
  }
  protected runMaintenance() {
    this.run(this.api.maintenance(), (r) =>
      this.message.set(
        `${r.data.overdue_items_marked} item ditandai overdue; ${r.data.reservations_expired} reservasi diakhiri.`,
      ),
    );
  }
  protected print() {
    window.print();
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
  private run<T>(
    request: import('rxjs').Observable<T>,
    next: (value: T) => void,
    focusAfterError?: () => void,
  ) {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next,
      error: () => {
        this.message.set('Operasi gagal. Input tetap tersimpan; periksa pesan lalu coba lagi.');
        queueMicrotask(() => focusAfterError?.());
      },
    });
  }
}
