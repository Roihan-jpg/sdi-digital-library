import { Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { roleHomePath } from '../../../../core/auth/auth.models';

@Component({
  selector: 'sdi-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page login" aria-labelledby="login-title">
      <form
        class="card card--indexed login-card"
        [formGroup]="form"
        (ngSubmit)="submit()"
        [attr.aria-describedby]="formDescriptionIds()"
        novalidate
      >
        <div class="login-card__header">
          <p class="eyebrow">Akses akun</p>
          <h1 id="login-title">Masuk ke SDI Digital Library</h1>
          <p id="login-intro" class="intro">
            Gunakan akun yang telah didaftarkan oleh pengelola perpustakaan.
          </p>
        </div>

        @if (errorMessage()) {
          <div id="login-auth-error" class="form-error" role="alert" tabindex="-1">
            <strong>Login gagal.</strong>
            <p>{{ errorMessage() }}</p>
          </div>
        }

        @if (submitted() && invalidFields().length) {
          <div id="login-error-summary" class="form-error" role="alert" tabindex="-1">
            <strong>Periksa {{ invalidFields().length }} field.</strong>
            <p>Lengkapi data yang ditandai sebelum masuk.</p>
            <ul>
              @for (field of invalidFields(); track field.id) {
                <li>
                  <a [href]="'#' + field.id" (click)="focusField($event, field.id)">
                    {{ field.label }}
                  </a>
                </li>
              }
            </ul>
          </div>
        }

        <div class="field">
          <label class="field__label" for="email">Email <span aria-hidden="true">*</span></label>
          <input
            id="email"
            name="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            inputmode="email"
            spellcheck="false"
            required
            [attr.aria-invalid]="isInvalid('email')"
            aria-describedby="email-hint email-error"
          />
          <span id="email-hint" class="field__hint">Pakai email akun perpustakaan sekolah.</span>
          @if (showEmailError()) {
            <p id="email-error" class="validation-message">Masukkan alamat email yang valid.</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="password"
            >Kata sandi <span aria-hidden="true">*</span></label
          >
          <span class="password-control">
            <input
              id="password"
              name="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              required
              [attr.aria-invalid]="isInvalid('password')"
              aria-describedby="password-hint password-error"
            />
            <button
              class="password-toggle"
              type="button"
              aria-controls="password"
              [attr.aria-pressed]="showPassword()"
              (click)="togglePasswordVisibility()"
            >
              {{ showPassword() ? 'Sembunyikan' : 'Tampilkan' }}
            </button>
          </span>
          <span id="password-hint" class="field__hint">Minimal 6 karakter.</span>
          @if (showPasswordError()) {
            <p id="password-error" class="validation-message">Kata sandi minimal 6 karakter.</p>
          }
        </div>

        <p id="login-access-note" class="access-note">
          Untuk master admin, kepala perpustakaan, petugas, member, dan guest yang memiliki akun.
        </p>

        <button
          class="button login-submit"
          type="submit"
          [disabled]="isSubmitting()"
          [attr.aria-busy]="isSubmitting()"
        >
          <span>{{ isSubmitting() ? 'Memeriksa akun...' : 'Masuk' }}</span>
        </button>
      </form>
    </section>
  `,
  styles: `
    .login {
      display: flex;
      justify-content: center;
      min-height: 65dvh;
    }

    .login-card {
      width: min(var(--container-reading), calc(100vw - 2 * var(--page-gutter)));
      align-self: center;
      display: grid;
      gap: var(--space-5);
      padding: var(--space-6);
    }

    .login-card__header {
      display: grid;
      gap: var(--space-2);
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      max-width: 15ch;
      font-family: var(--font-family-display);
      font-size: var(--text-3xl);
      line-height: var(--leading-tight);
      text-wrap: balance;
    }

    .intro {
      max-width: var(--content-measure);
      color: var(--color-text-muted);
    }

    .form-error {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3);
      border: var(--border-width) solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-surface);
      color: var(--color-danger-strong);
    }

    .form-error ul {
      margin: 0;
      padding-inline-start: var(--space-5);
    }

    .form-error a {
      color: inherit;
      font-weight: var(--weight-bold);
    }

    .password-control {
      position: relative;
      display: block;
    }

    .password-control input {
      padding-inline-end: 7.75rem;
    }

    .password-toggle {
      position: absolute;
      inset-block: var(--space-1);
      inset-inline-end: var(--space-1);
      min-width: 6.75rem;
      min-height: calc(var(--control-height) - 2 * var(--space-1));
      padding-inline: var(--space-3);
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-sm);
      background: var(--color-brand-50);
      color: var(--color-brand-800);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      cursor: pointer;
      touch-action: manipulation;
      transition:
        background-color var(--duration-fast) var(--ease-standard),
        color var(--duration-fast) var(--ease-standard);
    }

    .password-toggle:hover {
      background: var(--color-brand-100);
      color: var(--color-brand-950);
    }

    .access-note {
      padding-block-start: var(--space-1);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    .login-submit {
      width: 100%;
      gap: var(--space-2);
    }

    @media (max-width: 36rem) {
      .login-card {
        padding: var(--space-4);
      }

      h1 {
        font-size: var(--text-2xl);
      }

      .password-control input {
        padding-inline-end: 6.75rem;
      }

      .password-toggle {
        min-width: 5.75rem;
        padding-inline: var(--space-2);
      }
    }
  `,
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
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

  protected isInvalid(controlName: LoginFieldKey): 'true' | null {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted()) ? 'true' : null;
  }

  protected invalidFields(): LoginField[] {
    if (!this.submitted()) return [];
    return loginFields.filter((field) => this.form.controls[field.key].invalid);
  }

  protected formDescriptionIds(): string {
    const ids = ['login-intro', 'login-access-note'];
    if (this.errorMessage()) ids.push('login-auth-error');
    if (this.submitted() && this.invalidFields().length) ids.push('login-error-summary');
    return ids.join(' ');
  }

  protected focusField(event: Event, fieldId: string): void {
    event.preventDefault();
    this.focusElementById(fieldId);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);
    if (this.isSubmitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
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
      this.focusElementById('login-auth-error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private focusFirstInvalidField(): void {
    const firstInvalid = loginFields.find((field) => this.form.controls[field.key].invalid);
    if (firstInvalid) this.focusElementById(firstInvalid.id);
  }

  private focusElementById(id: string): void {
    queueMicrotask(() => {
      const element = this.host.nativeElement.querySelector<HTMLElement>(`#${id}`);
      element?.focus();
    });
  }
}

function isSafeInternalRedirect(value: string | null): value is string {
  return value !== null && value.startsWith('/') && !value.startsWith('//');
}

interface LoginField {
  key: LoginFieldKey;
  id: string;
  label: string;
}

type LoginFieldKey = 'email' | 'password';

const loginFields: LoginField[] = [
  { key: 'email', id: 'email', label: 'Email' },
  { key: 'password', id: 'password', label: 'Kata sandi' },
];
