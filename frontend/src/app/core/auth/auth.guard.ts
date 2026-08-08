import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import type { AppRole } from './auth.models';
import { roleHomePath } from './auth.models';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/masuk'], { queryParams: { redirect: state.url } });
  }
  if (authStore.context()?.profile.mustChangePassword && state.url !== '/ganti-kata-sandi') {
    return router.parseUrl('/ganti-kata-sandi');
  }
  return true;
};

export const anonymousGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const role = authStore.currentRole();
  return role ? router.parseUrl(roleHomePath(role)) : true;
};

export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as readonly AppRole[] | undefined;
  const role = authStore.currentRole();

  if (role && allowedRoles?.includes(role)) return true;
  return router.parseUrl('/dashboard/forbidden');
};

export const dashboardRedirectGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const role = authStore.currentRole();
  return role ? router.parseUrl(roleHomePath(role)) : router.parseUrl('/masuk');
};
