import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then(
        (module) => module.DashboardLayout,
      ),
    children: [
      {
        path: '',
        title: 'Dashboard · SDI Digital Library',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
            (module) => module.DashboardPage,
          ),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout').then((module) => module.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'SDI Digital Library',
        loadComponent: () =>
          import('./features/public/pages/home-page/home-page').then((module) => module.HomePage),
      },
      {
        path: 'katalog',
        title: 'Katalog · SDI Digital Library',
        loadComponent: () =>
          import('./features/catalog/pages/catalog-page/catalog-page').then(
            (module) => module.CatalogPage,
          ),
      },
      {
        path: 'masuk',
        title: 'Masuk · SDI Digital Library',
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page').then((module) => module.LoginPage),
      },
      {
        path: '**',
        title: 'Halaman tidak ditemukan · SDI Digital Library',
        loadComponent: () =>
          import('./features/public/pages/not-found-page/not-found-page').then(
            (module) => module.NotFoundPage,
          ),
      },
    ],
  },
];
