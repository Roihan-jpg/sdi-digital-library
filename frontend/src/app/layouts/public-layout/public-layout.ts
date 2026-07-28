import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { roleHomePath } from '../../core/auth/auth.models';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationBanner } from '../../shared/components/notification-banner/notification-banner';

@Component({
  selector: 'sdi-public-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBanner],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {
  protected readonly authStore = inject(AuthStore);
  protected readonly roleHomePath = roleHomePath;

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  @ViewChild('searchInput') private readonly searchInputRef?: ElementRef<HTMLInputElement>;

  // Mobile off-canvas drawer
  protected readonly navigationOpen = signal(false);
  // Katalog mega menu
  protected readonly catalogOpen = signal(false);
  // Expandable search overlay
  protected readonly searchOpen = signal(false);
  // Sticky header scroll state
  protected readonly headerScrolled = signal(false);
  protected readonly scrollProgress = signal(0);
  protected readonly backToTopVisible = signal(false);
  // Light/dark toggle (visual only)
  protected readonly isDarkTheme = signal(false);
  // Newsletter form
  protected readonly newsletterSubmitted = signal(false);
  // Nav indicator
  protected readonly indicatorReady = signal(true);
  protected readonly indicatorPosition = signal<{ width: string; transform: string } | null>(null);

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    const scrollTop = window.scrollY || this.document.documentElement.scrollTop;
    const docHeight = this.document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress.set(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    this.headerScrolled.set(scrollTop > 24);
    this.backToTopVisible.set(scrollTop > 480);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeCatalog();
    this.closeSearch();
    this.closeNavigation();
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    // Clicks inside the mega menu / search overlay call stopPropagation()
    // in the template, so this only fires for genuine outside clicks.
    this.closeCatalog();
    this.closeSearch();
  }

  protected stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  protected toggleNavigation(): void {
    const open = !this.navigationOpen();
    this.navigationOpen.set(open);
    this.document.body.style.overflow = open ? 'hidden' : '';
  }

  protected closeNavigation(): void {
    this.navigationOpen.set(false);
    this.document.body.style.overflow = '';
  }

  protected toggleCatalog(event: Event): void {
    event.stopPropagation();
    this.searchOpen.set(false);
    this.catalogOpen.update((open) => !open);
  }

  protected closeCatalog(): void {
    this.catalogOpen.set(false);
  }

  protected toggleSearch(event: Event): void {
    event.stopPropagation();
    this.catalogOpen.set(false);
    const open = !this.searchOpen();
    this.searchOpen.set(open);
    if (open) {
      setTimeout(() => this.searchInputRef?.nativeElement.focus(), 260);
    }
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected moveIndicatorTo(element: EventTarget | null): void {
    const el = element as HTMLElement | null;
    if (!el) return;
    this.indicatorPosition.set({
      width: `${el.offsetWidth}px`,
      transform: `translateX(${el.offsetLeft}px)`,
    });
  }

  protected resetIndicatorToActive(): void {
    const active = this.document.querySelector('.nav-link.active');
    if (active) this.moveIndicatorTo(active);
  }

  protected submitSearch(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const term = input.value.trim();
    this.closeSearch();
    this.router.navigate(['/katalog'], term ? { queryParams: { q: term } } : {});
  }

  protected toggleTheme(): void {
    const dark = !this.isDarkTheme();
    this.isDarkTheme.set(dark);
    this.document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  protected submitNewsletter(event: Event, emailInput: HTMLInputElement): void {
    event.preventDefault();
    if (!emailInput.value) {
      return;
    }
    this.newsletterSubmitted.set(true);
    emailInput.value = '';
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
