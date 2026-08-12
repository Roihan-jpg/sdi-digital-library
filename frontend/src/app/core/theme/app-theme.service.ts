import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const storageKey = 'sdi-theme';
const legacyStorageKey = 'sdi-dashboard-theme';

@Injectable({ providedIn: 'root' })
export class AppThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<AppTheme>(this.initialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    this.persist(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private initialTheme(): AppTheme {
    if (!this.isBrowser) return 'light';

    try {
      const stored = globalThis.localStorage.getItem(storageKey);
      if (isAppTheme(stored)) return stored;

      const legacyTheme = globalThis.localStorage.getItem(legacyStorageKey);
      if (isAppTheme(legacyTheme)) {
        this.persist(legacyTheme);
        return legacyTheme;
      }
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }

    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private persist(theme: AppTheme): void {
    if (!this.isBrowser) return;
    try {
      globalThis.localStorage.setItem(storageKey, theme);
    } catch {
      // The in-memory preference remains usable when persistence is unavailable.
    }
  }
}

function isAppTheme(value: string | null): value is AppTheme {
  return value === 'light' || value === 'dark';
}
