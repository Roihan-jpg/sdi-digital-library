import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { roleHomePath } from '../../core/auth/auth.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

@Component({
  selector: 'sdi-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgOptimizedImage, NotificationBanner],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(document:keydown.escape)': 'closeNavigation()',
  },
})
export class PublicLayout {
  protected readonly authStore = inject(AuthStore);
  protected readonly dashboardPath = computed(() => {
    const role = this.authStore.currentRole();
    return role ? roleHomePath(role) : '/';
  });
  protected readonly navigationOpen = signal(false);
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

  protected closeNavigation(): void {
    this.navigationOpen.set(false);
    this.document.body.style.overflow = '';
  }
}
