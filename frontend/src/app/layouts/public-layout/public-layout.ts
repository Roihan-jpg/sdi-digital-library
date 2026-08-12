import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { roleHomePath } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'sdi-public-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgOptimizedImage,
    NotificationBanner,
    ThemeToggle,
  ],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(document:keydown.escape)': 'closeNavigation(true)',
  },
})
export class PublicLayout {
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  protected readonly dashboardPath = computed(() => {
    const role = this.authStore.currentRole();
    return role ? roleHomePath(role) : '/';
  });
  protected readonly navigationOpen = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly isGuest = computed(() => this.authStore.currentRole() === 'guest');
  protected readonly headerScrolled = signal(false);
  private readonly document = inject(DOCUMENT);

  protected onWindowScroll(): void {
    this.headerScrolled.set(window.scrollY > 20);
  }

  protected toggleNavigation(): void {
    const next = !this.navigationOpen();
    this.navigationOpen.set(next);
    this.document.body.style.overflow = next ? 'hidden' : '';
  }

  protected closeNavigation(returnFocus = false): void {
    const wasOpen = this.navigationOpen();
    this.navigationOpen.set(false);
    this.document.body.style.overflow = '';
    if (returnFocus && wasOpen) queueMicrotask(() => this.menuButton?.nativeElement.focus());
  }

  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.authService.logout();
    } finally {
      this.loggingOut.set(false);
      this.closeNavigation();
    }
  }
}
