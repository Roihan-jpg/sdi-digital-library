import { Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { roleHomePath } from '../../../../core/auth/auth.models';

@Component({
  selector: 'sdi-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
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
  protected readonly loginSucceeded = signal(false);
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

  protected isValidAndTouched(controlName: LoginFieldKey): boolean {
    const control = this.form.controls[controlName];
    return control.valid && (control.touched || this.submitted());
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

      // Briefly show a success state before navigating away.
      this.loginSucceeded.set(true);
      await wait(700);
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
