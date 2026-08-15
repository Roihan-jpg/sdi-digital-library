import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import type { CurrentAuthContext } from './auth.models';
import { AuthStore } from './auth.store';
import { SUPABASE_CLIENT } from './supabase.client';
import { parseApiError } from '../errors/api-error';
import { NotificationService } from '../notifications/notification.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly notifications = inject(NotificationService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private synchronization: { token: string; promise: Promise<CurrentAuthContext> } | null = null;
  private readonly localTokenKey = 'sdi_local_access_token';

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.authStore.setAnonymous();
      return;
    }

    const localToken = localStorage.getItem(this.localTokenKey);
    if (localToken) {
      try {
        await this.loadCurrentContext(localToken);
      } catch (error) {
        await this.handleStoredSessionFailure(error, localToken);
      }
    } else {
      try {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) {
          await this.handleStoredSessionFailure(error);
        } else if (!data.session) this.authStore.setAnonymous();
        else {
          await this.synchronizeSession(data.session);
        }
      } catch (sessionError) {
        await this.handleStoredSessionFailure(sessionError);
      }
    }

    const { data: listener } = this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'INITIAL_SESSION') return;
        queueMicrotask(() => void this.handleAuthChange(session));
      },
    );
    this.destroyRef.onDestroy(() => listener.subscription.unsubscribe());
  }

  async login(email: string, password: string): Promise<CurrentAuthContext> {
    try {
      const local = await firstValueFrom(this.authApi.loginLocal(email, password));
      localStorage.setItem(this.localTokenKey, local.data.accessToken);
      this.authStore.setSession(
        { access_token: local.data.accessToken } as Session,
        local.data.context,
      );
      return local.data.context;
    } catch (localError) {
      const details = parseApiError(localError, 'Login gagal. Silakan coba kembali.');
      if (details.status !== 401 || details.code !== 'INVALID_CREDENTIALS') throw localError;

      const { data, error: providerError } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (providerError || !data.session) {
        if (!providerError || providerError.status === 400 || providerError.status === 401) {
          throw new Error('Username atau kata sandi tidak benar.');
        }
        throw new Error('Layanan autentikasi belum tersedia. Silakan coba kembali.');
      }
      return this.synchronizeSession(data.session);
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.authStore.accessToken()) await firstValueFrom(this.authApi.logout());
    } finally {
      try {
        await this.supabase.auth.signOut({ scope: 'local' });
      } finally {
        if (this.browser) localStorage.removeItem(this.localTokenKey);
        this.authStore.setAnonymous();
      }
    }
  }

  async changePassword(password: string): Promise<CurrentAuthContext> {
    await firstValueFrom(this.authApi.changePassword(password));
    const token = this.authStore.accessToken();
    if (!token) throw new Error('Sesi tidak tersedia. Silakan masuk kembali.');
    return this.loadCurrentContext(token);
  }

  private async handleAuthChange(session: Session | null): Promise<void> {
    if (!session) {
      this.authStore.setAnonymous();
      return;
    }

    try {
      await this.synchronizeSession(session);
    } catch (error) {
      await this.handleStoredSessionFailure(error, session.access_token);
    }
  }

  private async synchronizeSession(session: Session): Promise<CurrentAuthContext> {
    if (this.synchronization?.token === session.access_token) {
      return this.synchronization.promise;
    }

    const promise = this.loadCurrentContext(session.access_token);
    this.synchronization = { token: session.access_token, promise };
    try {
      return await promise;
    } finally {
      if (this.synchronization?.promise === promise) this.synchronization = null;
    }
  }

  private async loadCurrentContext(accessToken: string): Promise<CurrentAuthContext> {
    const response = await firstValueFrom(this.authApi.getCurrentContext(accessToken));
    this.authStore.setSession({ access_token: accessToken } as Session, response.data);
    return response.data;
  }

  private async handleStoredSessionFailure(error: unknown, accessToken?: string): Promise<void> {
    const details = parseApiError(
      error,
      'Sesi belum dapat diverifikasi. Muat ulang halaman untuk mencoba lagi.',
    );
    const shouldDiscard =
      (details.status === 401 && details.code === 'INVALID_ACCESS_TOKEN') || details.status === 403;

    if (shouldDiscard) await this.discardStoredSession(accessToken);
    this.authStore.setAnonymous();

    if (details.status === 401 && details.code === 'INVALID_ACCESS_TOKEN') return;
    this.notifications.showError(details.message, details.requestId);
  }

  private async discardStoredSession(accessToken?: string): Promise<void> {
    if (accessToken && localStorage.getItem(this.localTokenKey) === accessToken) {
      localStorage.removeItem(this.localTokenKey);
      return;
    }
    await this.supabase.auth.signOut({ scope: 'local' });
  }
}
