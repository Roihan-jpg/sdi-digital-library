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

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
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
      items: [{ label: 'Monitoring', path: '/dashboard/admin' }],
    },
    {
      label: 'Administrasi',
      items: [
        { label: 'Pengguna & role', path: '/dashboard/admin/users' },
        { label: 'Konfigurasi', path: '/dashboard/admin/settings' },
        { label: 'Audit', path: '/dashboard/admin/audit' },
      ],
    },
    {
      label: 'Sistem',
      items: [{ label: 'Status sistem', path: '/dashboard/admin/system' }],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan', path: '/dashboard/reports' }],
    },
  ],
  head_librarian: [
    {
      label: 'Ringkasan',
      items: [{ label: 'Monitoring', path: '/dashboard/monitoring' }],
    },
    {
      label: 'Data operasional · baca saja',
      items: [
        { label: 'Aktivitas layanan', path: '/dashboard/activity' },
        { label: 'Member', path: '/dashboard/members' },
        { label: 'Master data', path: '/dashboard/master-data' },
        { label: 'Buku & eksemplar', path: '/dashboard/inventory' },
        { label: 'Koleksi digital', path: '/dashboard/digital-library' },
        { label: 'Riwayat import', path: '/dashboard/imports' },
      ],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan', path: '/dashboard/reports' }],
    },
  ],
  librarian: [
    {
      label: 'Ringkasan',
      items: [{ label: 'Operasional', path: '/dashboard/operasional' }],
    },
    {
      label: 'Layanan',
      items: [{ label: 'Sirkulasi', path: '/dashboard/circulation' }],
    },
    {
      label: 'Data & koleksi',
      items: [
        { label: 'Member', path: '/dashboard/members' },
        { label: 'Master data', path: '/dashboard/master-data' },
        { label: 'Buku & eksemplar', path: '/dashboard/inventory' },
        { label: 'Koleksi digital', path: '/dashboard/digital-library' },
        { label: 'Import data', path: '/dashboard/imports' },
      ],
    },
    {
      label: 'Pengawasan',
      items: [{ label: 'Laporan operasional', path: '/dashboard/reports' }],
    },
  ],
  member: [
    {
      label: 'Koleksi',
      items: [
        { label: 'Katalog buku', path: '/katalog' },
        { label: 'Koleksi digital', path: '/koleksi-digital' },
      ],
    },
    {
      label: 'Layanan saya',
      items: [
        { label: 'Pinjaman', path: '/dashboard/member', section: 'portal-anggota' },
        { label: 'Reservasi', path: '/dashboard/member', section: 'reservasi' },
        { label: 'Denda', path: '/dashboard/member', section: 'denda' },
        { label: 'Riwayat', path: '/dashboard/member', section: 'riwayat' },
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
