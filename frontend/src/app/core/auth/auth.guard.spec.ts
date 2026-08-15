import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Router, provideRouter } from '@angular/router';
import type { AppRole } from './auth.models';
import { roleHomePath } from './auth.models';
import { authGuard, dashboardRedirectGuard, roleGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('auth and role guards', () => {
  const authenticated = signal(false);
  const currentRole = signal<AppRole | null>(null);

  beforeEach(() => {
    authenticated.set(false);
    currentRole.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: { isAuthenticated: authenticated, currentRole },
        },
      ],
    });
  });

  it('redirects anonymous users to login with their target URL', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard/member' } as RouterStateSnapshot),
    ) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/masuk?redirect=%2Fdashboard%2Fmember',
    );
  });

  it('allows an authenticated role on its permitted route', () => {
    authenticated.set(true);
    currentRole.set('librarian');
    const route = {
      data: { roles: ['master_admin', 'librarian'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, {} as RouterStateSnapshot));

    expect(result).toBe(true);
  });

  it('redirects a role that is not permitted', () => {
    authenticated.set(true);
    currentRole.set('member');
    const route = { data: { roles: ['master_admin'] } } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot),
    ) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/dashboard/forbidden');
  });

  it('routes every role to its own dashboard', () => {
    const expected: Record<AppRole, string> = {
      master_admin: '/dashboard/admin',
      head_librarian: '/dashboard/monitoring',
      librarian: '/dashboard/operasional',
      member: '/dashboard/member',
      guest: '/katalog',
    };

    for (const [role, path] of Object.entries(expected) as [AppRole, string][]) {
      currentRole.set(role);
      const result = TestBed.runInInjectionContext(() =>
        dashboardRedirectGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      ) as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(result)).toBe(path);
      expect(roleHomePath(role)).toBe(path);
    }
  });
});
