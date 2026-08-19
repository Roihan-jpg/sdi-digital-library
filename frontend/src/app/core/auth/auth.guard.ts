import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import type { AppRole } from './auth.models';
import { roleHomePath } from './auth.models';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  return afterAuthInitialization(authStore, authService, () =>
    authStore.isAuthenticated()
      ? true
      : router.createUrlTree(['/masuk'], { queryParams: { redirect: state.url } }),
  );
};

export const anonymousGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  return afterAuthInitialization(authStore, authService, () => {
    const role = authStore.currentRole();
    return role ? router.parseUrl(roleHomePath(role)) : true;
  });
};

export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  return afterAuthInitialization(authStore, authService, () => {
    const allowedRoles = route.data['roles'] as readonly AppRole[] | undefined;
    const role = authStore.currentRole();

    if (role && allowedRoles?.includes(role)) return true;
    return router.parseUrl('/dashboard/forbidden');
  });
};

export const dashboardRedirectGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  return afterAuthInitialization(authStore, authService, () => {
    const role = authStore.currentRole();
    return role ? router.parseUrl(roleHomePath(role)) : router.parseUrl('/masuk');
  });
};

function afterAuthInitialization(
  authStore: AuthStore,
  authService: AuthService,
  resolve: () => boolean | UrlTree,
): boolean | UrlTree | Promise<boolean | UrlTree> {
  return authStore.status() === 'initializing' ? authService.initialize().then(resolve) : resolve();
}
