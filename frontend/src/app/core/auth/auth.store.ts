import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { AuthStatus, CurrentAuthContext } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly statusState = signal<AuthStatus>('initializing');
  private readonly sessionState = signal<Session | null>(null);
  private readonly contextState = signal<CurrentAuthContext | null>(null);

  readonly status = this.statusState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly context = this.contextState.asReadonly();
  readonly accessToken = computed(() => this.sessionState()?.access_token ?? null);
  readonly isAuthenticated = computed(
    () => this.statusState() === 'authenticated' && this.contextState() !== null,
  );
  readonly currentRole = computed(() => this.contextState()?.profile.role ?? null);
  readonly displayName = computed(
    () =>
      this.contextState()?.profile.fullName ??
      this.contextState()?.member?.fullName ??
      this.contextState()?.user.email ??
      'Pengguna',
  );

  setSession(session: Session, context: CurrentAuthContext): void {
    this.sessionState.set(session);
    this.contextState.set(context);
    this.statusState.set('authenticated');
  }

  setAnonymous(): void {
    this.sessionState.set(null);
    this.contextState.set(null);
    this.statusState.set('anonymous');
  }
}
