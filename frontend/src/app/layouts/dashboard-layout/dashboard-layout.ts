import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
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
    { label: 'Reservasi & denda', path: '/dashboard/circulation', section: null },
    { label: 'Member & buku', path: '/dashboard/operasional', section: 'data' },
    { label: 'Master data', path: '/dashboard/master-data', section: null },
    { label: 'Member', path: '/dashboard/members', section: null },
    { label: 'Buku & eksemplar', path: '/dashboard/inventory', section: null },
    { label: 'Koleksi digital', path: '/dashboard/digital-library', section: null },
    { label: 'Laporan', path: '/dashboard/reports', section: null },
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
      <header class="mobile-header">
        <a class="app-brand mobile-brand" routerLink="/dashboard" (click)="closeNavigation()">
          <img class="app-brand__mark" src="/sdi_logo.png" alt="" aria-hidden="true" />
          <span>SDI <small>Digital Library</small></span>
        </a>
        <button
          #menuButton
          class="menu-button"
          type="button"
          aria-controls="dashboard-navigation"
          [attr.aria-expanded]="navigationOpen()"
          (click)="openNavigation()"
        >
          <span class="menu-icon" aria-hidden="true"></span>
          Menu
        </button>
      </header>
      <button
        class="backdrop"
        type="button"
        tabindex="-1"
        aria-label="Tutup navigasi dashboard"
        [class.backdrop--visible]="navigationOpen()"
        (click)="closeNavigation(true)"
      ></button>
      <aside
        #drawer
        id="dashboard-navigation"
        aria-label="Panel navigasi dashboard"
        [class.drawer--open]="navigationOpen()"
        (keydown)="trapNavigationFocus($event)"
      >
        <div class="aside-heading">
          <a class="app-brand" routerLink="/dashboard" (click)="closeNavigation()">
            <img class="app-brand__mark" src="/sdi_logo.png" alt="" aria-hidden="true" />
            <span>SDI <small>Digital Library</small></span>
          </a>
          <button
            #drawerClose
            class="drawer-close"
            type="button"
            aria-label="Tutup navigasi dashboard"
            (click)="closeNavigation(true)"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
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
              (click)="closeNavigation()"
              >{{ item.label }}</a
            >
          }
        </nav>
        <button class="logout" type="button" [disabled]="isLoggingOut()" (click)="logout()">
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
    :host {
      display: block;
      min-height: 100dvh;
    }
    .shell {
      min-height: 100dvh;
      background: var(--color-canvas);
    }
    .mobile-header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: var(--header-height);
      padding: var(--space-2) var(--page-gutter);
      border-bottom: var(--border-width) solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    .mobile-brand {
      color: var(--color-brand-950);
      font-family: var(--font-family-display);
      font-weight: var(--weight-bold);
      text-decoration: none;
    }

    .mobile-brand small {
      color: var(--color-brand-700);
    }
    .menu-button,
    .drawer-close,
    .logout {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-width: var(--control-height);
      min-height: var(--control-height);
      padding: var(--space-2) var(--space-3);
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-md);
      font: inherit;
      font-weight: var(--weight-bold);
      cursor: pointer;
    }
    .menu-button {
      border-color: var(--color-border-strong);
      background: var(--color-surface);
      color: var(--color-brand-950);
    }
    .menu-button:hover {
      background: var(--color-brand-50);
    }
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-backdrop);
      padding: 0;
      border: 0;
      background: var(--color-overlay);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--duration-normal) var(--ease-standard);
    }
    .backdrop--visible {
      opacity: 1;
      pointer-events: auto;
    }
    aside {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: var(--z-modal);
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      width: min(var(--sidebar-width), calc(100vw - var(--space-8)));
      max-height: 100dvh;
      padding: var(--space-6);
      overflow-y: auto;
      background: var(--color-brand-950);
      color: var(--color-text-inverse);
      box-shadow: var(--shadow-lg);
      transform: translateX(-105%);
      visibility: hidden;
      pointer-events: none;
      transition: transform var(--duration-normal) var(--ease-standard);
    }
    aside.drawer--open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
    }
    .aside-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .drawer-close {
      flex: 0 0 auto;
      padding: 0;
      background: transparent;
      color: var(--color-text-inverse);
      font-size: var(--text-2xl);
    }
    .drawer-close:hover {
      background: var(--color-brand-800);
    }
    .identity {
      display: grid;
      gap: var(--space-1);
      padding-bottom: var(--space-4);
      border-bottom: var(--border-width) solid var(--color-brand-divider);
    }
    .identity small {
      color: var(--color-brand-100);
    }
    nav {
      display: grid;
      gap: var(--space-1);
    }
    nav a {
      display: flex;
      align-items: center;
      min-height: var(--control-height);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-text-inverse);
      font-weight: var(--weight-semibold);
      text-decoration: none;
    }
    nav a:hover,
    nav a.active {
      background: var(--color-brand-800);
    }
    nav a.active {
      box-shadow: inset var(--border-width-accent) 0 0 var(--color-brand-100);
    }
    .logout {
      justify-content: flex-start;
      margin-top: auto;
      background: transparent;
      color: var(--color-text-inverse);
      text-align: left;
    }
    .logout:hover {
      background: var(--color-brand-800);
    }
    .logout:disabled {
      opacity: 0.5;
      cursor: wait;
    }
    .content {
      min-width: 0;
    }
    @media (min-width: 64rem) {
      .shell {
        display: grid;
        grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
      }
      .mobile-header,
      .backdrop {
        display: none;
      }
      aside {
        position: sticky;
        top: 0;
        width: var(--sidebar-width);
        height: 100dvh;
        box-shadow: none;
        transform: none;
        visibility: visible;
        pointer-events: auto;
      }
      .drawer-close {
        display: none;
      }
    }
  `,
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

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.navigationOpen()) this.closeNavigation(true);
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
