import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { navigationGroupsForRole } from '../../core/auth/access-policy';
import { AuthStore } from '../../core/auth/auth.store';
import { AppThemeService } from '../../core/theme/app-theme.service';
import { DashboardIcon } from '../../shared/components/dashboard-icon/dashboard-icon';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'sdi-dashboard-layout',
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    DashboardIcon,
    NotificationBanner,
    ThemeToggle,
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
  host: {
    '(document:keydown.escape)': 'handleEscape()',
    '(document:click)': 'handleDocumentClick($event)',
    '[class.dashboard-theme--dark]': 'theme.isDark()',
    '[class.dashboard-theme--light]': '!theme.isDark()',
  },
})
export class DashboardLayout {
  protected readonly authStore = inject(AuthStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(AppThemeService);
  @ViewChild('drawer') private drawer?: ElementRef<HTMLElement>;
  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('profilePanel') private profilePanel?: ElementRef<HTMLElement>;
  @ViewChild('profileTrigger') private profileTrigger?: ElementRef<HTMLButtonElement>;
  protected readonly isLoggingOut = signal(false);
  protected readonly navigationOpen = signal(false);
  protected readonly railCollapsed = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly navigationGroups = computed(() => {
    const role = this.authStore.currentRole();
    return role ? navigationGroupsForRole(role) : [];
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

  protected handleNavigation(section?: string): void {
    this.closeNavigation();
    if (!section) return;

    setTimeout(() => {
      const target = this.host.nativeElement.querySelector<HTMLElement>(`#${section}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    if (this.profileOpen()) {
      this.closeProfile(true);
      return;
    }
    if (this.navigationOpen()) this.closeNavigation(true);
  }

  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (
      this.profileOpen() &&
      target instanceof Node &&
      !this.profilePanel?.nativeElement.contains(target)
    ) {
      this.closeProfile();
    }
  }

  protected toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  protected closeProfile(returnFocus = false): void {
    this.profileOpen.set(false);
    if (returnFocus) queueMicrotask(() => this.profileTrigger?.nativeElement.focus());
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
