import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import type { CurrentAuthContext } from './auth.models';
import { AuthStore } from './auth.store';
import { SUPABASE_CLIENT } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
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
      } catch {
        localStorage.removeItem(this.localTokenKey);
        this.authStore.setAnonymous();
      }
    } else {
      const { data, error } = await this.supabase.auth.getSession();
      if (error || !data.session) this.authStore.setAnonymous();
      else {
        try {
          await this.synchronizeSession(data.session);
        } catch {
          this.authStore.setAnonymous();
        }
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
    } catch {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error('Username atau kata sandi tidak benar.');
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
    } catch {
      this.authStore.setAnonymous();
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
    try {
      const response = await firstValueFrom(this.authApi.getCurrentContext(accessToken));
      this.authStore.setSession({ access_token: accessToken } as Session, response.data);
      return response.data;
    } catch (error) {
      if (localStorage.getItem(this.localTokenKey) === accessToken)
        localStorage.removeItem(this.localTokenKey);
      else await this.supabase.auth.signOut({ scope: 'local' });
      this.authStore.setAnonymous();
      throw error;
    }
  }
}
