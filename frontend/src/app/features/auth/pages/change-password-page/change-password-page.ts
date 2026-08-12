import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { roleHomePath } from '../../../../core/auth/auth.models';
import { AppThemeService } from '../../../../core/theme/app-theme.service';

@Component({
  selector: 'sdi-change-password-page',
  imports: [ReactiveFormsModule],
  host: {
    '[class.password-theme--dark]': 'dashboardTheme.isDark()',
  },
  template: `
    <main class="password-shell">
      <form [formGroup]="form" (ngSubmit)="save()" class="password-card" novalidate>
        <p class="eyebrow">Keamanan akun</p>
        <h1>Buat kata sandi baru</h1>
        <p>Kata sandi minimal 8 karakter dan memuat huruf besar, huruf kecil, serta angka.</p>
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
      min-height: 100dvh;
      --color-canvas: #faf7f2;
      --color-surface: #fffdf9;
      --color-text: #34413e;
      --color-text-muted: #697672;
      --color-border: #e8e0d6;
      --color-border-strong: #b9dcd7;
      --color-brand-700: #518f88;
      --color-brand-800: #477f79;
      --color-action-primary: #477f79;
      --color-action-primary-hover: #396a65;
      --color-text-inverse: #fff;
      --color-error: #944848;
      --color-error-surface: #f8e4e4;
      --focus-ring: rgb(105 175 167 / 18%);
      background:
        radial-gradient(circle at 15% 8%, rgb(221 237 234 / 90%), transparent 24rem),
        var(--color-canvas);
      color: var(--color-text);
    }
    :host.password-theme--dark {
      color-scheme: dark;
      --color-canvas: #17211f;
      --color-surface: #1f2b28;
      --color-text: #f7f3ed;
      --color-text-muted: #c2cdc9;
      --color-border: #344641;
      --color-border-strong: #46625c;
      --color-brand-700: #9bd0ca;
      --color-brand-800: #addcd7;
      --color-action-primary: #9bd0ca;
      --color-action-primary-hover: #addcd7;
      --color-text-inverse: #263a36;
      --color-error: #eba6a6;
      --color-error-surface: #432a2a;
      --focus-ring: rgb(155 208 202 / 24%);
      background:
        radial-gradient(circle at 15% 8%, rgb(61 116 109 / 24%), transparent 24rem),
        var(--color-canvas);
    }
    .password-shell {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: var(--space-6);
    }
    .password-card {
      width: min(100%, 480px);
      padding: clamp(1.75rem, 6vw, 3rem);
      border: 1px solid var(--color-border);
      border-top: 6px solid var(--color-brand-700);
      border-radius: var(--radius-xl);
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: 0 16px 40px rgb(74 102 96 / 9%);
    }
    .eyebrow {
      color: var(--color-brand-800);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
    }
    h1 {
      color: var(--color-text);
      margin: 0.4rem 0;
    }
    label {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-4) 0;
      font-weight: 700;
      color: var(--color-text);
    }
    input {
      min-height: var(--control-height);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
    }
    input:focus {
      border-color: var(--color-brand-700);
      outline: 0;
      box-shadow: 0 0 0 3px var(--focus-ring);
    }
    .button {
      width: 100%;
      margin-top: 10px;
      font-weight: 700;
    }
    .button:disabled {
      opacity: 0.6;
    }
    .notice {
      padding: var(--space-3);
      border-left: 4px solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-error);
    }
  `,
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly dashboardTheme = inject(AppThemeService);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
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
