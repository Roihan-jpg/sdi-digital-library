import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
      <div class="notice" [class.error]="failed()">{{ message() }}</div>
    }
    @if (loading()) {
      <div class="panel state">Memuat pengaturan...</div>
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
      gap: 22px;
      color: #18354e;
    }
    .eyebrow {
      color: #a5660b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      margin: 0;
    }
    h1,
    h2 {
      color: #102f4d;
      margin: 0.3rem 0;
    }
    .panel {
      background: #fff;
      border: 1px solid #dce2e5;
      padding: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin: 18px 0 28px;
    }
    label {
      display: grid;
      gap: 7px;
      font-weight: 700;
    }
    .wide {
      grid-column: span 2;
    }
    input,
    textarea {
      font: inherit;
      padding: 11px;
      border: 1px solid #abb8c1;
    }
    button {
      padding: 12px 18px;
      background: #123a5d;
      color: #fff;
      border: 0;
      font-weight: 800;
    }
    .notice {
      padding: 12px;
      border-left: 4px solid #20805d;
      background: #edf8f3;
    }
    .notice.error {
      border-color: #b23b2c;
      background: #fff0ed;
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
    } catch {
      this.show('Pengaturan belum dapat dimuat.', true);
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
    } catch {
      this.show('Pengaturan belum dapat disimpan.', true);
    } finally {
      this.saving.set(false);
    }
  }
  private show(text: string, error: boolean) {
    this.message.set(text);
    this.failed.set(error);
  }
}
