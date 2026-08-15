import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  FeedbackBanner,
  type FeedbackTone,
} from '../../../../shared/components/feedback-banner/feedback-banner';
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

const SERVICE_TABS = [
  { id: 'checkout', label: 'Peminjaman' },
  { id: 'return', label: 'Pengembalian' },
  { id: 'reservations', label: 'Reservasi' },
  { id: 'fines', label: 'Denda' },
  { id: 'visits', label: 'Kunjungan' },
] as const;

type ServiceTabId = (typeof SERVICE_TABS)[number]['id'];

type OperationDialog =
  | { kind: 'approve'; item: Reservation; title: string; description: string }
  | { kind: 'convert'; item: Reservation; title: string; description: string }
  | { kind: 'reject'; item: Reservation; title: string; description: string }
  | { kind: 'payment'; fine: Fine; title: string; description: string; remaining: number };

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  completed: 'Selesai',
};

const FINE_TYPE_LABELS: Record<string, string> = {
  overdue: 'Terlambat',
  damaged: 'Kerusakan',
  lost: 'Hilang',
  replacement: 'Penggantian',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum lunas',
  partial: 'Sebagian terbayar',
  paid: 'Lunas',
};

const COPY_STATUS_LABELS: Record<string, string> = {
  available: 'Tersedia',
  reserved: 'Dipesan',
  borrowed: 'Dipinjam',
  damaged: 'Rusak',
  lost: 'Hilang',
  maintenance: 'Perawatan',
};

@Component({
  selector: 'sdi-operations-page',
  imports: [ReactiveFormsModule, FeedbackBanner],
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
      <nav
        class="tabs"
        role="tablist"
        aria-label="Jenis layanan"
        aria-describedby="tabs-hint"
        (keydown)="handleTabKey($event)"
      >
        @for (item of tabs; track item.id) {
          <button
            type="button"
            role="tab"
            [id]="tabId(item.id)"
            [class.active]="tab() === item.id"
            [attr.aria-selected]="tab() === item.id"
            [attr.aria-controls]="panelId(item.id)"
            [attr.tabindex]="tab() === item.id ? 0 : -1"
            (click)="selectTab(item.id)"
          >
            {{ item.label }}
          </button>
        }
      </nav>
      <p class="sr-only" id="tabs-hint">
        Gunakan tombol panah kiri dan kanan untuk berpindah layanan.
      </p>
      @if (message()) {
        <sdi-feedback-banner
          [tone]="messageTone()"
          [message]="message()"
          [requestId]="messageRequestId()"
          [dismissible]="true"
          (dismissed)="clearMessage()"
        />
      }

      @switch (tab()) {
        @case ('checkout') {
          <section
            class="tabpanel"
            role="tabpanel"
            [id]="panelId('checkout')"
            [attr.aria-labelledby]="tabId('checkout')"
          >
            <div class="workspace">
              <form class="panel step-panel" (ngSubmit)="scanMember()">
                <div class="step-heading">
                  <span class="step-number" aria-hidden="true">1</span>
                  <div>
                    <h2>Scan kartu member</h2>
                    <p>Mulai dari kartu anggota, kartu pelajar, atau kode member.</p>
                  </div>
                </div>
                <label for="member-scan">Nomor kartu, kartu pelajar, atau kode member</label>
                <div class="scan-row">
                  <input
                    #memberScan
                    id="member-scan"
                    [formControl]="memberCode"
                    name="memberCode"
                    autocomplete="off"
                    inputmode="text"
                    spellcheck="false"
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
              <form class="panel step-panel" (ngSubmit)="scanBook()">
                <div class="step-heading">
                  <span class="step-number" aria-hidden="true">2</span>
                  <div>
                    <h2>Scan eksemplar</h2>
                    <p>Scan satu per satu. Daftar ini menjadi isi transaksi peminjaman.</p>
                  </div>
                </div>
                <label for="book-scan">Kode inventaris / barcode / QR</label>
                <div class="scan-row">
                  <input
                    #bookScan
                    id="book-scan"
                    [formControl]="bookCode"
                    name="bookCode"
                    autocomplete="off"
                    inputmode="text"
                    spellcheck="false"
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
                  } @empty {
                    <li class="empty-row">Belum ada buku dipindai untuk transaksi ini.</li>
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
                  <caption>
                    Daftar eksemplar pada bukti peminjaman
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Buku</th>
                      <th scope="col">Kode</th>
                      <th scope="col">Jatuh tempo</th>
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
                <div class="receipt-actions">
                  <button class="button button--secondary" type="button" (click)="print()">
                    Cetak bukti
                  </button>
                  <button class="button" type="button" (click)="startNextCheckout()">
                    Transaksi berikutnya
                  </button>
                </div>
              </article>
            }
          </section>
        }
        @case ('return') {
          <section
            class="tabpanel"
            role="tabpanel"
            [id]="panelId('return')"
            [attr.aria-labelledby]="tabId('return')"
          >
            <form class="panel compact" [formGroup]="returnForm" (ngSubmit)="returnBook()">
              <h2>Pengembalian</h2>
              <label for="return-code">Scan kode inventaris</label
              ><input
                #returnScan
                id="return-code"
                formControlName="inventoryCode"
                name="returnInventoryCode"
                autocomplete="off"
                inputmode="text"
                spellcheck="false"
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
                <p>Status eksemplar: {{ copyStatusLabel(returnResult()!.copy_status) }}</p>
              </article>
            }
          </section>
        }
        @case ('reservations') {
          <section
            class="panel tabpanel"
            role="tabpanel"
            [id]="panelId('reservations')"
            [attr.aria-labelledby]="tabId('reservations')"
          >
            <div class="section-heading">
              <h2>Reservasi aktif</h2>
              <button
                class="button button--secondary"
                type="button"
                [disabled]="reservationsLoading()"
                (click)="loadReservations()"
              >
                {{ reservationsLoading() ? 'Memuat...' : 'Muat ulang' }}
              </button>
            </div>
            <div class="table-wrap">
              <table>
                <caption>
                  Reservasi yang perlu diproses petugas
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Nomor</th>
                    <th scope="col">Member</th>
                    <th scope="col">Judul</th>
                    <th scope="col">Status / batas</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  @if (reservationsLoading()) {
                    <tr>
                      <td class="state-cell" colspan="5">Memuat reservasi aktif...</td>
                    </tr>
                  } @else if (reservationsError()) {
                    <tr>
                      <td class="state-cell state-cell--error" colspan="5">
                        {{ reservationsError() }}
                        <button type="button" (click)="loadReservations()">Coba lagi</button>
                      </td>
                    </tr>
                  } @else {
                    @for (item of reservations(); track item.id) {
                      <tr>
                        <td>{{ item.reservation_number }}</td>
                        <td>{{ item.members?.full_name }}</td>
                        <td>{{ item.book_titles?.title }}</td>
                        <td>
                          <span class="badge">{{ reservationStatusLabel(item.status) }}</span
                          ><br /><small>{{ formatDate(item.expires_at) }}</small>
                        </td>
                        <td class="actions">
                          @if (item.status === 'pending') {
                            <button type="button" (click)="approve(item)">Setujui</button>
                          }
                          @if (item.status === 'pending' || item.status === 'approved') {
                            <button type="button" (click)="convert(item)">Jadikan peminjaman</button
                            ><button type="button" (click)="reject(item)">Tolak</button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="state-cell" colspan="5">
                          Tidak ada reservasi aktif yang perlu diproses.
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
        @case ('fines') {
          <section
            class="panel tabpanel"
            role="tabpanel"
            [id]="panelId('fines')"
            [attr.aria-labelledby]="tabId('fines')"
          >
            <div class="section-heading">
              <h2>Tagihan belum lunas</h2>
              <button
                class="button button--secondary"
                type="button"
                [disabled]="finesLoading()"
                (click)="loadFines()"
              >
                {{ finesLoading() ? 'Memuat...' : 'Muat ulang' }}
              </button>
            </div>
            <div class="table-wrap">
              <table>
                <caption>
                  Tagihan dengan status belum lunas atau sebagian terbayar
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Tagihan</th>
                    <th scope="col">Terbayar</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  @if (finesLoading()) {
                    <tr>
                      <td class="state-cell" colspan="5">Memuat tagihan belum lunas...</td>
                    </tr>
                  } @else if (finesError()) {
                    <tr>
                      <td class="state-cell state-cell--error" colspan="5">
                        {{ finesError() }}
                        <button type="button" (click)="loadFines()">Coba lagi</button>
                      </td>
                    </tr>
                  } @else {
                    @for (fine of fines(); track fine.id) {
                      <tr>
                        <td>{{ fine.members?.full_name }}</td>
                        <td>{{ fineTypeLabel(fine.fine_type) }}</td>
                        <td class="number">{{ rupiah(fine.amount) }}</td>
                        <td class="number">{{ rupiah(fine.paid_amount) }}</td>
                        <td><button type="button" (click)="pay(fine)">Bayar</button></td>
                      </tr>
                    } @empty {
                      <tr>
                        <td class="state-cell" colspan="5">
                          Tidak ada tagihan belum lunas pada saat ini.
                        </td>
                      </tr>
                    }
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
                {{ paymentStatusLabel(paymentReceipt()!.status) }}
              </p>
              <button class="button button--secondary" type="button" (click)="print()">
                Cetak bukti
              </button>
            </article>
          }
        }
        @case ('visits') {
          <section
            class="tabpanel"
            role="tabpanel"
            [id]="panelId('visits')"
            [attr.aria-labelledby]="tabId('visits')"
          >
            <div class="workspace">
              <form class="panel" (ngSubmit)="recordVisit()">
                <h2>Kunjungan individu</h2>
                <label for="visit-card">Scan kartu anggota</label>
                <div class="scan-row">
                  <input
                    #visitScan
                    id="visit-card"
                    [formControl]="visitCode"
                    name="visitCode"
                    autocomplete="off"
                    inputmode="text"
                    spellcheck="false"
                  /><button class="button" [disabled]="busy()">Catat</button>
                </div>
                <p>
                  Siswa individual wajib menggunakan kartu; input manual ini hanya fallback untuk
                  kode pada kartu yang sulit terbaca.
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
          </section>
        }
      }
      @if (dialog(); as activeDialog) {
        <div class="dialog-backdrop" (click)="closeDialog()" (keydown.escape)="closeDialog()">
          <form
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="operation-dialog-title"
            aria-describedby="operation-dialog-description"
            (click)="$event.stopPropagation()"
            (keydown)="trapDialogFocus($event)"
            (ngSubmit)="submitDialog()"
          >
            <div class="dialog-header">
              <div>
                <p class="eyebrow">Tindakan layanan</p>
                <h2 id="operation-dialog-title">{{ activeDialog.title }}</h2>
              </div>
              <button
                class="button button--secondary button--icon"
                type="button"
                aria-label="Tutup dialog"
                (click)="closeDialog()"
              >
                X
              </button>
            </div>
            <p id="operation-dialog-description">{{ activeDialog.description }}</p>

            @if (activeDialog.kind === 'approve' || activeDialog.kind === 'convert') {
              <label for="dialog-inventory-code">
                Kode inventaris
                @if (activeDialog.kind === 'approve') {
                  <span class="helper">Opsional untuk persetujuan reservasi.</span>
                } @else {
                  <span class="helper">Wajib untuk membuat peminjaman dari reservasi.</span>
                }
              </label>
              <input
                #dialogInput
                id="dialog-inventory-code"
                [formControl]="dialogInventoryCode"
                name="dialogInventoryCode"
                autocomplete="off"
                inputmode="text"
                spellcheck="false"
              />
            }

            @if (activeDialog.kind === 'reject') {
              <label for="dialog-reason">
                Alasan penolakan
                <span class="helper">Tulis alasan singkat yang dapat dipahami member.</span>
              </label>
              <textarea
                #dialogInput
                id="dialog-reason"
                [formControl]="dialogReason"
                name="dialogReason"
                rows="4"
              ></textarea>
            }

            @if (activeDialog.kind === 'payment') {
              <label for="dialog-payment-amount">
                Jumlah pembayaran
                <span class="helper">Sisa tagihan {{ rupiah(activeDialog.remaining) }}.</span>
              </label>
              <input
                #dialogInput
                id="dialog-payment-amount"
                type="number"
                min="1"
                [max]="activeDialog.remaining"
                [formControl]="dialogPaymentAmount"
                name="dialogPaymentAmount"
                inputmode="numeric"
              />
            }

            @if (dialogError()) {
              <p class="dialog-error" role="alert">{{ dialogError() }}</p>
            }

            <div class="dialog-actions">
              <button class="button button--secondary" type="button" (click)="closeDialog()">
                Batal
              </button>
              <button class="button" type="submit" [disabled]="busy()">
                {{ busy() ? 'Memproses...' : 'Simpan' }}
              </button>
            </div>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .operations {
      width: min(var(--container-wide), calc(100% - 2 * var(--page-gutter)));
      margin: 0 auto;
      padding: var(--space-8) 0;
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
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .tabpanel {
      margin-top: var(--space-4);
    }
    .tabs {
      display: flex;
      gap: var(--space-2);
      overflow: auto;
      margin: var(--space-6) 0 var(--space-2);
      padding-block: var(--space-1) var(--space-3);
      border-bottom: var(--border-width) solid var(--color-border);
      scrollbar-width: thin;
    }
    .tabs button,
    .actions button,
    td button,
    .scan-list button {
      min-height: var(--control-height);
      min-width: var(--control-height);
      border: var(--border-width) solid var(--color-border-strong);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      padding: 0.65rem var(--space-4);
      color: var(--color-brand-950);
      cursor: pointer;
      white-space: nowrap;
      touch-action: manipulation;
    }
    .tabs button.active {
      border-color: var(--color-brand-800);
      background: var(--color-brand-800);
      color: var(--color-text-inverse);
      box-shadow: inset 0 -4px 0 var(--color-accent);
    }
    .notice {
      padding: 0.8rem 1rem;
      background: var(--color-info-surface);
      border-left: var(--border-width-accent) solid var(--color-info);
      border-radius: var(--radius-md);
    }
    .workspace {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
    @media (min-width: 64rem) {
      .workspace {
        grid-template-columns: repeat(2, minmax(20rem, 1fr));
      }
    }
    .panel,
    .receipt {
      padding: 1.2rem;
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
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
    .step-panel {
      border-top: var(--border-width-accent) solid var(--color-brand-700);
    }
    .step-heading {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .step-heading h2 {
      margin-bottom: var(--space-1);
    }
    .step-heading p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .step-number {
      display: inline-grid;
      width: 2rem;
      height: 2rem;
      flex: 0 0 auto;
      place-items: center;
      border-radius: var(--radius-pill);
      background: var(--color-brand-100);
      color: var(--color-brand-950);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
    }
    .scan-row {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }
    .scan-row input {
      flex: 1;
    }
    input,
    select,
    textarea {
      width: 100%;
      padding: 0.72rem;
      min-height: var(--control-height);
      border: var(--border-width) solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    .summary {
      display: grid;
      gap: 0.2rem;
      margin-top: 1rem;
      padding: 1rem;
      background: var(--color-success-surface);
      border-left: var(--border-width-accent) solid var(--color-success);
      border-radius: var(--radius-md);
    }
    .summary.warning {
      background: var(--color-error-surface);
      border-left-color: var(--color-error);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 1.75rem;
      width: fit-content;
      border-radius: var(--radius-pill);
      padding: 0 var(--space-3);
      background: var(--color-success-surface);
      color: var(--color-success);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }
    .badge--danger {
      background: var(--color-error-surface);
      color: var(--color-error);
    }
    .code,
    .scan-list strong,
    td:nth-child(2) {
      font-family: var(--font-family-data);
      font-variant-numeric: tabular-nums;
    }
    .number {
      font-variant-numeric: tabular-nums;
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
      border-bottom: var(--border-width) solid var(--color-border);
    }
    .empty-row {
      color: var(--color-text-muted);
      background: var(--color-neutral-surface);
      border: var(--border-width) dashed var(--color-border);
      border-radius: var(--radius-md);
    }
    .checkout {
      width: 100%;
    }
    .receipt {
      margin-top: 1rem;
      border-color: var(--color-success);
    }
    .receipt-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }
    caption {
      padding: var(--space-2) 0;
      color: var(--color-text-muted);
      text-align: left;
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
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
      border-bottom: var(--border-width) solid var(--color-border);
      vertical-align: top;
    }
    th {
      background: var(--color-surface-subtle);
      color: var(--color-brand-950);
      font-weight: var(--weight-semibold);
    }
    .state-cell {
      padding: var(--space-6);
      color: var(--color-text-muted);
      text-align: center;
      background: var(--color-neutral-surface);
    }
    .state-cell--error {
      color: var(--color-error);
      background: var(--color-error-surface);
    }
    .state-cell button {
      margin-left: var(--space-3);
    }
    .actions {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-backdrop);
      display: grid;
      place-items: center;
      padding: var(--space-4);
      background: var(--color-overlay);
    }
    .dialog {
      z-index: var(--z-modal);
      display: grid;
      width: min(32rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      gap: var(--space-4);
      padding: var(--space-6);
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--radius-xl);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
    }
    .dialog-header,
    .dialog-actions {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .dialog-header h2 {
      margin-bottom: 0;
    }
    .dialog label {
      display: grid;
      gap: var(--space-2);
      font-weight: var(--weight-semibold);
    }
    .helper {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--weight-regular);
    }
    .dialog-error {
      margin: 0;
      padding: var(--space-3) var(--space-4);
      border-left: var(--border-width-accent) solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-error);
      font-weight: var(--weight-semibold);
    }
    .dialog-actions {
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    @media print {
      .dialog-backdrop,
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
        padding-block: var(--space-4);
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memberInput = viewChild<ElementRef<HTMLInputElement>>('memberScan');
  private readonly bookInput = viewChild<ElementRef<HTMLInputElement>>('bookScan');
  private readonly returnInput = viewChild<ElementRef<HTMLInputElement>>('returnScan');
  private readonly visitInput = viewChild<ElementRef<HTMLInputElement>>('visitScan');
  private readonly dialogInput =
    viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('dialogInput');
  private lastDialogTrigger: HTMLElement | null = null;
  protected readonly tabs = SERVICE_TABS;
  protected readonly tab = signal<ServiceTabId>('checkout');
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly messageTone = signal<FeedbackTone>('info');
  protected readonly messageRequestId = signal<string | undefined>(undefined);
  protected readonly member = signal<MemberLookup | null>(null);
  protected readonly copies = signal<CopyLookup[]>([]);
  protected readonly checkoutKey = signal<string | null>(null);
  protected readonly reservationCheckoutKeys = signal<Record<string, string>>({});
  protected readonly receipt = signal<LoanReceipt | null>(null);
  protected readonly returnResult = signal<ReturnResult | null>(null);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly reservationsLoading = signal(false);
  protected readonly reservationsError = signal('');
  protected readonly fines = signal<Fine[]>([]);
  protected readonly finesLoading = signal(false);
  protected readonly finesError = signal('');
  protected readonly paymentReceipt = signal<PaymentReceipt | null>(null);
  protected readonly dialog = signal<OperationDialog | null>(null);
  protected readonly dialogError = signal('');
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
  protected readonly dialogInventoryCode = new FormControl('', { nonNullable: true });
  protected readonly dialogReason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly dialogPaymentAmount = new FormControl<number | null>(null, {
    validators: [Validators.required, Validators.min(1)],
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

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const linkedTab = this.toTabId(params.get('layanan'));
      if (linkedTab && linkedTab !== this.tab()) {
        this.activateTab(linkedTab, { focus: false, syncUrl: false });
      }
    });
  }

  protected selectTab(id: ServiceTabId) {
    this.activateTab(id, { focus: true, syncUrl: true });
  }

  protected tabId(id: ServiceTabId) {
    return `circulation-tab-${id}`;
  }

  protected panelId(id: ServiceTabId) {
    return `circulation-panel-${id}`;
  }

  protected handleTabKey(event: KeyboardEvent) {
    const currentIndex = this.tabs.findIndex((item) => item.id === this.tab());
    const lastIndex = this.tabs.length - 1;
    const keyTargets: Record<string, number> = {
      ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
      ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
      Home: 0,
      End: lastIndex,
    };
    const nextIndex = keyTargets[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = this.tabs[nextIndex].id;
    this.selectTab(nextTab);
    queueMicrotask(() => globalThis.document?.getElementById(this.tabId(nextTab))?.focus());
  }

  private activateTab(id: ServiceTabId, options: { focus: boolean; syncUrl: boolean }) {
    const changed = this.tab() !== id;
    this.tab.set(id);
    if (changed) {
      this.clearMessage();
      if (id === 'reservations') this.loadReservations();
      if (id === 'fines') this.loadFines();
    }
    if (options.syncUrl) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { layanan: id === 'checkout' ? null : id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    if (options.focus) this.focusPrimaryScanner(id);
  }

  private toTabId(value: string | null): ServiceTabId | null {
    return this.tabs.some((item) => item.id === value) ? (value as ServiceTabId) : null;
  }

  private focusPrimaryScanner(id: ServiceTabId) {
    if (id === 'checkout') this.focusScanner(this.memberInput);
    if (id === 'return') this.focusScanner(this.returnInput);
    if (id === 'visits') this.focusScanner(this.visitInput);
  }

  private focusScanner(input: () => ElementRef<HTMLInputElement> | undefined) {
    if (!this.shouldAutoFocusScanner()) return;
    queueMicrotask(() => input()?.nativeElement.focus({ preventScroll: true }));
  }

  private shouldAutoFocusScanner() {
    if (!globalThis.matchMedia) return true;
    return globalThis.matchMedia('(pointer: fine) and (min-width: 48rem)').matches;
  }

  private openDialog(dialog: OperationDialog) {
    const activeElement = globalThis.document?.activeElement;
    this.lastDialogTrigger =
      activeElement && 'focus' in activeElement ? (activeElement as HTMLElement) : null;
    this.dialogError.set('');
    this.dialogInventoryCode.reset(
      dialog.kind === 'convert' ? (dialog.item.book_copies?.inventory_code ?? '') : '',
    );
    this.dialogReason.reset('');
    this.dialogPaymentAmount.reset(dialog.kind === 'payment' ? dialog.remaining : null);
    this.dialogPaymentAmount.setValidators(
      dialog.kind === 'payment'
        ? [Validators.required, Validators.min(1), Validators.max(dialog.remaining)]
        : [Validators.required, Validators.min(1)],
    );
    this.dialogPaymentAmount.updateValueAndValidity({ emitEvent: false });
    this.dialog.set(dialog);
    this.focusDialogInput();
  }

  private focusDialogInput() {
    queueMicrotask(() => this.dialogInput()?.nativeElement.focus({ preventScroll: true }));
  }

  protected trapDialogFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const dialogElement = (event.currentTarget as HTMLElement | null)?.closest('.dialog');
    const focusable = Array.from(
      dialogElement?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && globalThis.document?.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && globalThis.document?.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
        this.showMessage(
          r.data.is_active
            ? 'Member siap untuk transaksi.'
            : 'Member tidak aktif dan tidak dapat meminjam.',
          r.data.is_active ? 'success' : 'warning',
        );
        this.focusScanner(this.bookInput);
      },
      () => this.focusScanner(this.memberInput),
    );
  }
  protected scanBook() {
    const code = this.bookCode.value.trim();
    if (!code || !this.member()) return;
    if (this.copies().some((c) => c.inventory_code === code)) {
      this.showMessage('Eksemplar sudah ada di daftar scan.', 'warning');
      this.bookCode.reset();
      this.focusScanner(this.bookInput);
      return;
    }
    this.run(
      this.api.lookupCopy(code),
      (r) => {
        if (r.data.status !== 'available' || !r.data.is_active || r.data.is_reference_only) {
          this.showMessage('Eksemplar tidak tersedia atau tidak boleh dipinjam.', 'warning');
          this.focusScanner(this.bookInput);
          return;
        }
        this.copies.update((items) => [...items, r.data]);
        this.checkoutKey.set(null);
        this.bookCode.reset();
        this.focusScanner(this.bookInput);
      },
      () => this.focusScanner(this.bookInput),
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
        this.showMessage('Peminjaman berhasil. Jatuh tempo ditetapkan oleh database.', 'success');
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
    this.showMessage('Siap untuk transaksi berikutnya.', 'info');
    this.focusScanner(this.memberInput);
  }
  protected returnBook() {
    if (this.returnForm.invalid) return;
    this.run(
      this.api.returnBook(this.returnForm.getRawValue()),
      (r) => {
        this.returnResult.set(r.data);
        this.showMessage('Pengembalian berhasil dicatat.', 'success');
        this.returnForm.controls.inventoryCode.reset();
        this.focusScanner(this.returnInput);
      },
      () => this.focusScanner(this.returnInput),
    );
  }
  protected loadReservations() {
    if (this.reservationsLoading()) return;
    this.reservationsLoading.set(true);
    this.reservationsError.set('');
    this.api
      .reservations()
      .pipe(finalize(() => this.reservationsLoading.set(false)))
      .subscribe({
        next: (r) => {
          this.reservations.set(r.data);
        },
        error: (error) => {
          this.reservationsError.set(this.errorMessage(error));
        },
      });
  }
  protected approve(item: Reservation) {
    this.openDialog({
      kind: 'approve',
      item,
      title: 'Setujui reservasi',
      description: 'Kode inventaris boleh dikosongkan bila sistem yang memilih eksemplar tersedia.',
    });
  }
  protected convert(item: Reservation) {
    this.openDialog({
      kind: 'convert',
      item,
      title: 'Jadikan peminjaman',
      description: 'Masukkan kode inventaris yang akan dipinjam untuk reservasi ini.',
    });
  }
  protected reject(item: Reservation) {
    this.openDialog({
      kind: 'reject',
      item,
      title: 'Tolak reservasi',
      description: 'Alasan penolakan wajib tersimpan agar member memahami keputusan petugas.',
    });
  }
  protected loadFines() {
    if (this.finesLoading()) return;
    this.finesLoading.set(true);
    this.finesError.set('');
    forkJoin([this.api.fines('unpaid'), this.api.fines('partial')])
      .pipe(finalize(() => this.finesLoading.set(false)))
      .subscribe({
        next: ([unpaid, partial]) => {
          this.fines.set([...unpaid.data, ...partial.data]);
        },
        error: (error) => {
          this.finesError.set(this.errorMessage(error));
        },
      });
  }
  protected pay(fine: Fine) {
    const remaining = fine.amount - fine.paid_amount;
    this.openDialog({
      kind: 'payment',
      fine,
      remaining,
      title: 'Catat pembayaran denda',
      description: `Maksimal pembayaran ${this.rupiah(remaining)}. Metode dicatat sebagai tunai.`,
    });
  }
  protected closeDialog() {
    this.dialog.set(null);
    this.dialogError.set('');
    queueMicrotask(() => this.lastDialogTrigger?.focus({ preventScroll: true }));
  }
  protected submitDialog() {
    const dialog = this.dialog();
    if (!dialog || this.busy()) return;
    this.dialogError.set('');

    if (dialog.kind === 'approve') {
      const code = this.dialogInventoryCode.value.trim() || undefined;
      this.runDialog(this.api.approveReservation(dialog.item.id, code), () => {
        this.closeDialog();
        this.showMessage('Reservasi disetujui dan eksemplar dialokasikan.', 'success');
        this.loadReservations();
      });
      return;
    }

    if (dialog.kind === 'convert') {
      const code = this.dialogInventoryCode.value.trim();
      if (!code) {
        this.dialogError.set('Kode inventaris wajib diisi untuk membuat peminjaman.');
        this.focusDialogInput();
        return;
      }
      const keys = this.reservationCheckoutKeys();
      const idempotencyKey = keys[dialog.item.id] ?? crypto.randomUUID();
      this.reservationCheckoutKeys.update((current) => ({
        ...current,
        [dialog.item.id]: idempotencyKey,
      }));
      this.runDialog(this.api.convertReservation(dialog.item.id, code, idempotencyKey), (r) => {
        this.receipt.set(r.data);
        this.closeDialog();
        this.showMessage('Reservasi dikonversi menjadi peminjaman.', 'success');
        this.reservationCheckoutKeys.update((current) => {
          const { [dialog.item.id]: _completed, ...pending } = current;
          return pending;
        });
        this.loadReservations();
      });
      return;
    }

    if (dialog.kind === 'reject') {
      const reason = this.dialogReason.value.trim();
      if (!reason) {
        this.dialogError.set('Alasan penolakan wajib diisi.');
        this.focusDialogInput();
        return;
      }
      this.runDialog(this.api.rejectReservation(dialog.item.id, reason), () => {
        this.closeDialog();
        this.showMessage('Reservasi ditolak.', 'success');
        this.loadReservations();
      });
      return;
    }

    const amount = Number(this.dialogPaymentAmount.value);
    if (!Number.isFinite(amount) || amount <= 0 || amount > dialog.remaining) {
      this.dialogError.set(
        `Jumlah pembayaran harus antara Rp1 dan ${this.rupiah(dialog.remaining)}.`,
      );
      this.focusDialogInput();
      return;
    }
    this.runDialog(this.api.payFine(dialog.fine.id, amount, 'cash'), (r) => {
      this.paymentReceipt.set(r.data);
      this.closeDialog();
      this.showMessage('Pembayaran denda tersimpan.', 'success');
      this.loadFines();
    });
  }
  protected recordVisit() {
    const code = this.visitCode.value.trim();
    if (!code) return;
    this.run(
      this.api.recordVisit(code),
      (r) => {
        this.showMessage(`Kunjungan ${r.data.member.full_name} tercatat.`, 'success');
        this.visitCode.reset();
        this.focusScanner(this.visitInput);
      },
      () => this.focusScanner(this.visitInput),
    );
  }
  protected recordGroupVisit() {
    if (this.groupVisitForm.invalid) return;
    const v = this.groupVisitForm.getRawValue();
    this.run(this.api.recordGroupVisit({ ...v, studyGroupId: v.studyGroupId || undefined }), () => {
      this.showMessage('Kunjungan rombongan tercatat.', 'success');
      this.groupVisitForm.controls.teacherName.reset();
    });
  }
  protected runMaintenance() {
    this.run(this.api.maintenance(), (r) =>
      this.showMessage(
        `${r.data.overdue_items_marked} item ditandai overdue; ${r.data.reservations_expired} reservasi diakhiri.`,
        'success',
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
  protected reservationStatusLabel(value: string) {
    return RESERVATION_STATUS_LABELS[value] ?? value;
  }
  protected fineTypeLabel(value: string) {
    return FINE_TYPE_LABELS[value] ?? value;
  }
  protected paymentStatusLabel(value: string) {
    return PAYMENT_STATUS_LABELS[value] ?? value;
  }
  protected copyStatusLabel(value: string) {
    return COPY_STATUS_LABELS[value] ?? value;
  }
  private run<T>(
    request: import('rxjs').Observable<T>,
    next: (value: T) => void,
    focusAfterError?: () => void,
  ) {
    if (this.busy()) return;
    this.busy.set(true);
    this.clearMessage();
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next,
      error: (error) => {
        const details = parseApiError(error, 'Operasi gagal.');
        this.showMessage(
          focusAfterError
            ? `${details.message} Input tetap tersimpan; periksa pesan lalu coba lagi.`
            : `${details.message} Periksa data lalu coba lagi.`,
          'error',
          details.requestId,
        );
        queueMicrotask(() => focusAfterError?.());
      },
    });
  }

  private runDialog<T>(request: import('rxjs').Observable<T>, next: (value: T) => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.dialogError.set('');
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next,
      error: (error) => {
        this.dialogError.set(this.errorMessage(error));
        this.focusDialogInput();
      },
    });
  }

  private errorMessage(error: unknown) {
    const details = parseApiError(error, 'Operasi gagal. Periksa data lalu coba lagi.');
    return details.requestId
      ? `${details.message} Referensi: ${details.requestId}`
      : details.message;
  }

  protected clearMessage(): void {
    this.message.set('');
    this.messageTone.set('info');
    this.messageRequestId.set(undefined);
  }

  private showMessage(message: string, tone: FeedbackTone, requestId?: string): void {
    this.message.set(message);
    this.messageTone.set(tone);
    this.messageRequestId.set(requestId);
  }
}
