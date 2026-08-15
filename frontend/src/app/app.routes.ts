import type { Routes } from '@angular/router';
import {
  anonymousGuard,
  authGuard,
  dashboardRedirectGuard,
  roleGuard,
} from './core/auth/auth.guard';
import type { AppRole } from './core/auth/auth.models';

export const routes: Routes = [
  {
    path: 'ganti-kata-sandi',
    canActivate: [authGuard],
    title: 'Ganti kata sandi · SDI Digital Library',
    loadComponent: () =>
      import('./features/auth/pages/change-password-page/change-password-page').then(
        (module) => module.ChangePasswordPage,
      ),
  },
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
        pathMatch: 'full',
        canActivate: [dashboardRedirectGuard],
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
            (module) => module.DashboardPage,
          ),
      },
      dashboardRoute('admin', ['master_admin'], 'Dashboard Master Admin'),
      dashboardRoute('monitoring', ['head_librarian'], 'Monitoring Perpustakaan'),
      dashboardRoute('operasional', ['librarian'], 'Operasional Perpustakaan'),
      {
        path: 'activity',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian'] },
        loadComponent: () =>
          import('./features/circulation/pages/activity-page/activity-page').then(
            (module) => module.ActivityPage,
          ),
      },
      {
        path: 'circulation',
        canActivate: [roleGuard],
        data: { roles: ['librarian'] },
        loadComponent: () =>
          import('./features/circulation/pages/operations-page/operations-page').then(
            (module) => module.OperationsPage,
          ),
      },
      {
        path: 'members',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/members/pages/member-management-page/member-management-page').then(
            (module) => module.MemberManagementPage,
          ),
      },
      {
        path: 'imports',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/imports/pages/import-page/import-page').then(
            (module) => module.ImportPage,
          ),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/inventory/pages/inventory-page/inventory-page').then(
            (module) => module.InventoryPage,
          ),
      },
      {
        path: 'digital-library',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/digital-library/pages/digital-management-page/digital-management-page').then(
            (module) => module.DigitalManagementPage,
          ),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['master_admin', 'head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/reports/pages/reports-page/reports-page').then(
            (module) => module.ReportsPage,
          ),
      },
      {
        path: 'master-data',
        canActivate: [roleGuard],
        data: { roles: ['head_librarian', 'librarian'] },
        loadComponent: () =>
          import('./features/master-data/pages/master-data-page/master-data-page').then(
            (module) => module.MasterDataPage,
          ),
      },
      {
        path: 'member',
        canActivate: [roleGuard],
        data: { roles: ['member'] },
        loadComponent: () =>
          import('./features/circulation/pages/member-portal-page/member-portal-page').then(
            (module) => module.MemberPortalPage,
          ),
      },
      adminRoute('admin/users', () =>
        import('./features/administration/pages/user-management-page/user-management-page').then(
          (m) => m.UserManagementPage,
        ),
      ),
      adminRoute('admin/settings', () =>
        import('./features/administration/pages/library-settings-page/library-settings-page').then(
          (m) => m.LibrarySettingsPage,
        ),
      ),
      adminRoute('admin/audit', () =>
        import('./features/administration/pages/audit-log-page/audit-log-page').then(
          (m) => m.AuditLogPage,
        ),
      ),
      adminRoute('admin/system', () =>
        import('./features/administration/pages/system-status-page/system-status-page').then(
          (m) => m.SystemStatusPage,
        ),
      ),
      {
        path: 'forbidden',
        title: 'Akses ditolak · SDI Digital Library',
        loadComponent: () =>
          import('./features/auth/pages/forbidden-page/forbidden-page').then(
            (module) => module.ForbiddenPage,
          ),
      },
    ],
  },

  {
    path: 'masuk',
    canActivate: [anonymousGuard],
    title: 'Masuk · SDI Digital Library',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then((module) => module.LoginPage),
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
        path: 'koleksi-digital',
        title: 'Koleksi Digital · SDI Digital Library',
        loadComponent: () =>
          import('./features/digital-library/pages/digital-catalog-page/digital-catalog-page').then(
            (module) => module.DigitalCatalogPage,
          ),
      },
      {
        path: 'koleksi-digital/:slug',
        title: 'Detail Koleksi Digital · SDI Digital Library',
        loadComponent: () =>
          import('./features/digital-library/pages/digital-detail-page/digital-detail-page').then(
            (module) => module.DigitalDetailPage,
          ),
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

function dashboardRoute(path: string, roles: readonly AppRole[], heading: string): Routes[number] {
  return {
    path,
    canActivate: [roleGuard],
    data: { roles, heading },
    title: `${heading} · SDI Digital Library`,
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
        (module) => module.DashboardPage,
      ),
  };
}

function adminRoute(path: string, loadComponent: () => Promise<unknown>): Routes[number] {
  return {
    path,
    canActivate: [roleGuard],
    data: { roles: ['master_admin'] },
    loadComponent,
  } as Routes[number];
}
