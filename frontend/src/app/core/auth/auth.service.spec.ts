import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { of, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification.service';
import { AuthApiService } from './auth-api.service';
import type { CurrentAuthContext } from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { SUPABASE_CLIENT } from './supabase.client';

const context: CurrentAuthContext = {
  user: { id: 'profile-1', email: 'admin@example.test' },
  profile: {
    id: 'profile-1',
    role: 'master_admin',
    fullName: 'Admin',
    avatarPath: null,
    isActive: true,
  },
  member: null,
};

describe('AuthService', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('silently clears an expired local session during startup', async () => {
    const { service, store, notifications } = setup({
      getCurrentContext: () =>
        throwError(() => apiError(401, 'INVALID_ACCESS_TOKEN', 'Sesi sudah berakhir.')),
    });
    localStorage.setItem('sdi_local_access_token', 'expired-token');

    await service.initialize();

    expect(localStorage.getItem('sdi_local_access_token')).toBeNull();
    expect(store.status()).toBe('anonymous');
    expect(notifications.current()).toBeNull();
  });

  it('retains a stored token and reports a transient verification failure', async () => {
    const { service, store, notifications } = setup({
      getCurrentContext: () =>
        throwError(() =>
          apiError(
            503,
            'SESSION_LOOKUP_FAILED',
            'Sesi belum dapat diverifikasi. Coba lagi.',
            'request-503',
          ),
        ),
    });
    localStorage.setItem('sdi_local_access_token', 'valid-looking-token');

    await service.initialize();

    expect(localStorage.getItem('sdi_local_access_token')).toBe('valid-looking-token');
    expect(store.status()).toBe('anonymous');
    expect(notifications.current()).toEqual({
      message: 'Sesi belum dapat diverifikasi. Coba lagi.',
      requestId: 'request-503',
    });
  });

  it('continues anonymously when stored Supabase session retrieval fails', async () => {
    const getSession = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    const { service, store, notifications } = setup({}, vi.fn(), getSession);

    await service.initialize();

    expect(store.status()).toBe('anonymous');
    expect(notifications.current()?.message).toContain('Sesi belum dapat diverifikasi');
  });

  it('falls back to Supabase only when local credentials are rejected', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'supabase-token' } as Session },
      error: null,
    });
    const { service, notifications } = setup(
      {
        loginLocal: () =>
          throwError(() =>
            apiError(401, 'INVALID_CREDENTIALS', 'Username atau kata sandi tidak benar.'),
          ),
        getCurrentContext: () => of({ data: context }),
      },
      signInWithPassword,
    );

    await expect(service.login('admin@example.test', 'Password1')).resolves.toEqual(context);
    expect(signInWithPassword).toHaveBeenCalledOnce();
    expect(notifications.current()).toBeNull();
  });

  it('does not mask a backend outage as invalid Supabase credentials', async () => {
    const signInWithPassword = vi.fn();
    const backendError = apiError(
      503,
      'AUTH_PROVIDER_UNAVAILABLE',
      'Layanan autentikasi belum tersedia.',
    );
    const { service } = setup(
      { loginLocal: () => throwError(() => backendError) },
      signInWithPassword,
    );

    await expect(service.login('admin@example.test', 'Password1')).rejects.toBe(backendError);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});

type AuthApiOverrides = Partial<
  Pick<AuthApiService, 'getCurrentContext' | 'loginLocal' | 'logout' | 'changePassword'>
>;

function setup(
  overrides: AuthApiOverrides,
  signInWithPassword = vi.fn(),
  getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
) {
  const authApi: AuthApiOverrides = {
    getCurrentContext: () => of({ data: context }),
    loginLocal: () =>
      of({
        data: {
          accessToken: 'local-token',
          expiresAt: '2099-01-01T00:00:00.000Z',
          context,
        },
      }),
    logout: () => of(undefined),
    changePassword: () => of(undefined),
    ...overrides,
  };
  const supabase = {
    auth: {
      getSession,
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword,
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };

  TestBed.configureTestingModule({
    providers: [
      AuthService,
      AuthStore,
      { provide: AuthApiService, useValue: authApi },
      { provide: SUPABASE_CLIENT, useValue: supabase as unknown as SupabaseClient },
    ],
  });
  return {
    service: TestBed.inject(AuthService),
    store: TestBed.inject(AuthStore),
    notifications: TestBed.inject(NotificationService),
  };
}

function apiError(status: number, code: string, message: string, requestId?: string) {
  return new HttpErrorResponse({
    status,
    error: { error: { code, message, ...(requestId ? { requestId } : {}) } },
  });
}
