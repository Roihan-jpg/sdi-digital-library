import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { roleHomePath } from '../../../../core/auth/auth.models';

@Component({
  selector: 'sdi-change-password-page',
  imports: [ReactiveFormsModule],
  template: `
    <main class="password-shell">
      <form [formGroup]="form" (ngSubmit)="save()" class="password-card" novalidate>
        <p class="eyebrow">Keamanan akun</p>
        <h1>Buat kata sandi baru</h1>
        <p>
          Kata sandi minimal 12 karakter dan memuat huruf besar, huruf kecil, angka, serta simbol.
        </p>
        @if (error()) {
          <div class="notice" role="alert">{{ error() }}</div>
        }
        <label
          ><span>Kata sandi baru</span
          ><input type="password" formControlName="password" autocomplete="new-password"
        /></label>
        <label
          ><span>Ulangi kata sandi</span
          ><input type="password" formControlName="confirmation" autocomplete="new-password"
        /></label>
        <button class="button" type="submit" [disabled]="saving()">
          {{ saving() ? 'Menyimpan...' : 'Simpan kata sandi' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #f3f0e8;
    }
    .password-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .password-card {
      width: min(100%, 480px);
      background: white;
      border-top: 6px solid #d79224;
      padding: clamp(28px, 6vw, 48px);
      box-shadow: 0 20px 60px #0c274022;
    }
    .eyebrow {
      color: #a5660b;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
    }
    h1 {
      color: #102f4d;
      margin: 0.4rem 0;
    }
    label {
      display: grid;
      gap: 7px;
      margin: 18px 0;
      font-weight: 700;
      color: #18354e;
    }
    input {
      padding: 12px;
      border: 1px solid #aeb8c0;
      border-radius: 4px;
      font: inherit;
    }
    .button {
      width: 100%;
      margin-top: 10px;
      padding: 13px;
      border: 0;
      background: #123a5d;
      color: white;
      font-weight: 800;
    }
    .button:disabled {
      opacity: 0.6;
    }
    .notice {
      padding: 12px;
      background: #fff0ed;
      border-left: 4px solid #b23b2c;
      color: #7b271e;
    }
  `,
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(12),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
      ],
    }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected async save(): Promise<void> {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Kata sandi belum memenuhi ketentuan.');
      return;
    }
    const { password, confirmation } = this.form.getRawValue();
    if (password !== confirmation) {
      this.error.set('Konfirmasi kata sandi tidak sama.');
      return;
    }
    this.saving.set(true);
    try {
      const context = await this.auth.changePassword(password);
      await this.router.navigateByUrl(roleHomePath(context.profile.role));
    } catch {
      this.error.set('Kata sandi belum dapat disimpan. Coba kembali.');
    } finally {
      this.saving.set(false);
    }
  }
}
