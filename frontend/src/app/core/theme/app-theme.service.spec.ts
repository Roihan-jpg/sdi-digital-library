import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppThemeService } from './app-theme.service';

describe('AppThemeService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('uses and persists the unified theme preference', () => {
    localStorage.setItem('sdi-theme', 'dark');
    const service = TestBed.inject(AppThemeService);

    expect(service.theme()).toBe('dark');

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('sdi-theme')).toBe('light');
  });

  it('migrates the previous dashboard preference', () => {
    localStorage.setItem('sdi-dashboard-theme', 'dark');

    const service = TestBed.inject(AppThemeService);

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('sdi-theme')).toBe('dark');
  });

  it('falls back to the operating-system preference on first use', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })) as unknown as typeof globalThis.matchMedia,
    );

    expect(TestBed.inject(AppThemeService).theme()).toBe('dark');
  });

  it('uses a safe light default without accessing storage during SSR', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const service = TestBed.inject(AppThemeService);
    service.toggleTheme();

    expect(service.theme()).toBe('dark');
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
