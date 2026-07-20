import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { roleHomePath } from '../../../../core/auth/auth.models';

@Component({
  selector: 'sdi-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page login">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <p class="eyebrow">Akses akun</p>
        <h1>Masuk ke SDI Digital Library</h1>
        <p class="intro">Gunakan akun yang telah didaftarkan oleh pengelola perpustakaan.</p>

        @if (errorMessage()) {
          <div class="form-error" role="alert">{{ errorMessage() }}</div>
        }

        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          autocomplete="email"
          [attr.aria-invalid]="showEmailError()"
          [attr.aria-describedby]="showEmailError() ? 'email-error' : null"
        />
        @if (showEmailError()) {
          <small id="email-error" class="field-error">Masukkan alamat email yang valid.</small>
        }

        <label for="password">Kata sandi</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          [attr.aria-invalid]="showPasswordError()"
          [attr.aria-describedby]="showPasswordError() ? 'password-error' : null"
        />
        @if (showPasswordError()) {
          <small id="password-error" class="field-error">Kata sandi minimal 6 karakter.</small>
        }

        <button class="button" type="submit" [disabled]="isSubmitting()">
          {{ isSubmitting() ? 'Memeriksa akun…' : 'Masuk' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .login {
      display: grid;
      place-items: center;
      min-height: 65dvh;
    }
    .card {
      width: min(30rem, 100%);
      padding: 2rem;
      border: 1px solid #d3dfd7;
      border-radius: 1rem;
      background: #fff;
      box-shadow: 0 1rem 3rem rgb(23 107 67 / 8%);
    }
    h1 {
      margin-top: 0;
    }
    .intro {
      margin-bottom: 1.5rem;
      color: #506158;
      line-height: 1.6;
    }
    label {
      display: block;
      margin: 1rem 0 0.4rem;
      font-weight: 700;
    }
    input {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid #9caf9f;
      border-radius: 0.5rem;
    }
    input[aria-invalid='true'] {
      border-color: #b42318;
    }
    .button {
      width: 100%;
      margin-top: 1.5rem;
    }
    .button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .form-error {
      padding: 0.75rem;
      border: 1px solid #b42318;
      border-radius: 0.5rem;
      background: #fff0ee;
      color: #7a271a;
    }
    .field-error {
      display: block;
      margin-top: 0.35rem;
      color: #b42318;
    }
  `,
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const context = await this.authService.login(
        this.form.controls.email.value.trim(),
        this.form.controls.password.value,
      );
      const requestedRedirect = this.route.snapshot.queryParamMap.get('redirect');
      const target = isSafeInternalRedirect(requestedRedirect)
        ? requestedRedirect
        : roleHomePath(context.profile.role);
      await this.router.navigateByUrl(target);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Login gagal. Silakan coba kembali.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

function isSafeInternalRedirect(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//');
}
