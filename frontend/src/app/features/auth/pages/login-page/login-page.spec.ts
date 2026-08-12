import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import type { CurrentAuthContext } from '../../../../core/auth/auth.models';
import { LoginPage } from './login-page';
import { axeViolations } from '../../../../../testing/axe-testing';

describe('LoginPage', () => {
  beforeEach(() => localStorage.setItem('sdi-theme', 'light'));
  afterEach(() => localStorage.clear());
  const context: CurrentAuthContext = {
    user: { id: 'user-1', email: 'petugas@sdi.test' },
    profile: {
      id: 'profile-1',
      role: 'librarian',
      fullName: 'Petugas Perpustakaan',
      avatarPath: null,
      isActive: true,
    },
    member: null,
  };

  async function setup(options?: { login?: ReturnType<typeof vi.fn>; redirect?: string }) {
    const login = options?.login ?? vi.fn(() => Promise.resolve(context));
    const navigateByUrl = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: { login } },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ redirect: options?.redirect ?? null }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return { fixture, login, navigateByUrl };
  }

  it('focuses the first invalid field and shows an accessible error summary', async () => {
    const { fixture, login } = await setup();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    const element = fixture.nativeElement as HTMLElement;
    expect(login).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('email');
    expect(element.querySelector('#login-error-summary')?.textContent).toContain('Periksa 2 field');
    expect(element.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('toggles password visibility without changing the stored form value', async () => {
    const { fixture } = await setup();
    const element = fixture.nativeElement as HTMLElement;
    const password = element.querySelector('#password') as HTMLInputElement;
    const toggle = element.querySelector('.password-toggle') as HTMLButtonElement;

    password.value = 'rahasia1';
    password.dispatchEvent(new Event('input'));
    toggle.click();
    fixture.detectChanges();

    expect(password.type).toBe('text');
    expect(password.value).toBe('rahasia1');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('focuses the authentication error when login fails', async () => {
    const login = vi.fn(() => Promise.reject(new Error('Email atau kata sandi tidak benar.')));
    const { fixture } = await setup({ login });
    fillLoginForm(fixture.nativeElement as HTMLElement);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await Promise.resolve();

    const authError = (fixture.nativeElement as HTMLElement).querySelector(
      '#login-auth-error',
    ) as HTMLElement;
    expect(authError.textContent).toContain('Email atau kata sandi tidak benar.');
    expect(document.activeElement).toBe(authError);
  });

  it('shows loading state without changing the button label width contract', async () => {
    let resolveLogin: (value: CurrentAuthContext) => void = () => undefined;
    const login = vi.fn(
      () =>
        new Promise<CurrentAuthContext>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const { fixture } = await setup({ login });
    fillLoginForm(fixture.nativeElement as HTMLElement);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    const submit = (fixture.nativeElement as HTMLElement).querySelector(
      '.login-submit',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute('aria-busy')).toBe('true');
    expect(submit.textContent).toContain('Memeriksa akun...');

    resolveLogin(context);
    await fixture.whenStable();
  });

  it('redirects to a safe requested path after successful login', async () => {
    const { fixture, navigateByUrl } = await setup({ redirect: '/dashboard/operasional' });
    fillLoginForm(fixture.nativeElement as HTMLElement);

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard/operasional');
  });

  it('provides the shared theme control without changing form state', async () => {
    const { fixture } = await setup();
    fillLoginForm(fixture.nativeElement as HTMLElement);
    const toggle = fixture.nativeElement.querySelector(
      'sdi-theme-toggle button',
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect((fixture.nativeElement.querySelector('#email') as HTMLInputElement).value).toBe(
      'petugas@sdi.test',
    );
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).value).toBe(
      'rahasia1',
    );
  });

  it('presents a logo-focused brand panel without the former 3D book model', async () => {
    const { fixture } = await setup();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.login-books')).toBeNull();
    expect(element.querySelector('.login-access')).toBeNull();
    expect(element.querySelector('.login-stage__mark img')).not.toBeNull();
    expect(element.textContent).toContain('SD Islam Tompokersan');
  });

  it('passes the automated WCAG audit for form, alert region, and theme toggle', async () => {
    const { fixture } = await setup();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  }, 15_000);
});

function fillLoginForm(element: HTMLElement): void {
  const email = element.querySelector('#email') as HTMLInputElement;
  const password = element.querySelector('#password') as HTMLInputElement;
  email.value = 'petugas@sdi.test';
  email.dispatchEvent(new Event('input'));
  password.value = 'rahasia1';
  password.dispatchEvent(new Event('input'));
}
