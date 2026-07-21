import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { AppRole } from '../../core/auth/auth.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

interface NavigationItem {
  label: string;
  path: string;
  section: string | null;
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
    { label: 'Import data', path: '/dashboard/imports', section: null },
    { label: 'Sirkulasi', path: '/dashboard/circulation', section: null },
    { label: 'Audit', path: '/dashboard/admin', section: 'audit' },
  ],
  head_librarian: [
    { label: 'Monitoring', path: '/dashboard/monitoring', section: null },
    { label: 'Laporan', path: '/dashboard/monitoring', section: 'laporan' },
    { label: 'Keterlambatan', path: '/dashboard/monitoring', section: 'keterlambatan' },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
  ],
  librarian: [
    { label: 'Operasional', path: '/dashboard/operasional', section: null },
    { label: 'Peminjaman & return', path: '/dashboard/circulation', section: null },
    { label: 'Reservasi & denda', path: '/dashboard/circulation', section: null },
    { label: 'Member & buku', path: '/dashboard/operasional', section: 'data' },
    { label: 'Master data', path: '/dashboard/master-data', section: null },
    { label: 'Member', path: '/dashboard/members', section: null },
    { label: 'Buku & eksemplar', path: '/dashboard/inventory', section: null },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
    { label: 'Import data', path: '/dashboard/imports', section: null },
  ],
  member: [
    { label: 'Portal anggota', path: '/dashboard/member', section: null },
    { label: 'Reservasi', path: '/dashboard/member', section: 'reservasi' },
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
  template: `
    <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
    <div class="shell">
      <aside>
        <a class="brand" routerLink="/dashboard">SDI Digital Library</a>
        <div class="identity">
          <strong>{{ authStore.displayName() }}</strong>
          <small>{{ roleLabel() }}</small>
        </div>
        <nav aria-label="Navigasi dashboard">
          @for (item of navigation(); track item.label) {
            <a
              [routerLink]="item.path"
              [queryParams]="item.section ? { bagian: item.section } : null"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              >{{ item.label }}</a
            >
          }
        </nav>
        <button type="button" [disabled]="isLoggingOut()" (click)="logout()">
          {{ isLoggingOut() ? 'Mengakhiri sesi…' : 'Keluar' }}
        </button>
      </aside>
      <section class="content">
        <sdi-notification-banner />
        <main id="main-content" tabindex="-1"><router-outlet /></main>
      </section>
    </div>
  `,
  styles: `
    .skip-link {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 10;
      padding: 0.7rem 1rem;
      background: #fff;
      transform: translateY(-150%);
    }
    .skip-link:focus {
      transform: translateY(0);
    }
    .shell {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 17rem 1fr;
    }
    aside {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      background: #0e3b28;
      color: #fff;
    }
    .brand {
      font-weight: 800;
      text-decoration: none;
    }
    .identity {
      display: grid;
      gap: 0.2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgb(255 255 255 / 25%);
    }
    .identity small {
      color: #c8dbcf;
    }
    nav {
      display: grid;
      gap: 0.35rem;
    }
    nav a,
    button {
      padding: 0.75rem;
      border: 0;
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    nav a:hover,
    nav a.active,
    button:hover {
      background: #19543a;
    }
    button {
      margin-top: auto;
    }
    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .content {
      min-width: 0;
    }
    @media (max-width: 48rem) {
      .shell {
        grid-template-columns: 1fr;
      }
      aside {
        position: static;
      }
    }
  `,
})
export class DashboardLayout {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly isLoggingOut = signal(false);
  protected readonly navigation = computed(() => {
    const role = this.authStore.currentRole();
    return role ? navigationByRole[role] : [];
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
