import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AppRole } from '../../core/auth/auth.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

interface NavigationItem {
  label: string;
  path: string;
  section: string | null;
  badge?: string | number;
}

const navigationByRole: Record<AppRole, readonly NavigationItem[]> = {
  master_admin: [
    { label: 'Ringkasan', path: '/dashboard/admin', section: null },
    { label: 'Pengguna & role', path: '/dashboard/admin', section: 'pengguna' },
    { label: 'Konfigurasi', path: '/dashboard/admin', section: 'konfigurasi' },
    { label: 'Master data', path: '/dashboard/master-data', section: null },
    { label: 'Member', path: '/dashboard/members', section: null },
    { label: 'Buku & eksemplar', path: '/dashboard/inventory', section: null },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
    { label: 'Laporan', path: '/dashboard/reports', section: null },
    { label: 'Import data', path: '/dashboard/imports', section: null },
    { label: 'Sirkulasi', path: '/dashboard/circulation', section: null },
    { label: 'Audit', path: '/dashboard/admin', section: 'audit' },
  ],
  head_librarian: [
    { label: 'Monitoring', path: '/dashboard/monitoring', section: null },
    { label: 'Laporan', path: '/dashboard/reports', section: null },
    { label: 'Keterlambatan', path: '/dashboard/monitoring', section: 'keterlambatan' },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
  ],
  librarian: [
    { label: 'Operasional', path: '/dashboard/operasional', section: null },
    { label: 'Peminjaman & return', path: '/dashboard/circulation', section: null },
    { label: 'Member & buku', path: '/dashboard/operasional', section: 'data' },
    { label: 'Master data', path: '/dashboard/master-data', section: null },
    { label: 'Member', path: '/dashboard/members', section: null },
    { label: 'Buku & eksemplar', path: '/dashboard/inventory', section: null },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
    { label: 'Laporan', path: '/dashboard/reports', section: null },
    { label: 'Import data', path: '/dashboard/imports', section: null },
  ],
  member: [
    { label: 'Portal anggota', path: '/dashboard/member', section: 'portal-anggota' },
    { label: 'Reservasi', path: '/dashboard/member', section: 'reservasi' },
    { label: 'Denda dan pembayaran', path: '/dashboard/member', section: 'denda' },
    { label: 'Riwayat', path: '/dashboard/member', section: 'riwayat' },
    { label: 'Koleksi digital', path: '/koleksi-digital', section: null },
  ],
  guest: [
    { label: 'Portal tamu', path: '/dashboard/guest', section: null },
    { label: 'Katalog', path: '/katalog', section: null },
    { label: 'Koleksi digital', path: '/koleksi-digital', section: null },
  ],
};

@Component({
  selector: 'sdi-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBanner],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
})
export class DashboardLayout {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  @ViewChild('drawer') private drawer?: ElementRef<HTMLElement>;
  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  protected readonly isLoggingOut = signal(false);
  protected readonly navigationOpen = signal(false);
  protected readonly railCollapsed = signal(false);
  protected readonly navigation = computed(() => {
    const role = this.authStore.currentRole();
    return role ? navigationByRole[role] : [];
  });
  protected readonly initials = computed(() => {
    const name = this.authStore.displayName()?.trim();
    if (!name) return '';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  });

  protected roleLabel(): string {
    switch (this.authStore.currentRole()) {
      case 'master_admin':
        return 'Master Admin';
      case 'head_librarian':
        return 'Kepala Perpustakaan';
      case 'librarian':
        return 'Petugas Perpustakaan';
      case 'member':
        return 'Anggota';
      case 'guest':
        return 'Tamu';
      default:
        return '';
    }
  }

  protected openNavigation(): void {
    this.navigationOpen.set(true);
    queueMicrotask(() => this.drawerClose?.nativeElement.focus());
  }

  protected closeNavigation(returnFocus = false): void {
    this.navigationOpen.set(false);
    if (returnFocus) queueMicrotask(() => this.menuButton?.nativeElement.focus());
  }

  protected trapNavigationFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.navigationOpen()) return;
    const focusable = Array.from(
      this.drawer?.nativeElement.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ??
        [],
    ).filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected handleEscape(): void {
    if (this.navigationOpen()) this.closeNavigation(true);
  }

  protected toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
  }

  protected async logout(): Promise<void> {
    if (this.isLoggingOut()) return;
    this.isLoggingOut.set(true);
    try {
      await this.authService.logout();
    } finally {
      this.isLoggingOut.set(false);
      await this.router.navigate(['/']);
    }
  }
}
