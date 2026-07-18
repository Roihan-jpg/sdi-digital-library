import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

const accessTokenKey = 'sdi.access-token';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly accessTokenState = signal<string | null>(
    this.browser ? sessionStorage.getItem(accessTokenKey) : null,
  );

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenState() !== null);

  setAccessToken(token: string): void {
    this.accessTokenState.set(token);
    if (this.browser) sessionStorage.setItem(accessTokenKey, token);
  }

  clearSession(): void {
    this.accessTokenState.set(null);
    if (this.browser) sessionStorage.removeItem(accessTokenKey);
  }
}
