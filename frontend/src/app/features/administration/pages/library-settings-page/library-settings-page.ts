import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { parseApiError } from '../../../../core/errors/api-error';
import {
  AdministrationApiService,
  type LibrarySettings,
} from '../../data-access/administration-api.service';

@Component({
  selector: 'sdi-library-settings-page',
  imports: [ReactiveFormsModule],
  template: ` <section class="page">
    <header>
      <p class="eyebrow">Konfigurasi</p>
      <h1>Pengaturan perpustakaan</h1>
      <p>Aturan sirkulasi dan identitas sekolah yang menjadi sumber kebenaran backend.</p>
    </header>
    @if (message()) {
      <div
        class="notice"
        [class.error]="failed()"
        [attr.role]="failed() ? 'alert' : 'status'"
        aria-atomic="true"
      >
        {{ message() }}
      </div>
    }
    @if (loading()) {
      <div class="panel state" role="status">Memuat pengaturan...</div>
    } @else {
      <form class="panel" [formGroup]="form" (ngSubmit)="save()">
        <h2>Aturan sirkulasi</h2>
        <div class="grid">
          <label
            ><span>Maksimal pinjaman aktif</span
            ><input type="number" formControlName="maxActiveLoans" /></label
          ><label
            ><span>Masa pinjam (hari)</span
            ><input type="number" formControlName="loanPeriodDays" /></label
          ><label
            ><span>Maksimal perpanjangan</span
            ><input type="number" formControlName="maxRenewals" /></label
          ><label
            ><span>Tambahan perpanjangan (hari)</span
            ><input type="number" formControlName="renewalDays" /></label
          ><label
            ><span>Denda per hari (Rp)</span
            ><input type="number" formControlName="overdueFinePerDay" /></label
          ><label
            ><span>Batas pengambilan reservasi (jam)</span
            ><input type="number" formControlName="reservationHoldHours"
          /></label>
        </div>
        <h2>Identitas sekolah</h2>
        <div class="grid">
          <label><span>Nama sekolah</span><input formControlName="schoolName" /></label
          ><label><span>Email</span><input type="email" formControlName="schoolEmail" /></label
          ><label><span>Telepon</span><input formControlName="schoolPhone" /></label
          ><label><span>Zona waktu</span><input formControlName="timezoneName" /></label
          ><label class="wide"
            ><span>Alamat</span><textarea rows="3" formControlName="schoolAddress"></textarea>
          </label>
        </div>
        <button type="submit" [disabled]="saving()">
          {{ saving() ? 'Menyimpan...' : 'Simpan pengaturan' }}
        </button>
      </form>
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
    .eyebrow {
      color: var(--color-brand-800);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      margin: 0;
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
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-4);
      margin: var(--space-4) 0 var(--space-8);
    }
    label {
      display: grid;
      gap: var(--space-2);
      color: var(--color-text);
      font-size: 0.8rem;
      font-weight: 400;
    }
    .wide {
      grid-column: span 2;
    }
    input,
    select,
    textarea {
      font: inherit;
      font-weight: 400;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
    }
    input::placeholder,
    textarea::placeholder {
      font-weight: 400;
      color: var(--color-text-muted);
    }
    button {
      min-height: var(--control-height);
      padding: 0.65rem var(--space-4);
      border: 0;
      border-radius: var(--radius-md);
      background: var(--color-action-primary);
      color: var(--color-text-inverse);
      font-weight: 800;
      cursor: pointer;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--color-accent);
      outline: 0;
      box-shadow: 0 0 0 3px var(--color-focus-outer);
    }
    .notice {
      padding: var(--space-3);
      border-left: 4px solid var(--color-success);
      border-radius: var(--radius-md);
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .notice.error {
      border-color: var(--color-error);
      background: var(--color-error-surface);
      color: var(--color-error);
    }
    .state {
      text-align: center;
    }
    @media (max-width: 800px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .wide {
        grid-column: auto;
      }
    }
    @media (max-width: 560px) {
      .panel {
        padding: var(--space-4);
      }
      .grid {
        gap: var(--space-3);
        margin-bottom: var(--space-6);
      }
    }
  `,
})
export class LibrarySettingsPage {
  private readonly api = inject(AdministrationApiService);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly form = new FormGroup({
    maxActiveLoans: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    loanPeriodDays: new FormControl(7, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    maxRenewals: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    renewalDays: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    overdueFinePerDay: new FormControl(2000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    reservationHoldHours: new FormControl(24, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    currencyCode: new FormControl('IDR', { nonNullable: true }),
    timezoneName: new FormControl('Asia/Jakarta', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    schoolName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    schoolAddress: new FormControl<string | null>(null),
    schoolPhone: new FormControl<string | null>(null),
    schoolEmail: new FormControl<string | null>(null),
    schoolLogoPath: new FormControl<string | null>(null),
  });
  constructor() {
    void this.load();
  }
  private async load() {
    try {
      const result = await firstValueFrom(this.api.getSettings());
      this.form.reset(result.data);
    } catch (error) {
      this.show(apiMessage(error, 'Pengaturan belum dapat dimuat. Muat ulang halaman.'), true);
    } finally {
      this.loading.set(false);
    }
  }
  protected async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.show('Periksa kembali nilai pengaturan.', true);
    }
    this.saving.set(true);
    try {
      const result = await firstValueFrom(
        this.api.updateSettings(this.form.getRawValue() as LibrarySettings),
      );
      this.form.reset(result.data);
      this.show('Pengaturan berhasil disimpan.', false);
    } catch (error) {
      this.show(
        apiMessage(error, 'Pengaturan belum dapat disimpan. Periksa data lalu coba lagi.'),
        true,
      );
    } finally {
      this.saving.set(false);
    }
  }
  private show(text: string, error: boolean) {
    this.message.set(text);
    this.failed.set(error);
  }
}

function apiMessage(error: unknown, fallback: string): string {
  const details = parseApiError(error, fallback);
  return details.requestId ? `${details.message} Referensi: ${details.requestId}` : details.message;
}
