import type { AppRole } from './auth.models';
import { roleHomePath } from './auth.models';

export { roleHomePath };

export type AppCapability =
  | 'administration.manage'
  | 'monitoring.read'
  | 'operations.read'
  | 'operations.write'
  | 'reports.all'
  | 'reports.operational'
  | 'member.self';

export type DashboardIconName =
  | 'activity'
  | 'audit'
  | 'books'
  | 'catalog'
  | 'dashboard'
  | 'database'
  | 'digital'
  | 'fine'
  | 'history'
  | 'import'
  | 'loan'
  | 'members'
  | 'reports'
  | 'reservation'
  | 'scan'
  | 'settings'
  | 'system'
  | 'users';

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon: DashboardIconName;
  readonly section?: string;
  readonly badge?: string | number;
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

const capabilitiesByRole: Record<AppRole, readonly AppCapability[]> = {
  master_admin: ['administration.manage', 'monitoring.read', 'reports.all'],
  head_librarian: ['monitoring.read', 'operations.read', 'reports.all'],
  librarian: ['monitoring.read', 'operations.read', 'operations.write', 'reports.operational'],
  member: ['member.self'],
  guest: [],
};

const navigationByRole: Record<AppRole, readonly NavigationGroup[]> = {
  master_admin: [
    {
      label: 'Ringkasan',
      items: [{ label: 'Monitoring', path: '/dashboard/admin', icon: 'dashboard' }],
    },
    {
      label: 'Administrasi',
      items: [
        { label: 'Pengguna & role', path: '/dashboard/admin/users', icon: 'users' },
        { label: 'Konfigurasi', path: '/dashboard/admin/settings', icon: 'settings' },
        { label: 'Audit', path: '/dashboard/admin/audit', icon: 'audit' },
      ],
    },
    {
      label: 'Sistem',
      items: [{ label: 'Status sistem', path: '/dashboard/admin/system', icon: 'system' }],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan', path: '/dashboard/reports', icon: 'reports' }],
    },
  ],
  head_librarian: [
    {
      label: 'Ringkasan',
      items: [{ label: 'Monitoring', path: '/dashboard/monitoring', icon: 'dashboard' }],
    },
    {
      label: 'Data operasional · baca saja',
      items: [
        { label: 'Aktivitas layanan', path: '/dashboard/activity', icon: 'activity' },
        { label: 'Member', path: '/dashboard/members', icon: 'members' },
        { label: 'Master data', path: '/dashboard/master-data', icon: 'database' },
        { label: 'Buku & eksemplar', path: '/dashboard/inventory', icon: 'books' },
        { label: 'Koleksi digital', path: '/dashboard/digital-library', icon: 'digital' },
        { label: 'Riwayat import', path: '/dashboard/imports', icon: 'import' },
      ],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan', path: '/dashboard/reports', icon: 'reports' }],
    },
  ],
  librarian: [
    {
      label: 'Ringkasan',
      items: [{ label: 'Operasional', path: '/dashboard/operasional', icon: 'dashboard' }],
    },
    {
      label: 'Layanan',
      items: [{ label: 'Sirkulasi', path: '/dashboard/circulation', icon: 'scan' }],
    },
    {
      label: 'Data & koleksi',
      items: [
        { label: 'Member', path: '/dashboard/members', icon: 'members' },
        { label: 'Master data', path: '/dashboard/master-data', icon: 'database' },
        { label: 'Buku & eksemplar', path: '/dashboard/inventory', icon: 'books' },
        { label: 'Koleksi digital', path: '/dashboard/digital-library', icon: 'digital' },
        { label: 'Import data', path: '/dashboard/imports', icon: 'import' },
      ],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan operasional', path: '/dashboard/reports', icon: 'reports' }],
    },
  ],
  member: [
    {
      label: 'Koleksi',
      items: [
        { label: 'Katalog buku', path: '/katalog', icon: 'catalog' },
        { label: 'Koleksi digital', path: '/koleksi-digital', icon: 'digital' },
      ],
    },
    {
      label: 'Layanan saya',
      items: [
        {
          label: 'Pinjaman',
          path: '/dashboard/member',
          section: 'portal-anggota',
          icon: 'loan',
        },
        {
          label: 'Reservasi',
          path: '/dashboard/member',
          section: 'reservasi',
          icon: 'reservation',
        },
        { label: 'Denda', path: '/dashboard/member', section: 'denda', icon: 'fine' },
        { label: 'Riwayat', path: '/dashboard/member', section: 'riwayat', icon: 'history' },
      ],
    },
  ],
  guest: [],
};

export function roleCan(role: AppRole, capability: AppCapability): boolean {
  return capabilitiesByRole[role].includes(capability);
}

export function navigationGroupsForRole(role: AppRole): readonly NavigationGroup[] {
  return navigationByRole[role];
}
